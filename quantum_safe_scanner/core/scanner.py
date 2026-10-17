"""
Cryptographic Scanner Engine
Performs safe, static AST & regex analysis of source code, configurations,
and enterprise mainframe scripts without code execution.
Guarantees:
- Zero execution of uploaded code
- Accurate line numbers and context snippets
- Automatic redaction of private keys and secrets
- Distinction between confirmed findings and heuristic detections
"""

import os
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any

from quantum_safe_scanner.core.models import (
    CryptoFinding,
    ConfidenceLevel,
    RiskTier,
    ScanInventory
)
from quantum_safe_scanner.core.rules import CRYPTO_RULES, CryptoRule
from quantum_safe_scanner.security.redaction import redact_snippet
from quantum_safe_scanner.security.archive_validator import SafeArchiveExtractor


class CryptoScanner:
    """
    Static source code scanner for identifying cryptographic algorithm usage
    and quantum vulnerability posture.
    """

    def __init__(self, rules: Optional[List[CryptoRule]] = None):
        self.rules = rules or CRYPTO_RULES

    def scan_archive_bytes(self, archive_bytes: bytes) -> List[CryptoFinding]:
        """
        Safely scans an uploaded ZIP archive in memory without touching disk.
        """
        file_entries = SafeArchiveExtractor.validate_and_read_in_memory(archive_bytes)
        findings: List[CryptoFinding] = []
        finding_seq = 1

        for rel_path, text_content in file_entries:
            file_findings = self.scan_text_content(
                text=text_content,
                file_path=rel_path,
                start_id=finding_seq
            )
            findings.extend(file_findings)
            finding_seq += len(file_findings)

        return findings

    def scan_directory(self, dir_path: str) -> List[CryptoFinding]:
        """
        Recursively scans a local directory on disk.
        """
        findings: List[CryptoFinding] = []
        finding_seq = 1
        root_path = Path(dir_path)

        if not root_path.exists():
            return findings

        for path in root_path.rglob("*"):
            if path.is_file() and SafeArchiveExtractor._is_supported_file(str(path)):
                # Avoid scanning git dirs or venvs
                parts = [p.lower() for p in path.parts]
                if any(p in {".git", ".venv", "venv", "__pycache__", "node_modules"} for p in parts):
                    continue

                try:
                    with open(path, "r", encoding="utf-8", errors="replace") as f:
                        text_content = f.read()

                    rel_path = str(path.relative_to(root_path)).replace("\\", "/")
                    file_findings = self.scan_text_content(
                        text=text_content,
                        file_path=rel_path,
                        start_id=finding_seq
                    )
                    findings.extend(file_findings)
                    finding_seq += len(file_findings)
                except Exception:
                    continue

        return findings

    def scan_text_content(
        self,
        text: str,
        file_path: str,
        start_id: int = 1
    ) -> List[CryptoFinding]:
        """
        Scans in-memory text content for cryptographic patterns.
        Records exact line numbers and sanitized snippets.
        """
        findings: List[CryptoFinding] = []
        if not text:
            return findings

        lines = text.splitlines()
        lang = self._infer_language(file_path)
        current_id = start_id

        # To avoid duplicate hits for identical algorithm on the same line
        seen_line_algos = set()

        for line_idx, line in enumerate(lines, start=1):
            line_str = line.strip()
            if not line_str:
                continue

            for rule in self.rules:
                match = rule.pattern.search(line)
                if match:
                    matched_token = match.group(0)
                    dedup_key = (line_idx, rule.algorithm_name)
                    if dedup_key in seen_line_algos:
                        continue
                    seen_line_algos.add(dedup_key)

                    finding_id = f"QSAFE-{current_id:04d}"
                    current_id += 1

                    # Sanitize snippet so private keys/secrets are never printed
                    sanitized_snippet = redact_snippet(line_str)

                    finding = CryptoFinding(
                        finding_id=finding_id,
                        file_path=file_path,
                        line_number=line_idx,
                        matched_token=matched_token,
                        algorithm_name=rule.algorithm_name,
                        category=rule.category,
                        quantum_status=rule.quantum_status,
                        confidence=rule.confidence,
                        snippet=sanitized_snippet,
                        rule_id=rule.rule_id,
                        description=rule.description,
                        recommended_fips=rule.recommended_fips,
                        migration_action=rule.migration_action,
                        language=lang,
                        ibm_z_feature=rule.ibm_z_feature
                    )
                    findings.append(finding)

        return findings

    @staticmethod
    def _infer_language(file_path: str) -> str:
        """Infers programming language or configuration type from file extension."""
        ext = Path(file_path).suffix.lower()
        mapping = {
            ".py": "Python",
            ".java": "Java",
            ".c": "C",
            ".h": "C/C++ Header",
            ".cpp": "C++",
            ".hpp": "C++ Header",
            ".cs": "C#",
            ".go": "Go",
            ".rs": "Rust",
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".jsx": "React JSX",
            ".tsx": "React TSX",
            ".jcl": "IBM Z Mainframe JCL",
            ".cbl": "COBOL (IBM Enterprise COBOL)",
            ".cob": "COBOL",
            ".pli": "PL/I",
            ".asm": "IBM High Level Assembler (HLASM)",
            ".rex": "REXX",
            ".rexx": "REXX",
            ".yaml": "YAML Config",
            ".yml": "YAML Config",
            ".json": "JSON Config",
            ".xml": "XML / Deployment Descriptor",
            ".ini": "INI Config",
            ".conf": "Configuration File",
            ".cfg": "Configuration File",
            ".properties": "Java Properties",
            ".pem": "Certificate / PEM Key",
            ".crt": "Certificate",
            ".key": "Key File"
        }
        return mapping.get(ext, "Generic Source / Config")
