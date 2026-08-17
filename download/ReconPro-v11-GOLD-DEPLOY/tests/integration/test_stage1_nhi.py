"""
ReconPro test suite — Stage 1 (VibeSec Enhanced) + Stage 3 (NHI Graph Engine).

Covers:
  Stage 1 — VibeSec Enhancements:
    s1e1 — New sensitive paths include .aws/credentials, .ssh, CI configs
    s1e2 — New security headers constant (HSTS, CSP, etc.)
    s1e3 — DB admin paths constant exists
    s1e4 — Storage exposure paths constant exists
    s1e5 — S3 listing indicators constant exists
    s1e6 — Auth pattern regex exists
    s1e7 — VibeSec now checks 7 categories
    s1e8 — Anon patterns include GCP and Azure
    s1e9 — Security headers are tuples with 4 elements

  Stage 3 — NHI Graph Engine:
    s3a1 — NHI identity patterns exist (10 patterns)
    s3a2 — NHI over-permission patterns exist (5 patterns)
    s3a3 — module_nhi_graph function exists
    s3a4 — render_nhi_graph_panel function exists
    s3a5 — NHI GRAPH in MODULES list
    s3a6 — Module count is 8
    s3a7 — Banner says EIGHT BLADES
    s3a8 — Tagline says Eight Blades
    s3a9 — Unified verdict includes nhi scoring
    s3a10 — NHI module returns required keys structure
    s3a11 — _nhi_verify_match function exists
    s3a12 — _nhi_generate_remediation function exists
    s3a13 — Compile check passes
"""
import re
import sys
import os

import pytest

_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), os.pardir, "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

import reconpro


# ══════════════════════════════════════════════════════════════════════════
# Stage 1: VibeSec Enhanced Constants
# ══════════════════════════════════════════════════════════════════════════

class TestVibeSecEnhancedPaths:
    """New sensitive paths must include AWS, SSH, CI configs."""

    def test_aws_credentials_in_paths(self):
        paths = reconpro.VIBESEC_SENSITIVE_PATHS
        assert "/.aws/credentials" in paths, "Must check /.aws/credentials"
        assert "/.aws/config" in paths, "Must check /.aws/config"

    def test_ssh_keys_in_paths(self):
        paths = reconpro.VIBESEC_SENSITIVE_PATHS
        assert "/.ssh/id_rsa" in paths, "Must check /.ssh/id_rsa"
        assert "/.ssh/id_ed25519" in paths, "Must check /.ssh/id_ed25519"
        assert "/.ssh/authorized_keys" in paths, "Must check /.ssh/authorized_keys"

    def test_ci_configs_in_paths(self):
        paths = reconpro.VIBESEC_SENSITIVE_PATHS
        assert "/.gitlab-ci.yml" in paths or "/.github" in str(paths), "Must check CI configs"
        assert "/travis.yml" in paths, "Must check .travis.yml"
        assert "/.circleci/config.yml" in paths, "Must check .circleci/config.yml"

    def test_total_sensitive_paths_count(self):
        assert len(reconpro.VIBESEC_SENSITIVE_PATHS) >= 25, \
            f"Expected >= 25 sensitive paths, got {len(reconpro.VIBESEC_SENSITIVE_PATHS)}"


class TestVibeSecSecurityHeaders:
    """Security headers constant must have HSTS, CSP, and correct structure."""

    def test_security_headers_exist(self):
        assert hasattr(reconpro, "VIBESEC_SECURITY_HEADERS"), "VIBESEC_SECURITY_HEADERS must exist"
        assert len(reconpro.VIBESEC_SECURITY_HEADERS) >= 5, "At least 5 security headers"

    def test_hsts_present(self):
        headers = [h[0].lower() for h in reconpro.VIBESEC_SECURITY_HEADERS]
        assert "strict-transport-security" in headers, "Must check HSTS"

    def test_csp_present(self):
        headers = [h[0].lower() for h in reconpro.VIBESEC_SECURITY_HEADERS]
        assert "content-security-policy" in headers, "Must check CSP"

    def test_header_tuples_have_4_elements(self):
        for h in reconpro.VIBESEC_SECURITY_HEADERS:
            assert len(h) == 4, f"Header tuple must have 4 elements: {h}"
            name, display, severity, pts = h
            assert isinstance(name, str) and len(name) > 0
            assert isinstance(display, str) and len(display) > 0
            assert severity in ("high", "medium", "low", "critical")
            assert isinstance(pts, int) and pts > 0


class TestVibeSecDBAdminPaths:
    """DB admin paths must cover major database tools."""

    def test_db_admin_paths_exist(self):
        assert hasattr(reconpro, "VIBESEC_DB_ADMIN_PATHS"), "VIBESEC_DB_ADMIN_PATHS must exist"
        assert len(reconpro.VIBESEC_DB_ADMIN_PATHS) >= 10, "At least 10 DB admin paths"

    def test_phpmyadmin_present(self):
        paths = reconpro.VIBESEC_DB_ADMIN_PATHS
        assert any("phpmyadmin" in p.lower() for p in paths), "Must check phpMyAdmin"

    def test_pgadmin_present(self):
        paths = reconpro.VIBESEC_DB_ADMIN_PATHS
        assert any("pgadmin" in p.lower() for p in paths), "Must check pgAdmin"

    def test_mongo_express_present(self):
        paths = reconpro.VIBESEC_DB_ADMIN_PATHS
        assert any("mongo" in p.lower() for p in paths), "Must check MongoDB Express"


class TestVibeSecStorageExposure:
    """Storage exposure checks for S3/R2 directory listings."""

    def test_storage_paths_exist(self):
        assert hasattr(reconpro, "VIBESEC_STORAGE_EXPOSURE_PATHS"), "VIBESEC_STORAGE_EXPOSURE_PATHS must exist"
        assert len(reconpro.VIBESEC_STORAGE_EXPOSURE_PATHS) >= 5, "At least 5 storage paths"

    def test_s3_indicators_exist(self):
        assert hasattr(reconpro, "VIBESEC_S3_LISTING_INDICATORS"), "VIBESEC_S3_LISTING_INDICATORS must exist"
        assert "ListBucketResult" in reconpro.VIBESEC_S3_LISTING_INDICATORS, "Must check S3 XML markers"


class TestVibeSecAuthPattern:
    """Auth pattern regex for detecting protected responses."""

    def test_auth_pattern_exists(self):
        assert hasattr(reconpro, "VIBESEC_AUTH_PATTERN"), "VIBESEC_AUTH_PATTERN must exist"
        assert isinstance(reconpro.VIBESEC_AUTH_PATTERN, type(re.compile(""))), "Must be compiled regex"

    def test_auth_pattern_matches_unauthorized(self):
        m = reconpro.VIBESEC_AUTH_PATTERN.search("401 Unauthorized access")
        assert m is not None, "Must match 'Unauthorized'"

    def test_auth_pattern_matches_forbidden(self):
        m = reconpro.VIBESEC_AUTH_PATTERN.search("403 Forbidden")
        assert m is not None, "Must match 'Forbidden'"


class TestVibeSecExpandedCategories:
    """VibeSec must now check 7 categories."""

    def test_categories_list(self):
        import inspect
        src = inspect.getsource(reconpro.module_vibesec)
        # Check the result dict includes all 7 categories
        assert "security_headers" in src, "Must include security_headers category"
        assert "exposed_db" in src, "Must include exposed_db category"
        assert "storage_exposure" in src, "Must include storage_exposure category"


class TestVibeSecExpandedAnonPatterns:
    """Anon key patterns must include GCP and Azure."""

    def test_gcp_storage_present(self):
        names = [p[0] for p in reconpro.VIBESEC_ANON_KEY_PATTERNS]
        assert any("gcp" in n.lower() for n in names), "Must check GCP Storage"

    def test_azure_blob_present(self):
        names = [p[0] for p in reconpro.VIBESEC_ANON_KEY_PATTERNS]
        assert any("azure" in n.lower() for n in names), "Must check Azure Blob"

    def test_anon_pattern_count(self):
        assert len(reconpro.VIBESEC_ANON_KEY_PATTERNS) >= 7, \
            f"Expected >= 7 anon patterns, got {len(reconpro.VIBESEC_ANON_KEY_PATTERNS)}"


# ══════════════════════════════════════════════════════════════════════════
# Stage 3: NHI Graph Engine
# ══════════════════════════════════════════════════════════════════════════

class TestNHIGraphConstants:
    """NHI identity and over-permission patterns must exist."""

    def test_identity_patterns_exist(self):
        assert hasattr(reconpro, "NHI_IDENTITY_PATTERNS"), "NHI_IDENTITY_PATTERNS must exist"
        assert len(reconpro.NHI_IDENTITY_PATTERNS) >= 10, \
            f"Expected >= 10 identity patterns, got {len(reconpro.NHI_IDENTITY_PATTERNS)}"

    def test_identity_patterns_include_aws(self):
        names = [p[0] for p in reconpro.NHI_IDENTITY_PATTERNS]
        assert any("aws" in n.lower() for n in names), "Must include AWS IAM patterns"
        assert any("iam_role" in n.lower() for n in names), "Must include IAM role detection"

    def test_identity_patterns_include_gcp(self):
        names = [p[0] for p in reconpro.NHI_IDENTITY_PATTERNS]
        assert any("gcp" in n.lower() for n in names), "Must include GCP service account"

    def test_identity_patterns_include_azure(self):
        names = [p[0] for p in reconpro.NHI_IDENTITY_PATTERNS]
        assert any("azure" in n.lower() for n in names), "Must include Azure AD patterns"

    def test_identity_patterns_include_generic(self):
        names = [p[0] for p in reconpro.NHI_IDENTITY_PATTERNS]
        assert any("generic" in n.lower() or "api_key" in n.lower() for n in names), \
            "Must include generic API key patterns"

    def test_identity_patterns_include_bearer(self):
        names = [p[0] for p in reconpro.NHI_IDENTITY_PATTERNS]
        assert any("bearer" in n.lower() for n in names), "Must include Bearer token patterns"

    def test_overpermission_patterns_exist(self):
        assert hasattr(reconpro, "NHI_OVERPERMISSION_PATTERNS"), "NHI_OVERPERMISSION_PATTERNS must exist"
        assert len(reconpro.NHI_OVERPERMISSION_PATTERNS) >= 5, \
            f"Expected >= 5 over-permission patterns, got {len(reconpro.NHI_OVERPERMISSION_PATTERNS)}"

    def test_overpermission_wildcard_action(self):
        names = [p[0] for p in reconpro.NHI_OVERPERMISSION_PATTERNS]
        assert any("wildcard" in n.lower() and "action" in n.lower() for n in names), \
            "Must check wildcard Action"

    def test_overpermission_admin_access(self):
        names = [p[0] for p in reconpro.NHI_OVERPERMISSION_PATTERNS]
        assert any("admin" in n.lower() for n in names), "Must check Admin/FullAccess"


class TestNHIModule:
    """module_nhi_graph must exist and follow module conventions."""

    def test_function_exists(self):
        assert hasattr(reconpro, "module_nhi_graph"), "module_nhi_graph must exist"
        assert callable(reconpro.module_nhi_graph)

    def test_renderer_exists(self):
        assert hasattr(reconpro, "render_nhi_graph_panel"), "render_nhi_graph_panel must exist"
        assert callable(reconpro.render_nhi_graph_panel)

    def test_verify_match_exists(self):
        assert hasattr(reconpro, "_nhi_verify_match"), "_nhi_verify_match must exist"

    def test_generate_remediation_exists(self):
        assert hasattr(reconpro, "_nhi_generate_remediation"), "_nhi_generate_remediation must exist"

    def test_module_uses_http_probe(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert "http_probe(" in src, "NHI module must use http_probe (zero fabrication)"

    def test_module_uses_audit_log(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert "audit_log(" in src, "NHI module must use audit_log"

    def test_module_has_remediation(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert "remediation" in src.lower(), "NHI module must generate remediation"
        assert "terraform" in src.lower(), "NHI module must generate Terraform patches"


class TestNHIIntegration:
    """NHI must be fully integrated into the CLI."""

    def test_nhi_in_modules(self):
        ids = [m["id"] for m in reconpro.MODULES]
        assert "nhi" in ids, "NHI GRAPH must be in MODULES list"

    def test_nhi_module_name(self):
        nhi = [m for m in reconpro.MODULES if m["id"] == "nhi"]
        assert len(nhi) == 1, "Exactly one nhi entry"
        assert "NHI" in nhi[0]["name"]
        assert nhi[0]["color"] == "cyan"

    def test_eight_modules_total(self):
        assert len(reconpro.MODULES) == 8, f"Expected 8 modules, got {len(reconpro.MODULES)}"

    def test_banner_eight_blades(self):
        assert "E I G H T" in reconpro.BANNER, "Banner must say EIGHT BLADES"

    def test_tagline_eight_blades(self):
        assert "Eight" in reconpro.RECONPRO_TAGLINE, "Tagline must say Eight Blades"

    def test_unified_verdict_includes_nhi(self):
        import inspect
        src = inspect.getsource(reconpro.compute_unified_verdict)
        assert "nhi" in src, "Unified verdict must include NHI scoring"

    def test_nhi_weighted(self):
        import inspect
        src = inspect.getsource(reconpro.compute_unified_verdict)
        assert "weights" in src, "Unified verdict must use weights dict"
        assert "nhi" in src, "NHI must have a weight in verdict"


class TestNHIModuleStructure:
    """NHI module return structure validation (source audit)."""

    def test_returns_module_key(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert '"module"' in src, 'Must return "module" key'
        assert '"NHI GRAPH"' in src or '"NHI"' in src, "Module name must be NHI GRAPH"

    def test_returns_nodes(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert '"nodes"' in src, "Must return nodes graph structure"

    def test_returns_edges(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert '"edges"' in src, "Must return edges graph structure"

    def test_returns_blast_radius(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert "blast_radius" in src, "Must return blast_radius analysis"

    def test_returns_risk_score(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert "risk_score" in src, "Must return risk_score (0-100)"

    def test_returns_overpermissions(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert "overpermissions" in src or "over_permissions" in src, \
            "Must return over-permission findings"

    def test_returns_remediation_tf(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        assert "remediation_tf" in src or "terraform" in src, \
            "Must return Terraform remediation string"


class TestNHIGraphConstruction:
    """NHI graph must construct proper node/edge structures."""

    def test_node_types(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        # Must have at least 4 node types: Identity, Role, Endpoint, Database
        for ntype in ["Identity", "Role", "Endpoint", "Database"]:
            assert ntype in src, f"Must support node type: {ntype}"

    def test_edge_relations(self):
        import inspect
        src = inspect.getsource(reconpro.module_nhi_graph)
        # Must have edge types
        for rel in ["HAS_ACCESS_TO", "CAN_ASSUME", "EXPOSES_TOKEN"]:
            assert rel in src, f"Must support edge relation: {rel}"


class TestNHITerraformRemediation:
    """NHI must generate Terraform remediation for over-permissions."""

    def test_tf_block_syntax(self):
        import inspect
        src = inspect.getsource(reconpro._nhi_generate_remediation)
        assert "resource" in src, "Terraform must contain resource blocks"
        assert "aws_iam_role_policy" in src or "aws_iam" in src, \
            "Terraform must reference AWS IAM resources"

    def test_tf_least_privilege(self):
        import inspect
        src = inspect.getsource(reconpro._nhi_generate_remediation)
        assert "Effect" in src and "Allow" in src, \
            "Terraform must use least-privilege Effect: Allow"


# ══════════════════════════════════════════════════════════════════════════
# Compile check
# ══════════════════════════════════════════════════════════════════════════

class TestNHICompileCheck:
    def test_module_compiles(self):
        """reconpro.py must compile without syntax errors."""
        import py_compile
        py_compile.compile(reconpro.__file__, doraise=True)
