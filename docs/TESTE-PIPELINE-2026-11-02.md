# Teste do pipeline — 02/11/2026

Registro histórico da implementação inicial. Para o código atual e suas pendências, consulte `STATUS-IMPLEMENTACAO.md`; este teste não comprova a cobertura integral dos prompts.

Núcleo em `tools/reels_pipeline.py`: FFprobe, transcrição opcional com faster-whisper/Whisper, legendas ASS e render vertical com FFmpeg. `tools/create_test_media.ps1` gera mídia sintética, executa o pipeline e valida o MP4.

Verificado: FFmpeg 9.0.1, FFprobe, Python 3.12, `whisper`, `faster_whisper` e `torch`; Node/npm; Remotion 4.0.540 com CLI, bundler e renderer.

O teste inicial usa mídia sintética e transcript fixture; não comprova transcrição de pregação real. A composição Remotion agora cobre vídeo vertical, cortes por segmentos, legendas, título animado, zoom, grid opcional e áudio. EDL editorial automático, revisão humana, rastreamento de rosto e motion graphics específicos por sermão ainda são etapas futuras. Arial é fallback de teste.

Render Remotion validado: `output/remotion-demo.mp4`, H.264/AAC, 1080×1920, 5,013 s, áudio estéreo 48 kHz. O arquivo é ignorado pelo Git; os dados de validação ficam registrados nesta documentação.
