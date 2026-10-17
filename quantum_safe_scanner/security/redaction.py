"""
Sensitive Data and Private Key Redaction Module
Strictly enforces:
- Never print or export private key contents.
- Automatic scrubbing of PEM keys, PKCS#8, OpenSSH keys, and hardcoded secrets.
"""

import re
from typing import str

# Regex patterns for private keys and credentials
PRIVATE_KEY_BLOCK_PATTERN = re.compile(
    r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----",
    re.IGNORECASE
)

CERTIFICATE_KEY_PATTERN = re.compile(
    r"-----BEGIN (?:CERTIFICATE|PUBLIC KEY)-----[\s\S]*?-----END (?:CERTIFICATE|PUBLIC KEY)-----",
    re.IGNORECASE
)

GENERIC_SECRET_PATTERNS = [
    # API tokens, secret keys, passwords in assignments
    re.compile(r"""(?i)(secret[_-]?key|private[_-]?key|password|passwd|token|apikey|api[_-]?secret)\s*[:=]\s*["']([A-Za-z0-9_\-\.\$\/\+]{8,})["']"""),
    # AWS / Cloud style keys
    re.compile(r"""(AKIA[0-9A-Z]{16})"""),
]


def redact_sensitive_contents(text: str) -> str:
    """
    Redacts private key blocks and sensitive secrets from an entire document.
    """
    if not text:
        return ""

    # Redact full private key blocks
    scrubbed = PRIVATE_KEY_BLOCK_PATTERN.sub(
        "[REDACTED_PRIVATE_KEY: IBM-Z-SECURITY-POLICY: KEY CONTENTS NEVER DISPLAYED]",
        text
    )

    # Redact generic secrets
    for pattern in GENERIC_SECRET_PATTERNS:
        if pattern.groups == 2:
            scrubbed = pattern.sub(r'\1: "[REDACTED_SECRET]"', scrubbed)
        elif pattern.groups == 1:
            scrubbed = pattern.sub(r'[REDACTED_CREDENTIAL]', scrubbed)

    return scrubbed


def redact_snippet(snippet: str, max_chars: int = 140) -> str:
    """
    Sanitizes and truncates a single-line or multi-line evidence snippet for display and CSV export.
    Guarantees no raw private key or credentials are leaked.
    """
    if not snippet:
        return ""

    clean = snippet.strip().replace("\r", "")
    # Check for private key signatures
    if "BEGIN" in clean and "PRIVATE KEY" in clean:
        return "[REDACTED_PRIVATE_KEY_BLOCK: Matches cryptographic key specification]"

    clean = redact_sensitive_contents(clean)

    # Truncate single line neatly
    if len(clean) > max_chars:
        return clean[:max_chars - 3] + "..."
    return clean
