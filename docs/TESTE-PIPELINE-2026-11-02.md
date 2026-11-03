# Teste do pipeline — 02/11/2026

Núcleo em `tools/reels_pipeline.py`: FFprobe, transcrição opcional com faster-whisper/Whisper, legendas ASS e render vertical com FFmpeg. `tools/create_test_media.ps1` gera mídia sintética, executa o pipeline e valida o MP4.

Verificado: FFmpeg 9.0.1, FFprobe, Python 3.12, `whisper`, `faster_whisper` e `torch`; Node/npm. Remotion não instalado.

Limitações: teste com mídia sintética e transcript fixture; não comprova transcrição de pregação real. EDL editorial, revisão humana, rastreamento de rosto, punch-ins e motion graphics ainda faltam. Arial é fallback de teste.
