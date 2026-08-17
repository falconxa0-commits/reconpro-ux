#!/usr/bin/env bash
# ReconPro v11.0.0 — Typical Workflow

# 1. Quick scan
reconpro example.com

# 2. Full JSON output for processing
reconpro example.com --json > scan-results.json

# 3. Audit your machine
reconpro audit

# 4. Developer check
reconpro dev

# 5. Generate HTML report
reconpro report example.com -o report.html

# 6. Parallel multi-target
reconpro blitz target1.com target2.com target3.com

# 7. Interactive mode
reconpro chat

# 8. Visual dashboard
reconpro nexus

# 9. Engineering pipeline
reconpro engineering

# 10. Schedule recurring scan
reconpro schedule add daily-scan "0 9 * * *" -- target.com
