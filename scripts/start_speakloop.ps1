$ErrorActionPreference = 'Stop'
$speakRoot = Split-Path -Parent $PSScriptRoot
$speakPreviousLocation = Get-Location
try {
    Set-Location -LiteralPath $speakRoot
    if (-not (Test-Path -LiteralPath 'frontend\dist\index.html')) {
        Push-Location -LiteralPath 'frontend'
        try {
            & npm.cmd ci
            if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
            & npm.cmd run build
            if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
        } finally { Pop-Location }
    }
    if (-not (Test-Path -LiteralPath '.local\lesson-audio\manifest.json')) {
        & uv sync --group asr
        if ($LASTEXITCODE -ne 0) { throw 'Python dependency setup failed.' }
        & (Join-Path $PSScriptRoot 'prepare_lesson_audio.ps1')
    }
    Write-Output 'SpeakLoop: http://127.0.0.1:8765 (Ctrl+C to stop)'
    & uv run --group asr uvicorn speakloop.server:app --host 127.0.0.1 --port 8765
    if ($LASTEXITCODE -ne 0) { throw 'SpeakLoop server stopped with an error.' }
} finally { Set-Location -LiteralPath $speakPreviousLocation }
