"""
Detection Rules for Classical and Post-Quantum Cryptographic Algorithms
Supports exact pattern identification, API recognition, confidence classification,
and standard mapping (FIPS 203, FIPS 204, FIPS 205, IBM Z Crypto).
"""

import re
from dataclasses import dataclass
from typing import List, Pattern, Optional
from quantum_safe_scanner.core.models import (
    AlgorithmCategory,
    QuantumVulnerabilityStatus,
    ConfidenceLevel
)


@dataclass
class CryptoRule:
    """Definition of a cryptographic scanning pattern."""
    rule_id: str
    algorithm_name: str
    category: AlgorithmCategory
    quantum_status: QuantumVulnerabilityStatus
    confidence: ConfidenceLevel
    pattern: Pattern
    description: str
    recommended_fips: str
    migration_action: str
    quantum_weight: float  # Base risk contribution (0.0 to 1.0)
    ibm_z_feature: str = "IBM LinuxONE / z16 Standard Crypto"


# Compile detection rules
CRYPTO_RULES: List[CryptoRule] = [
    # =========================================================================
    # 1. RSA (Broken by Shor's Algorithm - Factorization)
    # =========================================================================
    CryptoRule(
        rule_id="RULE-RSA-API-01",
        algorithm_name="RSA (Direct API / Generation)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:rsa\.(?:generate|generate_private_key|import_key|construct)|KeyPairGenerator\.getInstance\s*\(\s*["']RSA["']|Cipher\.getInstance\s*\(\s*["']RSA|new\s+RSACryptoServiceProvider|crypto\.generateKeyPair(?:Sync)?\s*\(\s*['"]rsa['"]|asymmetric\.rsa|RSAPrivateKey|RSAPublicKey|PKCS1_OAEP|PKCS1_v1_5)""",
            re.MULTILINE
        ),
        description="Direct invocation of RSA asymmetric key generation, cipher instantiation, or PKCS#1 padding.",
        recommended_fips="FIPS 203 (ML-KEM) for encryption/key exchange; FIPS 204 (ML-DSA) for digital signatures.",
        migration_action="Replace RSA key encapsulation with ML-KEM-768 or hybrid X25519+ML-KEM-768. Replace signatures with ML-DSA-65.",
        quantum_weight=1.0,
        ibm_z_feature="IBM z16 CEX8S Coprocessor PQC acceleration available to replace ICSF CSNBPKE."
    ),
    CryptoRule(
        rule_id="RULE-RSA-CIPHER-02",
        algorithm_name="RSA (TLS/Cipher Suite Reference)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:TLS_RSA_WITH_|ECDHE[-_]RSA[-_]|DHE[-_]RSA[-_]|RSA[-_]WITH[-_]AES|RSA-SHA256|RSA-SHA512)""",
            re.MULTILINE
        ),
        description="TLS cipher suite or signature scheme configured with RSA key exchange or authentication.",
        recommended_fips="FIPS 203 (ML-KEM) / FIPS 204 (ML-DSA) TLS 1.3 Draft Hybrids.",
        migration_action="Upgrade TLS termination to TLS 1.3 with Hybrid ML-KEM key exchange and ML-DSA certificates.",
        quantum_weight=1.0,
        ibm_z_feature="z/OS AT-TLS and OpenSSL PQC provider for IBM LinuxONE."
    ),
    CryptoRule(
        rule_id="RULE-RSA-HEURISTIC-03",
        algorithm_name="RSA (Variable / Config Heuristic)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.HEURISTIC,
        pattern=re.compile(
            r"""(?i)(?:["']rsa[-_]?(?:2048|3072|4096|1024)["']|key_type\s*[:=]\s*["']rsa["']|algo(?:rithm)?\s*[:=]\s*["']rsa["'])""",
            re.MULTILINE
        ),
        description="Heuristic match: RSA key size configuration or algorithm designation in settings.",
        recommended_fips="FIPS 203 (ML-KEM) or FIPS 204 (ML-DSA).",
        migration_action="Audit configuration parameter and plan migration to ML-KEM or ML-DSA.",
        quantum_weight=0.85,
        ibm_z_feature="Configure RACF Keyrings and ICSF PKDS for PQC tokens."
    ),

    # =========================================================================
    # 2. ECC / ECDSA / ECDH (Broken by Shor's Algorithm - Discrete Log)
    # =========================================================================
    CryptoRule(
        rule_id="RULE-ECC-API-01",
        algorithm_name="ECDSA / Elliptic Curve (Direct API)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:ec\.generate_private_key|ec\.SECP(?:256R1|384R1|521R1|256K1)|KeyPairGenerator\.getInstance\s*\(\s*["']EC["']|ECDSA\.new|crypto\.createSign\s*\(\s*["']SHA256["']\s*\)\.sign\s*\(|ECDsa\.Create|crypto/ecdsa|EllipticCurvePublicKey|prime256v1|secp256r1|secp384r1|secp256k1)""",
            re.MULTILINE
        ),
        description="Use of Elliptic Curve Cryptography (ECDSA, secp256r1, secp256k1, prime256v1).",
        recommended_fips="FIPS 204 (ML-DSA) for general signatures; FIPS 205 (SLH-DSA) for long-term code signing.",
        migration_action="Transition elliptic curve signing keys to ML-DSA-65 or stateful LMS/HSS for firmware.",
        quantum_weight=1.0,
        ibm_z_feature="IBM z16 CPACF hardware assists and Crypto Express 8S PQC firmware."
    ),
    CryptoRule(
        rule_id="RULE-ECDH-API-02",
        algorithm_name="ECDH / X25519 (Key Agreement)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:KeyAgreement\.getInstance\s*\(\s*["']ECDH["']|ec\.ECDH\(\)|x25519\.X25519PrivateKey|Curve25519|crypto\.createECDH|X25519PublicKey)""",
            re.MULTILINE
        ),
        description="Elliptic Curve Diffie-Hellman (ECDH) or Curve25519 key agreement vulnerable to Shor's algorithm.",
        recommended_fips="FIPS 203 (ML-KEM) / ML-KEM-768.",
        migration_action="Replace ECDH key exchange with ML-KEM-768 or hybrid X25519+ML-KEM-768.",
        quantum_weight=1.0,
        ibm_z_feature="z/OS Communications Server TLS 1.3 PQC hybrid support."
    ),
    CryptoRule(
        rule_id="RULE-ED25519-API-03",
        algorithm_name="Ed25519 / Ed448 (Edwards Curves)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:Ed25519PrivateKey|Ed25519PublicKey|Ed448PrivateKey|crypto_sign_ed25519|ed25519\.generate)""",
            re.MULTILINE
        ),
        description="Edwards-curve Digital Signature Algorithm (Ed25519 / Ed448).",
        recommended_fips="FIPS 204 (ML-DSA-44 or ML-DSA-65).",
        migration_action="Migrate Ed25519 signing identities to ML-DSA-65.",
        quantum_weight=1.0,
        ibm_z_feature="IBM LinuxONE OpenSSH and OpenSSL 3.x PQC provider."
    ),

    # =========================================================================
    # 3. Classical Diffie-Hellman / DSA / ElGamal
    # =========================================================================
    CryptoRule(
        rule_id="RULE-DH-API-01",
        algorithm_name="Finite Field Diffie-Hellman (DH)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:diffie_hellman\.generate_parameters|KeyPairGenerator\.getInstance\s*\(\s*["']DH["']|Cipher\.getInstance\s*\(\s*["']DH|crypto\.createDiffieHellman|DHGroup(?:5|14|15|16|17|18))""",
            re.MULTILINE
        ),
        description="Finite Field Diffie-Hellman key exchange; vulnerable to discrete logarithm solve by Shor's.",
        recommended_fips="FIPS 203 (ML-KEM).",
        migration_action="Deprecate DH groups; adopt ML-KEM-768 Key Encapsulation Mechanism.",
        quantum_weight=1.0,
        ibm_z_feature="Hardware assisted key encapsulation via Crypto Express 8S."
    ),
    CryptoRule(
        rule_id="RULE-DSA-API-02",
        algorithm_name="Digital Signature Algorithm (DSA)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:dsa\.generate_private_key|KeyPairGenerator\.getInstance\s*\(\s*["']DSA["']|DSAPrivateKey|DSAPublicKey)""",
            re.MULTILINE
        ),
        description="Legacy DSA signature algorithm; vulnerable classically and broken by Shor's algorithm.",
        recommended_fips="FIPS 204 (ML-DSA).",
        migration_action="Immediately replace DSA with ML-DSA-65.",
        quantum_weight=1.0,
        ibm_z_feature="LinuxONE libgcrypt / OpenSSL PQC backport."
    ),

    # =========================================================================
    # 4. Symmetric Cryptography (AES-128 vs AES-256)
    # =========================================================================
    CryptoRule(
        rule_id="RULE-AES-128-01",
        algorithm_name="AES-128 (Symmetric Key)",
        category=AlgorithmCategory.SYMMETRIC_WEAKENED,
        quantum_status=QuantumVulnerabilityStatus.WEAKENED_BY_GROVER,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:AES[-_]?128[-_]?(?:GCM|CBC|CTR|ECB|CFB|OFB)|key_size\s*[:=]\s*128|Cipher\.getInstance\s*\(\s*["']AES["']\s*\).*(?:128|16\b)|AES\.new\(.*key.*16\))""",
            re.MULTILINE
        ),
        description="AES-128 bit key length. Grover's quantum search reduces effective brute-force complexity to 2^64 operations.",
        recommended_fips="NIST SP 800-131A Rev 2 & AES-256 transition guidance.",
        migration_action="Upgrade symmetric cipher key length from AES-128 to AES-256 to guarantee 128-bit quantum security.",
        quantum_weight=0.5,
        ibm_z_feature="IBM z16 CPACF natively executes AES-256 at wire speed with zero software penalty."
    ),
    CryptoRule(
        rule_id="RULE-AES-256-SAFE-02",
        algorithm_name="AES-256 (Quantum-Safe Symmetric)",
        category=AlgorithmCategory.SYMMETRIC_QUANTUM_SAFE,
        quantum_status=QuantumVulnerabilityStatus.QUANTUM_RESISTANT,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:AES[-_]?256[-_]?(?:GCM|CBC|CTR|GCM|XTS)|key_size\s*[:=]\s*256|AES\.new\(.*key.*32\)|Cipher\.getInstance\s*\(\s*["']AES/GCM/NoPadding["']\s*\).*(?:256|32\b))""",
            re.MULTILINE
        ),
        description="AES-256 provides 128 bits of post-quantum security against Grover's algorithm. Meets quantum resistance criteria.",
        recommended_fips="Compliant with Quantum-Safe Symmetric Requirements (NIST / CNSA 2.0).",
        migration_action="Maintain AES-256. Ensure key encapsulation/exchange mechanism is also upgraded to ML-KEM.",
        quantum_weight=0.05,
        ibm_z_feature="IBM z16 CPACF hardware on-chip encryption provides maximum throughput for AES-256."
    ),

    # =========================================================================
    # 5. Legacy Broken Algorithms (DES, 3DES, RC4, MD5, SHA-1)
    # =========================================================================
    CryptoRule(
        rule_id="RULE-LEGACY-3DES-01",
        algorithm_name="3DES / DES (Deprecated)",
        category=AlgorithmCategory.LEGACY_BROKEN,
        quantum_status=QuantumVulnerabilityStatus.LEGACY_COMPROMISED,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:DESede|TripleDES|DES\.new|Cipher\.getInstance\s*\(\s*["'](?:DES|DESede)|DES_key)""",
            re.MULTILINE
        ),
        description="Data Encryption Standard (DES / 3DES) has small block size (Sweet32) and is deprecated by NIST.",
        recommended_fips="Migrate immediately to AES-256-GCM.",
        migration_action="Eliminate DES/3DES from mainframe jobs and apps. Replace with AES-256-GCM.",
        quantum_weight=0.9,
        ibm_z_feature="Migrate legacy CKDS records to modern AES keys via ICSF KMAC / CPACF."
    ),
    CryptoRule(
        rule_id="RULE-LEGACY-HASH-02",
        algorithm_name="MD5 / SHA-1 (Insecure Hash)",
        category=AlgorithmCategory.LEGACY_BROKEN,
        quantum_status=QuantumVulnerabilityStatus.LEGACY_COMPROMISED,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:hashlib\.(?:md5|sha1)|MessageDigest\.getInstance\s*\(\s*["'](?:MD5|SHA-1|SHA1)["']|crypto\.createHash\s*\(\s*["'](?:md5|sha1)["']|MD5_Init|SHA1_Init)""",
            re.MULTILINE
        ),
        description="Cryptographically broken hash function vulnerable to collision attacks classically and under quantum.",
        recommended_fips="FIPS 180-4 (SHA-256 / SHA-384 / SHA-512) or FIPS 202 (SHA-3 / SHAKE).",
        migration_action="Replace with SHA-384 or SHA3-256. For signatures, adopt ML-DSA with SHAKE.",
        quantum_weight=0.8,
        ibm_z_feature="CPACF SHA-2 and SHA-3 hardware instructions."
    ),

    # =========================================================================
    # 6. Post-Quantum Algorithms (NIST FIPS 203, FIPS 204, FIPS 205)
    # =========================================================================
    CryptoRule(
        rule_id="RULE-PQC-ML-KEM-01",
        algorithm_name="ML-KEM / CRYSTALS-Kyber (FIPS 203 Standard)",
        category=AlgorithmCategory.POST_QUANTUM_SAFE,
        quantum_status=QuantumVulnerabilityStatus.PQC_STANDARDIZED,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:ML[-_]?KEM[-_]?(?:512|768|1024)|CRYSTALS[-_]?Kyber|kyber(?:512|768|1024)|oqs\.KeyEncapsulation\s*\(\s*["']Kyber|fips203|MLKEM)""",
            re.MULTILINE
        ),
        description="NIST FIPS 203 standardized Module-Lattice Key Encapsulation Mechanism. Quantum-safe against Shor's algorithm.",
        recommended_fips="Compliant with FIPS 203 (Finalized August 2024).",
        migration_action="No migration needed. Compliant post-quantum key encapsulation algorithm.",
        quantum_weight=0.0,
        ibm_z_feature="IBM z16 Crypto Express 8S coprocessor native support for ML-KEM."
    ),
    CryptoRule(
        rule_id="RULE-PQC-ML-DSA-02",
        algorithm_name="ML-DSA / CRYSTALS-Dilithium (FIPS 204 Standard)",
        category=AlgorithmCategory.POST_QUANTUM_SAFE,
        quantum_status=QuantumVulnerabilityStatus.PQC_STANDARDIZED,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:ML[-_]?DSA[-_]?(?:44|65|87)|CRYSTALS[-_]?Dilithium|dilithium(?:2|3|5)|oqs\.Signature\s*\(\s*["']Dilithium|fips204|MLDSA)""",
            re.MULTILINE
        ),
        description="NIST FIPS 204 standardized Module-Lattice Digital Signature Algorithm. Quantum-safe against Shor's algorithm.",
        recommended_fips="Compliant with FIPS 204 (Finalized August 2024).",
        migration_action="No migration needed. Primary standardized quantum-safe signature mechanism.",
        quantum_weight=0.0,
        ibm_z_feature="IBM z16 CPACF hardware acceleration & LinuxONE OpenSSL 3.x PQC provider."
    ),
    CryptoRule(
        rule_id="RULE-PQC-SLH-DSA-03",
        algorithm_name="SLH-DSA / SPHINCS+ (FIPS 205 Standard)",
        category=AlgorithmCategory.POST_QUANTUM_SAFE,
        quantum_status=QuantumVulnerabilityStatus.PQC_STANDARDIZED,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:SLH[-_]?DSA|SPHINCS\+|sphincs[-_]shake|fips205|SLHDSA)""",
            re.MULTILINE
        ),
        description="NIST FIPS 205 standardized Stateless Hash-Based Digital Signature Algorithm.",
        recommended_fips="Compliant with FIPS 205 (Finalized August 2024).",
        migration_action="No migration needed. Excellent conservative fallback signature algorithm.",
        quantum_weight=0.0,
        ibm_z_feature="Supported for secure boot and firmware signatures on IBM zSystems."
    ),
    CryptoRule(
        rule_id="RULE-PQC-HYBRID-04",
        algorithm_name="Hybrid Classical + Post-Quantum Scheme",
        category=AlgorithmCategory.POST_QUANTUM_SAFE,
        quantum_status=QuantumVulnerabilityStatus.PQC_STANDARDIZED,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:X25519MLKEM768|SecP256r1MLKEM768|p256_kyber768|x25519_kyber768|hybrid_kem|hybrid_signature)""",
            re.MULTILINE
        ),
        description="Hybrid key exchange combining classical (X25519/ECDH) and post-quantum (ML-KEM) per IETF & NIST recommendations.",
        recommended_fips="Dual protection combining FIPS 140-3 classical compliance with FIPS 203 quantum resistance.",
        migration_action="Maintain hybrid mode during industry transition phase (2025-2030).",
        quantum_weight=0.0,
        ibm_z_feature="Compatible with z/OS System SSL and OpenSSL 3.x hybrid TLS 1.3 handshakes."
    ),

    # =========================================================================
    # 7. IBM Z / Mainframe Specific Crypto Artifacts
    # =========================================================================
    CryptoRule(
        rule_id="RULE-IBMZ-ICSF-RSA-01",
        algorithm_name="IBM ICSF RSA Call (CSNBPKE / CSNDPKS / PKDS)",
        category=AlgorithmCategory.ASYMMETRIC_VULNERABLE,
        quantum_status=QuantumVulnerabilityStatus.BROKEN_BY_SHOR,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:CSNBPKE|CSNDPKS|CSNDPKD|CSNDDSV|CSNDDSG|PKDSKEY|CSNBKGN.*(?:RSA|PKA))""",
            re.MULTILINE
        ),
        description="IBM Integrated Cryptographic Service Facility (ICSF) callable service for RSA key generation or signature.",
        recommended_fips="ICSF PQC Services with FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA).",
        migration_action="Update JCL / COBOL / C calling programs from CSNBPKE/CSNDDSG to modern ICSF Quantum-Safe APIs.",
        quantum_weight=1.0,
        ibm_z_feature="Requires IBM z16 with Crypto Express 8S (CEX8S) coprocessor and z/OS 2.5/3.1 ICSF APARs."
    ),
    CryptoRule(
        rule_id="RULE-IBMZ-CPACF-AES-02",
        algorithm_name="IBM z CPACF Hardware Assisted Crypto",
        category=AlgorithmCategory.SYMMETRIC_QUANTUM_SAFE,
        quantum_status=QuantumVulnerabilityStatus.QUANTUM_RESISTANT,
        confidence=ConfidenceLevel.CONFIRMED,
        pattern=re.compile(
            r"""(?i)(?:CPACF|KMAC|KMC|KM[-_]AES[-_]256|CEX8S|Crypto\s+Express\s+8S)""",
            re.MULTILINE
        ),
        description="IBM Central Processor Assist for Cryptographic Functions (CPACF) on-chip acceleration.",
        recommended_fips="Leverage CPACF for wire-speed AES-256 and SHA-512.",
        migration_action="Verify key sizes are configured to AES-256 for full quantum resistance.",
        quantum_weight=0.05,
        ibm_z_feature="On-chip microprocessor feature available on all IBM z14/z15/z16 and LinuxONE systems."
    ),
]
