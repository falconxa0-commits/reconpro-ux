# ReconPro v11.0.0 INFERNO — Windows Installation
Write-Host "ReconPro v11.0.0 INFERNO — Installation" -ForegroundColor Cyan

$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $python = $cmd
        break
    }
}

if (-not $python) {
    Write-Host "ERROR: Python 3.8+ required." -ForegroundColor Red
    exit 1
}

Write-Host "Using: $python ($(&$python --version 2>&1))"

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..."
    &$python -m venv .venv
}

Write-Host "Installing ReconPro..."
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install reconpro-11.0.0-py3-none-any.whl

Write-Host ""
reconpro --version
Write-Host "Installation complete." -ForegroundColor Green
