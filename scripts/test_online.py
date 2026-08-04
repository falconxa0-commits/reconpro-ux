"""ReconPro v7.0.0 — Online tests (network required)."""
import sys, os, json, tempfile, time
sys.path.insert(0, "/home/z/my-project/vibesec-cli")

results = []
def test(name, fn, timeout=60):
    start = time.time()
    try:
        result = fn(); dur = time.time() - start
        results.append((name, "PASS", "OK", dur))
        print(f"  [\033[92mPASS\033[0m] {name} ({dur:.1f}s)")
        return True
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
        print(f"\n\033[92mALL ONLINE TESTS PASSED\033[0m")
    print(f"{'='*70}")
    return f==0

print("\n\033[1m=== ReconPro v7.0.0 — Online Tests (network) ===\033[0m\n")

# [1] Live scan
print("\033[1m[1] Live Remote Scan\033[0m")
def test_scan_live():
    from reconpro.scanner import scan, ReconProResult
    r = scan("https://httpbin.org", modules=["recon"], timeout=20)
    assert isinstance(r, ReconProResult)
    assert 0 <= r.total_score <= 100
    assert isinstance(r.findings, list)
    assert r.grade in ["A+","A","B","C","D","F"]
    assert len(r.modules_run) >= 1
    return True
test("Scan https://httpbin.org (recon)", test_scan_live, timeout=60)

# [2] Export all formats from live scan
def get_live_result():
    from reconpro.scanner import scan
    return scan("https://httpbin.org", modules=["recon"], timeout=20)

print("\033[1m[2] Export Formats (live data)\033[0m")

def test_export_json():
    from reconpro.formats import export_json
    data = get_live_result()
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f: path = f.name
    try:
        export_json(data, path)
        with open(path) as fp: loaded = json.load(fp)
        assert "findings" in loaded or "total_score" in loaded
        return True
    finally: os.unlink(path)
test("JSON export", test_export_json, timeout=60)

def test_export_sarif():
    from reconpro.formats import export_sarif
    data = get_live_result()
    with tempfile.NamedTemporaryFile(suffix=".sarif", delete=False) as f: path = f.name
    try:
        export_sarif(data, path)
        with open(path) as fp: loaded = json.load(fp)
        assert "runs" in loaded
        return True
    finally: os.unlink(path)
test("SARIF 2.1.0 export", test_export_sarif, timeout=60)

def test_export_markdown():
    from reconpro.formats import export_markdown
    data = get_live_result()
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w") as f: path = f.name
    try:
        export_markdown(data, path)
        with open(path) as fp: content = fp.read()
        assert len(content) > 100
        return True
    finally: os.unlink(path)
test("Markdown export", test_export_markdown, timeout=60)

def test_export_html():
    from reconpro.formats import export_html
    data = get_live_result()
    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w") as f: path = f.name
    try:
        export_html(data, path)
        with open(path) as fp: content = fp.read()
        assert "<html" in content.lower() or "chart" in content.lower()
        return True
    finally: os.unlink(path)
test("HTML export (Chart.js)", test_export_html, timeout=60)

def test_export_pdf():
    from reconpro.formats import export_pdf
    data = get_live_result()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False, mode="w") as f: path = f.name
    try:
        export_pdf(data, path)
        with open(path) as fp: content = fp.read()
        assert "<html" in content.lower() or "@media" in content
        return True
    finally: os.unlink(path)
test("PDF (print-ready) export", test_export_pdf, timeout=60)

def test_export_autodetect():
    from reconpro.formats import export
    data = get_live_result()
    for ext in [".json", ".sarif", ".md", ".html"]:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f: path = f.name
        try:
            export(data, path)
            assert os.path.exists(path) and os.path.getsize(path) > 0
        finally: os.unlink(path)
    return True
test("Auto-detect by extension", test_export_autodetect, timeout=90)

# [3] HTML report from live scan
print("\033[1m[3] HTML Report from Live Scan\033[0m")
def test_html_live():
    from reconpro.scanner import scan
    from reconpro.reports import generate_html_report
    r = scan("https://httpbin.org", modules=["recon"], timeout=20)
    data = {
        "target": r.target, "score": r.total_score, "grade": r.grade,
        "findings": r.findings, "modules_run": r.modules_run,
        "scan_time": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "duration": 5.0
    }
    path = generate_html_report(data)
    assert os.path.exists(path)
    with open(path) as f: html = f.read()
    assert str(r.total_score) in html
    assert "backdrop-filter" in html
    os.unlink(path)
    return True
test("Live HTML report with charts", test_html_live, timeout=60)

sys.exit(0 if report() else 1)
