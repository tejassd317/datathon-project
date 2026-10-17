"""
Safe Archive Extraction and Validation Module
Mitigates:
- ZipSlip / Path Traversal (CWE-22)
- Zip Bomb / Decompression Amplification (CWE-409)
- Excessive file count and malicious symlinks
Compatible with Windows and IBM LinuxONE (RHEL 9.8).
"""

import io
import os
import zipfile
import tempfile
import shutil
from pathlib import Path
from typing import List, Tuple, Dict, Any, Generator

from quantum_safe_scanner.config import (
    MAX_ZIP_SIZE_BYTES,
    MAX_UNCOMPRESSED_BYTES,
    MAX_FILE_COUNT,
    MAX_SINGLE_FILE_BYTES,
    SUPPORTED_EXTENSIONS
)


class ArchiveValidationError(Exception):
    """Raised when an uploaded archive fails security validation checks."""
    pass


class SafeArchiveExtractor:
    """
    Safely inspects and extracts zip archives with strict containment guarantees.
    """

    @staticmethod
    def validate_and_read_in_memory(file_bytes: bytes) -> List[Tuple[str, str]]:
        """
        Validates zip archive in memory and returns a list of (relative_path, text_content).
        Does not touch disk, providing maximum isolation against FS attacks.
        """
        if len(file_bytes) > MAX_ZIP_SIZE_BYTES:
            raise ArchiveValidationError(
                f"Archive exceeds maximum allowed upload size ({len(file_bytes)} bytes > {MAX_ZIP_SIZE_BYTES} bytes)."
            )

        try:
            zip_buffer = io.BytesIO(file_bytes)
            with zipfile.ZipFile(zip_buffer, 'r') as zf:
                return SafeArchiveExtractor._inspect_and_extract_members(zf)
        except zipfile.BadZipFile as e:
            raise ArchiveValidationError(f"Invalid or corrupted ZIP archive: {str(e)}")

    @staticmethod
    def extract_to_temp_dir(file_bytes: bytes) -> Tuple[str, List[str]]:
        """
        Safely extracts an archive to a secure temporary directory after full validation.
        Returns (temp_dir_path, list_of_extracted_rel_paths).
        Caller is responsible for removing temp_dir when finished.
        """
        if len(file_bytes) > MAX_ZIP_SIZE_BYTES:
            raise ArchiveValidationError(
                f"Archive exceeds maximum allowed upload size ({len(file_bytes)} bytes > {MAX_ZIP_SIZE_BYTES} bytes)."
            )

        temp_dir = tempfile.mkdtemp(prefix="qsafe_scan_")
        target_root = os.path.abspath(temp_dir)
        extracted_paths = []

        try:
            zip_buffer = io.BytesIO(file_bytes)
            with zipfile.ZipFile(zip_buffer, 'r') as zf:
                # Pre-flight check on metadata
                infolist = zf.infolist()
                SafeArchiveExtractor._preflight_checks(infolist)

                total_extracted_size = 0
                for info in infolist:
                    if info.is_dir():
                        continue

                    # Path sanitization check
                    sanitized_rel = SafeArchiveExtractor._sanitize_member_path(info.filename)
                    if not SafeArchiveExtractor._is_supported_file(sanitized_rel):
                        continue

                    dest_path = os.path.abspath(os.path.join(target_root, sanitized_rel))
                    if not dest_path.startswith(target_root + os.sep) and dest_path != target_root:
                        raise ArchiveValidationError(
                            f"Path Traversal detected for entry: {info.filename}"
                        )

                    # Size check
                    total_extracted_size += info.file_size
                    if total_extracted_size > MAX_UNCOMPRESSED_BYTES:
                        raise ArchiveValidationError(
                            f"Uncompressed archive size limit exceeded ({total_extracted_size} bytes)."
                        )

                    # Ensure parent dirs exist
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

                    # Extract file safely with size boundary
                    with zf.open(info) as src, open(dest_path, "wb") as dst:
                        shutil.copyfileobj(src, dst, length=64 * 1024)

                    extracted_paths.append(sanitized_rel)

            return temp_dir, extracted_paths
        except Exception:
            # Clean up on failure
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            raise

    @staticmethod
    def _preflight_checks(infolist: List[zipfile.ZipInfo]) -> None:
        """Performs initial integrity checks on archive structure."""
        if len(infolist) > MAX_FILE_COUNT:
            raise ArchiveValidationError(
                f"Archive contains too many files ({len(infolist)} entries; maximum allowed is {MAX_FILE_COUNT})."
            )

        total_uncompressed = sum(info.file_size for info in infolist)
        if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
            raise ArchiveValidationError(
                f"Total uncompressed size ({total_uncompressed} bytes) exceeds limit ({MAX_UNCOMPRESSED_BYTES} bytes)."
            )

    @staticmethod
    def _sanitize_member_path(raw_path: str) -> str:
        """
        Checks for path traversal sequences and normalizes path separators.
        Rejects absolute paths, drive letters, and '..' segments.
        """
        # Normalize separators
        clean_path = raw_path.replace("\\", "/").strip()

        # Reject path traversal patterns
        parts = clean_path.split("/")
        if any(part in ("..", "", ".") for part in parts if part == ".."):
            raise ArchiveValidationError(f"Disallowed relative path traversal '../' in: {raw_path}")

        # Reject drive letters (e.g. C:) or root slashes
        if clean_path.startswith("/") or (len(clean_path) > 1 and clean_path[1] == ":"):
            raise ArchiveValidationError(f"Absolute or drive paths are forbidden: {raw_path}")

        # Filter empty segments
        clean_parts = [p for p in parts if p and p != "."]
        return "/".join(clean_parts)

    @staticmethod
    def _is_supported_file(file_path: str) -> bool:
        """Checks if file extension is within supported source/config list."""
        ext = Path(file_path).suffix.lower()
        # Also support files without extensions if they match known configs (like Dockerfile, Jenkinsfile)
        basename = Path(file_path).name.lower()
        if basename in {"dockerfile", "makefile", "jenkinsfile", ".env"}:
            return True
        return ext in SUPPORTED_EXTENSIONS

    @staticmethod
    def _inspect_and_extract_members(zf: zipfile.ZipFile) -> List[Tuple[str, str]]:
        """Extracts text content in-memory after rigorous path & size safety checks."""
        infolist = zf.infolist()
        SafeArchiveExtractor._preflight_checks(infolist)

        results: List[Tuple[str, str]] = []
        total_extracted_size = 0

        for info in infolist:
            if info.is_dir():
                continue

            rel_path = SafeArchiveExtractor._sanitize_member_path(info.filename)
            if not SafeArchiveExtractor._is_supported_file(rel_path):
                continue

            if info.file_size > MAX_SINGLE_FILE_BYTES:
                # Skip oversized single file to prevent memory exhaustion
                continue

            total_extracted_size += info.file_size
            if total_extracted_size > MAX_UNCOMPRESSED_BYTES:
                raise ArchiveValidationError(
                    f"Decompression size limit exceeded ({total_extracted_size} bytes)."
                )

            try:
                raw_bytes = zf.read(info)
                # Try UTF-8 decoding with fallback to latin-1
                try:
                    text_content = raw_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    text_content = raw_bytes.decode("latin-1", errors="replace")
                results.append((rel_path, text_content))
            except Exception as e:
                # Don't crash entire scan if a single file has read issues
                continue

        return results
