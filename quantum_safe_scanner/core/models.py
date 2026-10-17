"""
Core Data Models for Cryptographic Vulnerability Assessment
Represents cryptographic findings, risk profiles, CBOM entries, and scan summaries.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional


class AlgorithmCategory(str, Enum):
    ASYMMETRIC_VULNERABLE = "Asymmetric (Vulnerable to Shor's)"
    SYMMETRIC_WEAKENED = "Symmetric (Weakened by Grover's)"
    SYMMETRIC_QUANTUM_SAFE = "Symmetric (Quantum-Safe)"
    LEGACY_BROKEN = "Legacy Broken (Classical & Quantum Unsafe)"
    POST_QUANTUM_SAFE = "Post-Quantum Cryptography (FIPS Standard)"
    HASH_QUANTUM_SAFE = "Cryptographic Hash (Quantum-Safe)"


class QuantumVulnerabilityStatus(str, Enum):
    BROKEN_BY_SHOR = "Broken by Shor's Algorithm"
    WEAKENED_BY_GROVER = "Weakened by Grover's Algorithm (halved effective key length)"
    LEGACY_COMPROMISED = "Classically Broken & Quantum Insecure"
    QUANTUM_RESISTANT = "Quantum Resistant (Symmetric >= 256-bit)"
    PQC_STANDARDIZED = "Post-Quantum Standard (NIST FIPS 203/204/205)"


class ConfidenceLevel(str, Enum):
    CONFIRMED = "Confirmed Finding (Direct API/Import/Key Def)"
    HEURISTIC = "Heuristic Detection (Keyword / Inferred Context)"


class RiskTier(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    SAFE = "QUANTUM-SAFE / COMPLIANT"


@dataclass
class CryptoFinding:
    """Represents a single cryptographic artifact or pattern found in source/config files."""
    finding_id: str
    file_path: str
    line_number: int
    matched_token: str
    algorithm_name: str
    category: AlgorithmCategory
    quantum_status: QuantumVulnerabilityStatus
    confidence: ConfidenceLevel
    snippet: str
    rule_id: str
    description: str
    recommended_fips: str
    migration_action: str

    # Quantitative Risk Assessment (computed by risk engine)
    risk_score: float = 0.0
    risk_tier: RiskTier = RiskTier.LOW
    mosca_violated: bool = False
    hndl_exposure: bool = False

    # Metadata
    language: str = "Unknown"
    ibm_z_feature: str = "Standard z/OS & LinuxONE Software"

    def to_dict(self) -> Dict[str, Any]:
        """Converts finding to dictionary for UI tables and CBOM exports."""
        return {
            "Finding ID": self.finding_id,
            "File": self.file_path,
            "Line": self.line_number,
            "Algorithm": self.algorithm_name,
            "Category": self.category.value,
            "Quantum Vulnerability": self.quantum_status.value,
            "Confidence": self.confidence.value,
            "Risk Score (0-100)": round(self.risk_score, 1),
            "Risk Tier": self.risk_tier.value,
            "Mosca Violated (X+Y>Z)": "YES" if self.mosca_violated else "NO",
            "HNDL Threat": "YES (High Intercept Risk)" if self.hndl_exposure else "NO",
            "Recommended FIPS": self.recommended_fips,
            "Migration Action": self.migration_action,
            "IBM Z / LinuxONE Feature": self.ibm_z_feature,
            "Rule ID": self.rule_id,
            "Redacted Snippet": self.snippet,
        }


@dataclass
class SystemRiskContext:
    """Parameters defining the enterprise system's operational environment and timelines."""
    data_sensitivity: float = 0.8       # 0.1 (Public) to 1.0 (Critical / PII / Financial)
    exposure_factor: float = 0.9        # 0.2 (Air-gapped) to 1.0 (Public Internet)
    confidentiality_years: int = 10     # X: How long data must remain confidential
    migration_years: int = 3            # Y: Time needed to migrate infrastructure to PQC
    crqc_arrival_year: int = 2030       # Year Cryptographically Relevant Quantum Computer arrives
    current_year: int = 2026            # Datathon base year (2026)


@dataclass
class ScanInventory:
    """Aggregated scan inventory and Cryptographic Bill of Materials (CBOM)."""
    findings: List[CryptoFinding] = field(default_factory=list)
    total_files_scanned: int = 0
    scanned_file_list: List[str] = field(default_factory=list)
    overall_quantum_risk_score: float = 0.0
    overall_risk_tier: RiskTier = RiskTier.LOW
    critical_findings_count: int = 0
    high_findings_count: int = 0
    medium_findings_count: int = 0
    low_findings_count: int = 0
    safe_findings_count: int = 0
    confirmed_count: int = 0
    heuristic_count: int = 0
    hndl_exposed_count: int = 0
    mosca_breach_count: int = 0

    def compute_summary_stats(self) -> None:
        """Calculates roll-up metrics and counts."""
        self.critical_findings_count = sum(1 for f in self.findings if f.risk_tier == RiskTier.CRITICAL)
        self.high_findings_count = sum(1 for f in self.findings if f.risk_tier == RiskTier.HIGH)
        self.medium_findings_count = sum(1 for f in self.findings if f.risk_tier == RiskTier.MEDIUM)
        self.low_findings_count = sum(1 for f in self.findings if f.risk_tier == RiskTier.LOW)
        self.safe_findings_count = sum(1 for f in self.findings if f.risk_tier == RiskTier.SAFE)

        self.confirmed_count = sum(1 for f in self.findings if f.confidence == ConfidenceLevel.CONFIRMED)
        self.heuristic_count = sum(1 for f in self.findings if f.confidence == ConfidenceLevel.HEURISTIC)

        self.hndl_exposed_count = sum(1 for f in self.findings if f.hndl_exposure)
        self.mosca_breach_count = sum(1 for f in self.findings if f.mosca_violated)

        if self.findings:
            # Weighted average or maximum risk score
            scores = [f.risk_score for f in self.findings if f.risk_score > 0]
            if scores:
                self.overall_quantum_risk_score = round(max(scores) * 0.7 + (sum(scores) / len(scores)) * 0.3, 1)
            else:
                self.overall_quantum_risk_score = 0.0
        else:
            self.overall_quantum_risk_score = 0.0

        if self.overall_quantum_risk_score >= 80:
            self.overall_risk_tier = RiskTier.CRITICAL
        elif self.overall_quantum_risk_score >= 60:
            self.overall_risk_tier = RiskTier.HIGH
        elif self.overall_quantum_risk_score >= 40:
            self.overall_risk_tier = RiskTier.MEDIUM
        elif self.overall_quantum_risk_score >= 15:
            self.overall_risk_tier = RiskTier.LOW
        else:
            self.overall_risk_tier = RiskTier.SAFE
