# ReconPro v11.0.0 - Windows Install
Write-Host "ReconPro v11.0.0" -ForegroundColor Cyan
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) { $python = $cmd; break }
}
if (-not $python) { Write-Host "ERROR: Python 3.8+" -ForegroundColor Red; exit 1 }
if (-not (Test-Path ".venv")) { &$python -m venv .venv }
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install reconpro-11.0.0-py3-none-any.whl
reconpro --version
