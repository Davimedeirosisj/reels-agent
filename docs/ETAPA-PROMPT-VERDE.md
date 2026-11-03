# Reedição orientada pelo JSON do usuário — 03/11/2026

Uma nova edição de 70,3 segundos foi renderizada a partir da direção fornecida pelo usuário: preto, verde/ciano, cards de borda fina, tipografia cinética e gráficos conceituais. A entrega inclui MP4 1080×1920/30fps, capa, SRT/VTT e projeto com voz, música e efeitos em trilhas separadas.

Foram aplicadas 13 composições próprias: abertura gráfica sobre a voz original, comparação em cards, ícones de linha, diagramas progressivos, um insert educativo em tela cheia e encerramento reflexivo. A entrada/saída do vídeo em um painel preserva a imagem inteira para reservar espaço aos gráficos. A câmera alterna aproximações de até 5,5%, reduzidas nos momentos em que as amostras do original já atingem a borda. As legendas têm slide de 8px e escala de até 1,08 nas palavras-chave, em até duas linhas.

O arco da fala e sua ressalva permanecem em ordem cronológica. Seis cortes retiram somente pausas já medidas. Não foram acrescentadas estatísticas, falas sintéticas, versículos ou reconstruções do rosto. O começo da fonte já corta parte do rosto; a abertura gráfica cobre esse momento sobre o áudio original, sem congelar lábios ou sintetizar imagem.

## Evidências

- MP4: 2109 frames, H.264/BT.709/yuv420p; áudio AAC estéreo/48kHz; decodificação integral aprovada.
- Áudio final: **−15,95 LUFS**, pico real **−1,94 dBTP**.
- Comparação da mixagem em 36 janelas contíguas: correlação mínima **0,967547**, atraso **0ms**.
- **20 efeitos sonoros** originais verificados no áudio exportado, correlação residual mínima **0,899749** na banda abaixo de 7kHz.
- Trilha instrumental original identificada independentemente, correlação residual **0,985178**; envelope de ducking entre 0,052 e 0,085.
- 104 entradas de palavras ASR preservadas; 41 páginas de legenda. A procedência permanece Whisper large-v3 medido anteriormente na mesma fonte.
- Localização facial no MP4: 265 amostras, 203 com detecção. Um falso rosto sobre braço/legenda no frame 312 foi inspecionado visualmente pelo agente e registrado como falso positivo; os demais retângulos não conflitam com os gráficos. Inserts intencionais em tela cheia são excluídos dessa análise de sobreposição. Não há prova contínua entre amostras.
- 76 testes JavaScript passaram. A execução integral comprova esta montagem e seus componentes utilizados, sem declarar cobertura de toda a biblioteca.

SHA-256 da entrega: `1fe8ec4c3feac9d703a12476db997a877d871f5beeb36bba1a3a8ec35b6bffe6`.

As medidas e o fingerprint estão em [validation/prompt-green-results.json](validation/prompt-green-results.json). O MP4 entregue é uma cópia idêntica por hash do render revisado, sem nova compressão; o recibo delegado foi aceito por `approve`. `humanReviewed` permanece `false`. A revisão do agente e as verificações técnicas não atestam escuta humana ou certificação teológica.

## Código e procedência

`TechGraphic` implementa a direção como uma opção de `blueprint` com `design: pastoral-tech`. As opções de painel, vinheta e fundo são ativadas pelo tema; a animação das legendas é opcional. As composições antigas continuam usando seus valores anteriores quando essas opções estão ausentes.

Foram consultados os originais [PMV-093, @itsuki_dev](https://prompt-motion.com/itsuki-dev-10942d) e [PMV-123, @m1n9_k7](https://prompt-motion.com/m1n9-k7-ff9ab9) como repertório. A direção principal é o prompt do usuário; os ícones, componentes, trilha e efeitos são próprios. Não há alegação de reprodução integral dessas referências ou de uso dos 100 prompts da lista.

Mídia, transcrição, quadros, prompt fornecido e recibo completo ficam locais. Os arquivos do projeto incluem configuração, eventos gráficos, legendas editáveis, assets e três stems anteriores à normalização final conjunta. O vídeo fonte continua externo. O script local `renderizar.ps1` ajusta os caminhos dos assets ao extrair o pacote e gera uma nova prévia; alterações exigem nova validação.
