param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$speakRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $speakRoot '.local\lesson-audio' }
$speakPython = Join-Path $speakRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $speakPython)) { throw 'Run uv sync first.' }
Add-Type -AssemblyName System.Speech
$speakTokens = & $speakPython -c 'import json; from speakloop.lesson import audio_registry; print(json.dumps(audio_registry()))' | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Could not load lesson audio registry.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$speakFormat = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$speakSynth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$speakAssets = @()
try {
    foreach ($speakToken in $speakTokens.PSObject.Properties) {
        $speakPath = Join-Path $OutputDirectory ($speakToken.Name + '.wav')
        $speakSynth.SelectVoice($speakToken.Value.voice)
        $speakSynth.Rate = $speakToken.Value.rate
        $speakSynth.SetOutputToWaveFile($speakPath, $speakFormat)
        $speakSynth.Speak($speakToken.Value.text)
        $speakSynth.SetOutputToNull()
        $speakAssets += [pscustomobject]@{id=$speakToken.Name; voice=$speakToken.Value.voice; sha256=(Get-FileHash -LiteralPath $speakPath -Algorithm SHA256).Hash.ToLowerInvariant(); reviewed=$false}
    }
} finally { $speakSynth.Dispose() }
[pscustomobject]@{generator='Windows System.Speech'; generated_at=[DateTime]::UtcNow.ToString('o'); reviewed=$false; assets=$speakAssets} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'manifest.json') -Encoding utf8
Write-Output ('Generated {0} offline reference clips. Human pronunciation review is still pending.' -f $speakAssets.Count)
