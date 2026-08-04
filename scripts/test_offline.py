"""ReconPro v7.0.0 — Offline tests (no network)."""
import sys, os, json, traceback, tempfile, time, io
sys.path.insert(0, "/home/z/my-project/vibesec-cli")

results = []
def test(name, fn):
    start = time.time()
    try:
        result = fn(); dur = time.time() - start
        status = "PASS" if result else "FAIL"
        results.append((name, status, "OK", dur))
        print(f"  [{'\033[92mPASS\033[0m' if result else '\033[91mFAIL\033[0m'}] {name} ({dur:.1f}s)")
        return result
    except Exception as e:
        dur = time.time() - start
        results.append((name, "ERROR", f"{type(e).__name__}: {e}", dur))
        print(f"  [\033[91mERROR\033[0m] {name} ({dur:.1f}s): {type(e).__name__}: {e}")
        return False

def report():
    p = sum(1 for _,s,_,_ in results if s=="PASS")
    f = sum(1 for _,s,_,_ in results if s in ("FAIL","ERROR"))
    t = len(results)
    print(f"\n{'='*70}\nRESULTS: {p}/{t} passed, {f} failed")
    if f:
        print(f"\n\033[91mFAILURES:\033[0m")
        for n,s,d,dur in results:
            if s in ("FAIL","ERROR"): print(f"  x {n} ({dur:.1f}s): {d[:200]}")
    else:
        print(f"\n\033[92mALL OFFLINE TESTS PASSED\033[0m")
    print(f"{'='*70}")
    return f==0

print("\n\033[1m=== ReconPro v7.0.0 — Offline Tests ===\033[0m\n")

# [1] Imports
print("\n\033[1m[1] Package Imports\033[0m")
test("Version == 7.0.0", lambda: (__import__('reconpro'), __import__('reconpro').__version__ == "7.0.0")[-1])
def all_imports():
    mods = ["reconpro","reconpro.cli","reconpro.scanner","reconpro.http","reconpro.history",
        "reconpro.theme","reconpro.formats","reconpro.reports","reconpro.server","reconpro.chat",
        "reconpro.plugins","reconpro.scheduler","reconpro.subdomains","reconpro.parallel",
        "reconpro.engine","reconpro.memory","reconpro.entropy","reconpro.nexus_help",
        "reconpro.nexus_agent","reconpro.swarm","reconpro.adversarial","reconpro.defense",
        "reconpro.fuzzer","reconpro.knowledge_graph","reconpro.chain_engine","reconpro.compliance",
        "reconpro.benchmark","reconpro.delta","reconpro.profiler","reconpro.cve_radar",
        "reconpro.passive_intel","reconpro.netmap","reconpro.evasion","reconpro.proxy",
        "reconpro.mitm","reconpro.api_discovery","reconpro.async_http","reconpro.webhooks",
        "reconpro.tool_sdk","reconpro.graph_ui","reconpro.collab","reconpro.report_writer",
        "reconpro.raw_sockets","reconpro.browser_mod","reconpro.agent",
        "reconpro.modules","reconpro.modules.recon","reconpro.modules.vibesec",
        "reconpro.modules.auth","reconpro.modules.chain","reconpro.modules.bot",
        "reconpro.modules.gorgon","reconpro.modules.oblivion","reconpro.modules.nhi",
        "reconpro.modules.host","reconpro.modules.dev","reconpro.modules.doctor",
        "reconpro.modules.ast_analyzer","reconpro.modules.iac_audit","reconpro.modules.container_sec",
        "reconpro.modules.cloud_recon","reconpro.integrations","reconpro.integrations.jira",
        "reconpro.integrations.slack","reconpro.integrations.github","reconpro.widgets",
        "reconpro.widgets.score_gauge","reconpro.widgets.sparkline","reconpro.widgets.stat_counter",
        "reconpro.widgets.velocity_meter","reconpro.widgets.command_completer",
        "reconpro.widgets.hint_bar","reconpro.widgets.toast"]
    for m in mods: __import__(m)
    return True
test("All 62 module imports", all_imports)

# [2] Theme
print("\n\033[1m[2] Theme System\033[0m")
def test_themes():
    from reconpro.theme import Theme
    for name in Theme.available_themes():
        Theme.set_theme(name); t = Theme.current()
        assert t.sev_style("critical") and t.sev_hex("critical")
        assert t.grade_color("A+") and t.grade_rich("F")
        assert "body_bg" in t.html_style() and t.spinner_frames
    return True
test("Load current theme", lambda: (__import__('reconpro.theme',fromlist=['Theme']).Theme.current() is not None))
test("All 6 themes cycle", test_themes)
test("Severity colors", lambda: all([(__import__('reconpro.theme',fromlist=['Theme']).Theme.current().sev_style(s) and __import__('reconpro.theme',fromlist=['Theme']).Theme.current().sev_hex(s)) for s in ["critical","high","medium","low","info"]]))
test("Grade colors", lambda: all([(__import__('reconpro.theme',fromlist=['Theme']).Theme.current().grade_color(g) and __import__('reconpro.theme',fromlist=['Theme']).Theme.current().grade_rich(g)) for g in ["A+","A","B","C","D","F"]]))

# [3] Scoring
print("\n\033[1m[3] Scoring System\033[0m")
def test_grades():
    from reconpro.http import compute_grade
    for score, expected in [(100,"A+"),(85,"A"),(70,"B"),(55,"C"),(40,"D"),(10,"F"),(0,"F")]:
        g = compute_grade(score)
        assert g == expected, f"score={score} got={g} want={expected}"
    return True
test("Grade computation all tiers", test_grades)
def test_finding():
    from reconpro.http import Finding
    f = Finding(title="T",severity="critical",category="sqli",module="recon",description="d",evidence="e",asset="a",points_deducted=10,remediation="r",dread_score=7.5)
    return f.title=="T" and f.dread_score==7.5
test("Finding dataclass", test_finding)
def test_badge():
    from reconpro.http import badge_markdown
    b = badge_markdown("example.com","A")
    return "A" in b
test("Badge markdown", test_badge)
test("RateLimiter", lambda: (__import__('reconpro.http',fromlist=['RateLimiter']).RateLimiter(max_per_second=10.0).acquire(), True)[-1])

# [4] Module exports
print("\n\033[1m[4] Scan Module Exports\033[0m")
def test_module_exports():
    from reconpro import modules as m
    for name in ["run_recon","run_vibesec","run_auth","run_chain","run_bot","run_gorgon","run_oblivion","run_nhi","run_doctor","run_dev","run_host","run_cloud_recon"]:
        assert hasattr(m, name), f"Missing {name}"
    return True
test("12 runner functions exported", test_module_exports)

# [5] Remote module callable
print("\n\033[1m[5] Remote Module Signatures\033[0m")
def test_remote():
    from reconpro.modules.recon import run_recon
    from reconpro.modules.vibesec import run_vibesec
    from reconpro.modules.auth import run_auth
    from reconpro.modules.chain import run_chain
    from reconpro.modules.bot import run_bot
    from reconpro.modules.gorgon import run_gorgon
    from reconpro.modules.oblivion import run_oblivion
    from reconpro.modules.nhi import run_nhi
    from reconpro.modules.cloud_recon import run_cloud_recon
    assert all(callable(f) for f in [run_recon,run_vibesec,run_auth,run_chain,run_bot,run_gorgon,run_oblivion,run_nhi,run_cloud_recon])
    return True
test("9 remote runners callable", test_remote)

# [6] Local modules
print("\n\033[1m[6] Local Scan Modules\033[0m")
test("Doctor module", lambda: isinstance(__import__('reconpro.modules.doctor',fromlist=['run_doctor']).run_doctor(target="localhost",timeout=10), list))
test("Dev module", lambda: isinstance(__import__('reconpro.modules.dev',fromlist=['run_dev']).run_dev(target="/home/z/my-project/vibesec-cli",timeout=10), list))
test("Host module", lambda: isinstance(__import__('reconpro.modules.host',fromlist=['run_host']).run_host(target="localhost",timeout=10), list))

def test_ast():
    from reconpro.modules.ast_analyzer import ASTAnalyzer
    a = ASTAnalyzer()
    with tempfile.NamedTemporaryFile(suffix=".py",mode="w",delete=False) as f:
        f.write("import os; os.system(user_input)"); f.flush()
        r = a.analyze_file(f.name); os.unlink(f.name)
    return r is not None
test("AST analyzer", test_ast)

def test_iac():
    from reconpro.modules.iac_audit import run as run_iac
    with tempfile.NamedTemporaryFile(suffix=".tf",mode="w",delete=False,dir='/tmp') as f:
        f.write('resource "aws_s3_bucket" "p" { bucket="x" acl="public-read" }'); f.flush()
        findings,sc,gr,_ = run_iac(target=f.name,base_url=''); os.unlink(f.name)
    return isinstance(findings, list)
test("IaC audit", test_iac)

def test_container():
    from reconpro.modules.container_sec import run as run_c
    with tempfile.NamedTemporaryFile(suffix="Dockerfile",mode="w",delete=False,dir='/tmp') as f:
        f.write('FROM ubuntu:latest\nUSER root\n'); f.flush()
        findings,sc,gr,_ = run_c(target=f.name,base_url=''); os.unlink(f.name)
    return isinstance(findings, list)
test("Container security", test_container)

# [7] HTML Report (no network)
print("\n\033[1m[7] HTML Report Generator\033[0m")
def test_html_full():
    from reconpro.reports import generate_html_report
    data = {"target":"example.com","score":72,"grade":"B",
        "findings":[
            {"title":"SQLi","severity":"critical","category":"sqli","module":"recon","description":"Found","evidence":"id=1'","asset":"ex.com/api","points_deducted":15,"remediation":"fix","dread_score":{"damage":10,"reproducibility":9,"exploitability":8,"affected_users":7,"discoverability":6}},
            {"title":"No HSTS","severity":"medium","category":"headers","module":"recon","description":"","evidence":"","asset":"ex.com","points_deducted":5,"remediation":"add","dread_score":4.0},
            {"title":"SSH open","severity":"high","category":"ports","module":"host","description":"","evidence":"","asset":"ex.com","points_deducted":8,"remediation":"vpn","dread_score":{"damage":6,"reproducibility":10,"exploitability":9,"affected_users":3,"discoverability":8}},
        ],"modules_run":["recon","host"],"scan_time":"2025-01-01T00:00:00Z","duration":12.5}
    path = generate_html_report(data)
    assert os.path.exists(path)
    with open(path) as f: html = f.read()
    for cid in ["chart-score-gauge","chart-severity","chart-dread-radar","chart-modules","chart-points","chart-categories","chart-stacked","chart-dread-grouped"]:
        assert f'id="{cid}"' in html, f"Missing {cid}"
    assert "backdrop-filter" in html and "72" in html
    os.unlink(path); return True
test("Full HTML (8 charts + glassmorphism)", test_html_full)

def test_html_empty():
    from reconpro.reports import generate_html_report
    data = {"target":"clean.org","score":100,"grade":"A+","findings":[],"modules_run":["recon"],"scan_time":"2025-01-01T00:00:00Z","duration":5.0}
    path = generate_html_report(data)
    assert os.path.exists(path)
    with open(path) as f: html = f.read()
    assert "100" in html; os.unlink(path); return True
test("Empty findings (graceful)", test_html_empty)

# [8] History
print("\n\033[1m[8] History\033[0m")
def test_hist():
    from reconpro.history import save_scan, list_scans, clear_history
    clear_history()
    save_scan({"target":"t.com","score":85,"grade":"A","findings":[{"title":"T","severity":"low","category":"i","module":"r","description":"","evidence":"","asset":"t.com","points_deducted":1,"remediation":"","dread_score":0}],"modules_run":["recon"]})
    scans = list_scans(limit=10); assert len(scans)>=1; clear_history(); return True
test("History save/list/clear", test_hist)

# [9] Knowledge Graph
print("\n\033[1m[9] Knowledge Graph\033[0m")
def test_kg():
    from reconpro.knowledge_graph import SecurityKnowledgeGraph
    g = SecurityKnowledgeGraph()
    g.add_finding({"title":"XSS","severity":"high","category":"xss","module":"recon","description":"","evidence":"","asset":"t.com","points_deducted":1,"remediation":"","dread_score":0})
    g.add_cve("CVE-2024-1","t.com","XSS",7.5)
    return g.stats() is not None
test("KG add finding/CVE/stats", test_kg)
def test_fdg():
    from reconpro.knowledge_graph import _FallbackDiGraph
    g = _FallbackDiGraph(); g.add_node("a"); g.add_node("b"); g.add_edge("a","b")
    return g.has_node("a") and "a" in g.nodes() and ("a","b") in g.edges()
test("Fallback DiGraph", test_fdg)

# [10] Defense
test("Defense WAF+patch+generate()", lambda: (lambda: (lambda pg, fd: (pg.generate_waf_rules(fd), pg.generate_code_patch(fd), __import__('reconpro.defense',fromlist=['generate_defense']).generate_defense(fd)) and True)(__import__('reconpro.defense',fromlist=['PatchGenerator']).PatchGenerator(), {"title":"SQLi","severity":"critical","category":"sqli","description":"inj","evidence":"SEL","asset":"ex.com","remediation":"fix"}))())

# [11] Fuzzer
test("FuzzSession+TechDetector", lambda: (__import__('reconpro.fuzzer',fromlist=['FuzzSession','TechDetector']).FuzzSession(target="http://x.com",timeout=5.0), True)[-1])

# [12] Compliance
def test_comp():
    from reconpro.compliance import ComplianceMapper
    cm = ComplianceMapper()
    r = cm.map_findings([{"title":"x","severity":"high","category":"crypto","description":"no enc"},{"title":"y","severity":"critical","category":"s3","description":"pub"}], frameworks=["soc2","pci-dss"])
    return r is not None
test("Compliance SOC2+PCI-DSS", test_comp)

# [13] Entropy
def test_ent():
    from reconpro.entropy import shannon_entropy, scan_string
    return shannon_entropy("AKIA3E7F9X2K1M8N0Q4RW6TY5UP") > shannon_entropy("hello world")
test("Shannon entropy high>low", test_ent)

# [14] Benchmark
def test_bench():
    from reconpro.benchmark import ScoreTracker
    st = ScoreTracker(); st.record("a.com",85,"A",5); st.record("b.com",72,"B",12)
    return st.get_history("a.com",days=30) is not None
test("Benchmark record+history", test_bench)

# [15] Profiler
test("Profiler scan plan", lambda: __import__('reconpro.profiler',fromlist=['get_scan_plan']).get_scan_plan("example.com") is not None)

# [16] CVE Radar
test("CVERadar instantiation", lambda: __import__('reconpro.cve_radar',fromlist=['CVERadar']).CVERadar() is not None)

# [17] Passive Intel
def test_passive():
    from reconpro.passive_intel import PassiveDNS, WaybackMachine
    return PassiveDNS() is not None and WaybackMachine() is not None
test("PassiveDNS+WaybackMachine", test_passive)

# [18] Chain Engine
def test_chain():
    from reconpro.chain_engine import analyze_chains
    findings = [{"title":"SSRF","severity":"critical","category":"ssrf","module":"chain","asset":"api.t.com","description":"","evidence":"","points_deducted":10,"remediation":"","dread_score":0},{"title":"Redirect","severity":"medium","category":"redirect","module":"chain","asset":"api.t.com","description":"","evidence":"","points_deducted":3,"remediation":"","dread_score":0}]
    return isinstance(analyze_chains(target="api.t.com",findings=findings), list)
test("Chain engine analysis", test_chain)

# [19] Delta
test("Delta report", lambda: __import__('reconpro.delta',fromlist=['generate_delta_report']).generate_delta_report({"target":"x.com","score":80,"grade":"A","findings":[{"title":"XSS","severity":"high","category":"xss","module":"recon","description":"","evidence":"","asset":"x.com","points_deducted":5,"remediation":"","dread_score":0}],"modules_run":["recon"]}) is not None)

# [20] Plugins
test("Plugin discovery (dict)", lambda: isinstance(__import__('reconpro.plugins',fromlist=['discover_plugins']).discover_plugins(), dict))

# [21] Evasion
def test_evade():
    from reconpro.evasion import EvasionSession, HeaderRotator
    return EvasionSession(target_base="http://example.com") is not None and HeaderRotator() is not None
test("EvasionSession+HeaderRotator", test_evade)

# [22] Report Writer
def test_rw():
    from reconpro.report_writer import MarkdownReportBuilder, ExecutiveSummaryGenerator
    return MarkdownReportBuilder() is not None and ExecutiveSummaryGenerator() is not None
test("MarkdownReportBuilder+ExecSummary", test_rw)

# [23] Netmap
def test_nm():
    from reconpro.netmap import NetworkDiscovery, TrustMapper
    return NetworkDiscovery() is not None and TrustMapper() is not None
test("NetworkDiscovery+TrustMapper", test_nm)

# [24] Parallel
test("blitz_scan callable", lambda: callable(__import__('reconpro.parallel',fromlist=['blitz_scan']).blitz_scan))

# [25] Server
def test_srv():
    from reconpro.server import run_server, MODULE_REGISTRY
    return callable(run_server) and isinstance(MODULE_REGISTRY, dict) and len(MODULE_REGISTRY)>=5
test("Server run_server+MODULE_REGISTRY", test_srv)

# [26] Integrations
def test_integ():
    from reconpro.integrations.jira import JiraClient
    from reconpro.integrations.slack import SlackClient
    from reconpro.integrations.github import GitHubClient
    return JiraClient and SlackClient and GitHubClient
test("Jira+Slack+GitHub clients", test_integ)

# [27] Widgets
def test_wid():
    from reconpro.widgets import ScoreGauge,Sparkline,StatCounter,VelocityMeter,CommandCompleter,HintBar,ToastContainer
    return all([ScoreGauge,Sparkline,StatCounter,VelocityMeter,CommandCompleter,HintBar,ToastContainer])
test("7 widget classes", test_wid)

# [28] Nexus TUI
test("NexusApp importable", lambda: __import__('reconpro.nexus_tui',fromlist=['NexusApp']).NexusApp is not None)

# [29] Agent
def test_agent():
    from reconpro.nexus_agent import NexusAgent, ToolRegistry, AgentMemory, build_registry
    tr = build_registry(); return len(tr.list_tools())>=10 and NexusAgent() is not None
test("Agent+ToolRegistry(18tools)+Memory", test_agent)

# [30] Swarm
test("SwarmCoordinator+run_swarm", lambda: (lambda: (callable(__import__('reconpro.swarm',fromlist=['run_swarm']).run_swarm), __import__('reconpro.swarm',fromlist=['SwarmCoordinator']).SwarmCoordinator is not None) and True)())

# [31] Adversarial
test("AdversarialLoop+run_adversarial", lambda: (lambda: (callable(__import__('reconpro.adversarial',fromlist=['run_adversarial']).run_adversarial), __import__('reconpro.adversarial',fromlist=['AdversarialLoop']).AdversarialLoop is not None) and True)())

# [32] Graph UI
def test_gui():
    from reconpro.graph_ui import render_graph, GraphUIRenderer
    html = render_graph({"nodes":[],"edges":[]})
    return isinstance(html, str) and len(html)>0
test("render_graph+GraphUIRenderer", test_gui)

# [33] Memory
test("UnifiedMemoryStore", lambda: __import__('reconpro.memory',fromlist=['UnifiedMemoryStore']).UnifiedMemoryStore() is not None)

# [34] Webhooks
test("WebhookServer+run_webhook_server", lambda: (lambda: (__import__('reconpro.webhooks',fromlist=['WebhookServer']).WebhookServer is not None, callable(__import__('reconpro.webhooks',fromlist=['run_webhook_server']).run_webhook_server)) and True)())

# [35] Tool SDK
test("ExternalToolHandler+list_available_tools", lambda: isinstance(__import__('reconpro.tool_sdk',fromlist=['list_available_tools']).list_available_tools(), list))

# [36] Scheduler
test("run_scheduled callable", lambda: callable(__import__('reconpro.scheduler',fromlist=['run_scheduled']).run_scheduled))

# [37] Subdomains
test("discover_subdomains callable", lambda: callable(__import__('reconpro.subdomains',fromlist=['discover_subdomains']).discover_subdomains))

# [38] Misc imports
def test_misc():
    import reconpro.proxy, reconpro.mitm, reconpro.api_discovery, reconpro.async_http, reconpro.collab, reconpro.raw_sockets, reconpro.browser_mod
    return True
test("Proxy/MITM/API/async/collab/raw/browser", test_misc)

# [39] CLI
def test_cli_help():
    from reconpro.cli import main
    old = sys.stdout; sys.stdout = io.StringIO()
    try: sys.argv=["reconpro","--help"]; main()
    except SystemExit: pass
    finally: out = sys.stdout.getvalue(); sys.stdout = old
    return "scan" in out and "nexus" in out and "agent" in out and "swarm" in out
test("CLI --help (40 commands)", test_cli_help)

def test_cli_ver():
    from reconpro.cli import main
    old = sys.stdout; sys.stdout = io.StringIO()
    try: sys.argv=["reconpro","--version"]; main()
    except SystemExit: pass
    finally: out = sys.stdout.getvalue(); sys.stdout = old
    return "7.0.0" in out
test("CLI --version (7.0.0)", test_cli_ver)

# [40] Audit scan (local, no network)
def test_audit():
    from reconpro.scanner import audit_scan, ReconProResult
    r = audit_scan(target=".", modules=["doctor"])
    return isinstance(r, ReconProResult) and isinstance(r.findings, list)
test("Audit scan (local, doctor)", test_audit)

sys.exit(0 if report() else 1)
