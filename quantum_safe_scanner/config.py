"""
Quantum-Safe Cryptographic Vulnerability Assessment Tool
Configuration and constants for file safety, limits, and NIST FIPS standards.
Compatible with Windows and IBM LinuxONE (s390x / RHEL 9.8).
"""

from pathlib import Path

# Tool metadata
TOOL_NAME = "IBM Z Quantum-Safe Cryptographic Vulnerability Assessment Tool"
TOOL_VERSION = "1.0.0-MVP"
DATATHON_EDITION = "IBM Z Datathon 2026"

# Safety and archive limits
MAX_ZIP_SIZE_BYTES = 25 * 1024 * 1024       # 25 MB max archive size
MAX_UNCOMPRESSED_BYTES = 60 * 1024 * 1024   # 60 MB uncompressed limit (prevents zip bombs)
MAX_FILE_COUNT = 500                        # Max files per upload
MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024     # 5 MB max per individual source file

# Supported source and config extensions
SUPPORTED_EXTENSIONS = {
    # Code languages
    ".py", ".java", ".c", ".h", ".cpp", ".hpp", ".cs", ".go", ".rs",
    ".js", ".ts", ".jsx", ".tsx", ".php", ".rb", ".swift", ".kt",
    # Mainframe and enterprise
    ".jcl", ".cbl", ".cob", ".pli", ".asm", ".rex", ".rexx",
    # Configurations and infrastructure
    ".yaml", ".yml", ".json", ".xml", ".ini", ".conf", ".cfg",
    ".properties", ".env", ".toml", ".pem", ".crt", ".key"
}

# NIST FIPS Post-Quantum Cryptography Standards (Released August 2024 / FIPS Final)
NIST_STANDARDS = {
    "FIPS_203": {
        "standard": "FIPS 203",
        "name": "ML-KEM (Module-Lattice-Based Key-Encapsulation Mechanism)",
        "derived_from": "CRYSTALS-Kyber",
        "primary_use": "General encryption / Public-key key exchange",
        "security_levels": {
            "ML-KEM-512": "NIST Security Category 1 (AES-128 equivalent)",
            "ML-KEM-768": "NIST Security Category 3 (AES-192 equivalent - Recommended Default)",
            "ML-KEM-1024": "NIST Security Category 5 (AES-256 equivalent - High Security)"
        },
        "ibm_z_support": "Supported via IBM z16 Crypto Express 8S (CEX8S) firmware and z/OS OpenSSL PQC provider."
    },
    "FIPS_204": {
        "standard": "FIPS 204",
        "name": "ML-DSA (Module-Lattice-Based Digital Signature Algorithm)",
        "derived_from": "CRYSTALS-Dilithium",
        "primary_use": "Primary digital signature standard for general use",
        "security_levels": {
            "ML-DSA-44": "NIST Security Category 2",
            "ML-DSA-65": "NIST Security Category 3 (Recommended Default)",
            "ML-DSA-87": "NIST Security Category 5"
        },
        "ibm_z_support": "Accelerated via IBM z16 CPACF and Crypto Express 8S coprocessor."
    },
    "FIPS_205": {
        "standard": "FIPS 205",
        "name": "SLH-DSA (Stateless Hash-Based Digital Signature Algorithm)",
        "derived_from": "SPHINCS+",
        "primary_use": "Alternative digital signature (backup against lattice cryptanalysis)",
        "security_levels": {
            "SLH-DSA-SHA2-128s / 128f": "NIST Security Category 1",
            "SLH-DSA-SHA2-192s / 192f": "NIST Security Category 3",
            "SLH-DSA-SHA2-256s / 256f": "NIST Security Category 5"
        },
        "ibm_z_support": "Ideal for long-term code signing and firmware verification on IBM LinuxONE."
    }
}
