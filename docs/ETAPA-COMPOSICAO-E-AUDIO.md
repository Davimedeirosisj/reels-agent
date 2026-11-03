# Composição e áudio — 02/11/2026

## Implementação e resultados

- 48 componentes visuais renderizados em galeria de 86,4s / 2592 frames, H.264/AAC, 1080×1920, yuv420p, BT.709. Contatos inspecionados após corrigir clipping no blueprint e diferenciar timeline/conexões.
- Prévia com três cortes: 9,685s; vídeo de 290 frames. Pico -2,2 dBFS; média -18,5 dBFS após normalização em duas passagens.
- Cortes verificados por cor e frequência: vermelho/440 Hz → azul/878,33 Hz; intervalo verde/660 Hz removido.
- B-roll de vídeo verificado com relógios locais independentes: vermelho seguido de verde, sobre fundo azul. Isso detecta uso indevido do tempo global no segundo item.
- Ducking verificado no áudio exportado: amplitude do componente de música a 220 Hz passou de aproximadamente 0,00648 durante a fala para 0,03737 fora dela (5,77×). A trilha de fala permanece separada de B-roll mutado.
- 26 testes JavaScript e 8 testes Python passaram, incluindo decodificação WAV real e inferência do modelo MediaPipe. Os testes de recorte usaram fundo vazio/mascaras analíticas, não um pastor real.
- A análise da narração encontrou pausas de 3,06–6,15s e 8,65–11,74s. São candidatos revisáveis; o analisador não remove fala. A sincronia de efeitos altera apenas entradas visuais explicitamente marcadas com `syncToBeat`.

As receitas de transição geométrica, passagem por objeto autorizado, camadas escalonadas, type wipe, zoom entre cortes, isometria, split screen, sequência de imagens, montagem por tópicos e profundidade agora têm comportamentos próprios. As operações de legenda, câmera e áudio configuram as respectivas etapas; não fingem ser overlays.

## Operações por prompt

`operations` aceita objetos com `recipeId`. Exemplos: `A041` configura legendas por palavra; `A025`/`A030`/`A086` configuram `keys` de câmera em um `clip`; `A092` ativa loudnorm; `A094` habilita guias na prévia; `A100` configura exportação. Os overlays podem usar `recipeId` em `motions`. As receitas parciais continuam identificadas em `COBERTURA.md`.

Para medir áudio: `python tools/audio_analysis.py INPUT output/audio-analysis.json`. Copie o resultado para `rhythm.sourceAnalysis[CAMINHO_DA_MIDIA]`. Batidas da edição também podem ser fornecidas em `rhythm.beats`. `A014` sugere somente candidatos em pausas entre frases completas; `A091` alinha entradas visuais optantes. Ambos exigem revisão editorial.

## Recorte de pessoas e licença

Ferramenta: `python tools/segment_subject.py INPUT_CFR_EDITADO output/foreground.webm`. O vídeo de entrada deve estar montado e enquadrado exatamente como a edição final. A saída WebM VP9 com alpha não tem áudio; `foregroundSrc` usa a fala original no vídeo base. O JSON registra bounding boxes, quadros vazios, cobertura e revisão obrigatória. A integração automática de preparo da entrada ainda está pendente.

Modelo oficial: [SelfieSegmenter](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/index). Licença Apache-2.0 conforme o [model card oficial](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf). Peso usado: SHA-256 `191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b`. Os pesos ficam em `cache/models/`, ignorados pelo Git.

O modelo é destinado a pessoas próximas à câmera. Pessoas distantes, vários participantes, dedos, objetos na mão e bordas da Bíblia precisam de conferência. Máscara vazia é rejeitada; `--allow-empty` é exclusivo de fixtures técnicos. Não houve reconhecimento de identidade nem validação de um culto.

## Evidências

`docs/validation/render-results.json` guarda os hashes dos MP4 e os resultados numéricos. `component-intervals.json` identifica o intervalo de cada componente. O fingerprint da composição da prévia é comparado com o código antes de registrar evidência. A decodificação integral, duração, frames, codecs e pixel format são verificados.

O incidente anterior de limite de uso foi superado e os renders desta etapa foram executados. O objetivo completo continua ativo: há receitas parciais, fonte externa sem autoria individual revisada, modelos/visuais específicos e a revisão de pregação real a concluir.
