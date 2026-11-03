$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path -Parent $PSScriptRoot
$demoPublic = Join-Path $demoRoot 'public'
Add-Type -AssemblyName System.Speech
$demoSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$demoSynth.SetOutputToWaveFile((Join-Path $demoPublic 'demo-voice.wav'))
$demoSynth.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">This is a demonstration of the Reels Agent editing engine.<break time="2200ms"/>The original words and their order must be preserved.<break time="2200ms"/>Visual effects should help the message and keep the speaker visible.</speak>')
$demoSynth.Dispose()
ffmpeg -y -hide_banner -loglevel error -f lavfi -i 'testsrc2=size=720x1280:rate=30' -i (Join-Path $demoPublic 'demo-voice.wav') -c:v libx264 -preset veryfast -crf 25 -c:a aac -b:a 160k -shortest (Join-Path $demoPublic 'demo-input.mp4')
if ($LASTEXITCODE -ne 0) { throw 'Synthetic source generation failed' }
python (Join-Path $PSScriptRoot 'transcribe.py') (Join-Path $demoPublic 'demo-voice.wav') (Join-Path $demoPublic 'demo-transcript.json') --backend whisper --model tiny --language en
if ($LASTEXITCODE -ne 0) { throw 'Local transcription failed' }
node (Join-Path $PSScriptRoot 'demo_jobs.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Demo preparation failed' }
