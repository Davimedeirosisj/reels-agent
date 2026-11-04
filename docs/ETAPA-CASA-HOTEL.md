# Casa Hotel — produção e validação · 04/11/2026

A pré-produção aprovada foi executada em um MP4 de 63.367s, 1080×1920 a 60 fps. A composição contém 13 eventos gráficos, duas inserções Three.js de uma casa procedural e três inserções ilustradas próprias de mesa/livro. Voz original, trilha sintetizada com ducking e 15 entradas de efeitos foram conferidas no arquivo exportado.

## Resultado observado

- 3802 frames, H.264/BT.709/yuv420p, AAC estéreo 48 kHz; decodificação integral aprovada.
- 149 palavras em 43 páginas, com ordem cronológica preservada e até duas linhas medidas pelo compositor. Permanecem 23 alertas de leitura rápida acompanhando a cadência da fonte; a nova divisão removeu páginas isoladas de aproximadamente 0,12s, mas não certifica acessibilidade integral.
- Áudio final: -15.79 LUFS e -1.27 dBTP. Comparação em 32 janelas contíguas: correlação mínima 0.992072, atraso máximo 0ms.
- Todos os 15 SFX identificados na mixagem; correlação residual mínima 0.888398 na banda de comparação abaixo de 7kHz. Trilha identificada independentemente: correlação 0.945298.
- 160 amostras faciais no MP4, 141 com detecção e 0 conflitos com as áreas gráficas verificadas. Inserts ilustrados/3D intencionais excluídos. Inspeção visual de 24 quadros codificados; cobertura entre amostras não comprovada.
- 81 testes JavaScript passaram. O MP4 entregue é byte a byte igual ao render revisado, sem segunda compressão. Recibo de revisão do agente aceito pelo motor; humanReviewed permanece false.

SHA-256: 1a55e38fbe41d62fbea6671ad61e36ab044ccbb2a9ad4e5b616302bcf5bc7161.

Agregados e fingerprint: [validation/casa-hotel-results.json](validation/casa-hotel-results.json). Mídia, legendas, transcrição, configurações com conteúdo da pregação e quadros permanecem locais.

## Implementação reutilizável

CasaHotelGraphic é uma direção opcional, ativada por design: casa-hotel em blueprint ou product3d. Oferece abertura, planta progressiva, cômodos, ação, descanso, proteção, mesa e livro. HouseScene constrói mobiliário, cômodos, telhado, câmera, luzes e sombras em Three.js; a separação e a reunião são calculadas por frame, com tempo em segundos. A cena exige origem contextual explícita.

graphicWindows aceita escala, deslocamento vertical e duração de transição por evento. Legendas aceitam enterSeconds e impactSeconds para manter a duração em diferentes taxas de quadros; gapFrames controla a pausa que separa páginas. Valores antigos continuam como padrão quando essas opções não são fornecidas.

Foi corrigida a perda de palavras ASR sem duração no fim natural de um segmento: o texto passa a permanecer na página adjacente, desde que esteja dentro do corte mantido. O limite exclusivo do corte continua respeitado. Um teste reproduz o caso a 60 fps e rejeita sua inclusão além da borda.

## Decisões e limites

A direção segue a pré-produção v3 e o JSON local fornecido pelo usuário. Foram consultadas como repertório as publicações [gdgtify](https://prompt-motion.com/gdgtify-287ddf), [Motif](https://createmotion.io/motions/x-2105570411870130294/) e [itsuki_dev](https://prompt-motion.com/itsuki-dev-10942d). Geometria, ilustrações e sons são próprios; não se afirma reprodução integral das referências.

O corte ganhou 0,20s na entrada e recuperou 0,25s antes da terceira pausa. As páginas de legenda foram divididas por sentido para preservar negações e complementos. A nova divisão mantém os mesmos timestamps de palavras. O fallback de B-roll ilustrado foi usado; não há filmagem de mãos/família. As transições aplicadas são mudanças de escala, posição e opacidade; a passagem de parede sugerida no plano não foi implementada nesta entrega.

A transcrição foi conferida com alinhamento e uma segunda passagem ASR local; isso não equivale a escuta humana. A revisão do agente preserva as limitações de ASR e de enquadramento já presentes na fonte. Three.js emitiu avisos de Clock obsoleto e fallback de sombra PCFSoft para PCF, sem falha de render. O conjunto de dependências e o fingerprint estão vinculados ao render validado.

O pacote local inclui projeto editável, prompt, configuração de gráficos, SRT/WebVTT, três trilhas anteriores à normalização conjunta e um script de nova prévia. O vídeo original permanece externo. Esta entrega comprova esta edição; não conclui todas as receitas ou referências da biblioteca.
