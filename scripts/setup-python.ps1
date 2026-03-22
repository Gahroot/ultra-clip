# setup-python.ps1 — Create the Python venv and install requirements for batchcontent.
# Run from the project root: .\scripts\setup-python.ps1
#
# Requires Python 3.10+ on PATH.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonDir = Join-Path $ScriptDir "..\python"

Push-Location $PythonDir

try {
    Write-Host "[setup-python] Creating virtual environment..."
    python -m venv venv

    Write-Host "[setup-python] Upgrading pip..."
    & ".\venv\Scripts\pip.exe" install --upgrade pip

    Write-Host "[setup-python] Installing requirements..."
    # nemo_toolkit[asr] has heavy GPU/CUDA dependencies.
    # On a CPU-only machine warnings about missing CUDA are expected — install will still succeed.
    & ".\venv\Scripts\pip.exe" install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Warning ""
        Write-Warning "============================================================"
        Write-Warning "WARNING: One or more packages failed to install."
        Write-Warning "This is often due to CUDA/GPU driver requirements for NeMo."
        Write-Warning "Try installing manually:"
        Write-Warning "  pip install nemo_toolkit[asr] mediapipe opencv-python-headless numpy yt-dlp"
        Write-Warning "============================================================"
        exit 1
    }

    Write-Host ""
    Write-Host "[setup-python] Done! Python environment ready at: $PythonDir\venv"
}
finally {
    Pop-Location
}
