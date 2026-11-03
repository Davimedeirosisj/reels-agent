# Entrega de uma edição real — 03/11/2026

Foi entregue um MP4 de uma pregação fornecida pelo usuário, com aproximadamente **2min18s**, em **1080×1920/30 fps**, H.264/BT.709/yuv420p e áudio AAC estéreo de 48 kHz. Esta etapa conclui a edição solicitada desse vídeo; a cobertura integral de todas as referências continua sendo outro escopo.

O projeto combina título, 12 destaques gráficos contextuais, oito ajustes de pausas, três transições curtas de zoom e 12 entradas de efeitos sonoros procedurais originais. Mantém a sequência da fala e a ressalva do pregador. A direção usa tipografia branca/dourada e o enquadramento original. Foram consultados os originais [PMV-093, @itsuki_dev](https://prompt-motion.com/itsuki-dev-10942d) e [PMV-123, @m1n9_k7](https://prompt-motion.com/m1n9-k7-ff9ab9) como repertório de tipografia cinética, sem alegação de reprodução exata.

## Verificação da entrega

- **4133 frames**, vídeo de 137,7667s e arquivo de 137,8s com o áudio AAC; decodificação integral aprovada.
- SHA-256 do MP4: `455fca9a11a3b63f0f7aaac37d4a4752ef8e8b17b6e089ba22a09cca990dda88`.
- Mixagem final: **−16,06 LUFS**, pico real **−1,83 dBTP**; sem clipping detectado.
- Os cortes retiram **6,2333s** de centros de pausas medidas. O maior pico dos trechos retirados foi −38,0958 dBFS na medição mono de 16 kHz.
- Whisper **large-v3**, local/CUDA: 238 palavras, preservadas na mesma ordem, 74 páginas de até duas linhas. Duas correções ortográficas documentadas localmente; nenhuma fala foi reordenada.
- Comparação em janelas contíguas cobrindo a linha do tempo: 69 janelas, 68 com energia de voz suficiente e uma de energia baixa explicitamente separada. Correlação mínima das janelas comparadas **0,9798059**, atraso **0ms**. A referência inclui a EDL original e os efeitos conhecidos.
- Os **12 efeitos** foram detectados no áudio exportado, na banda comum abaixo de 7 kHz. Correlação residual mínima **0,851911**, sem reduzir os limiares do ensaio.
- Inspeção de 13 quadros do compositor e seis quadros decodificados do MP4. Localização facial: 518 amostras, 490 com detecção e nenhum conflito com os retângulos declarados de gráficos/legendas. Permanecem 36 intervalos desconhecidos, sem garantia entre amostras.
- **76 testes JavaScript** e **quatro testes específicos de comparação de áudio** passaram nesta etapa. Não se afirma uma nova execução de toda a suíte Python ou de todos os efeitos 3D.

As medidas e vínculos estão em [validation/final-sermon-edit-results.json](validation/final-sermon-edit-results.json). Mídia, transcrição, SRT/WebVTT, quadros e recibo detalhado permanecem locais.

## Ajustes encontrados na execução

`MotionLibrary` passou a respeitar `fontFamily` nos eventos tipográficos. Transições `zoom-transition` sem texto movimentam a câmera sem desenhar um retângulo vazio. Os casos com texto mantêm a apresentação anterior.

A comparação antiga a 16 kHz introduzia arredondamento fracionário nas junções de uma EDL a 30 fps, produzindo divergências artificiais principalmente nas frequências altas. O verificador passou a usar **48 kHz**, exatamente 1600 amostras por frame a 30 fps. Uma regressão física com WAV e montagem independente por amostras no FFmpeg confirma a correção. Esse ajuste afeta a medição, sem alterar o render entregue. A verificação dos ruídos procedurais também considera a banda comum preservada pelo AAC, sem exigir identidade no espectro descartado pelo codec.

## Revisão e limites

O usuário delegou a finalização e a entrega ao agente. A revisão foi registrada como **revisão do agente**, vinculada à EDL, mídia, composição e bytes do MP4; `humanReviewed` permanece `false`. Não há escuta humana ou certificação teológica atestada. ASR pode conter erros de grafia/tempo; localização facial é amostral; o enquadramento original já aproxima o sujeito das bordas em alguns momentos.

A entrega final é uma cópia **idêntica por SHA-256** do render normalizado que foi revisado, acompanhada de SRT/WebVTT e relatório. O comando `approve` aceitou o recibo delegado. Não se afirma uma segunda renderização pelo comando `final`, e não houve nova compressão após a revisão. O fingerprint do render é `db949b740f35260f29b35527315c41e717a05f6af6b72d20332f11ccb87577c7`, no esquema `normalized-source-and-lock-v2`.
