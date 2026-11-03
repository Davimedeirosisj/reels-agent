# Pregação real, componentes educacionais e curadoria — 03/11/2026

Registro da primeira validação real. A versão posterior acrescenta duas linhas medidas, editor de legendas e cenas Three.js; veja [Cor, 3D e revisão](ETAPA-COR-3D-E-REVISAO.md) para o estado mais recente.

## Entrega testada

O usuário autorizou uma gravação real de aproximadamente 2min24s. Foi gerada uma prévia completa em Remotion, com título, quatro ênfases tipográficas, legendas alinhadas pelo Whisper small em português e áudio normalizado em duas passagens. Nenhum trecho foi retirado, reordenado ou redublado; não foi adicionada música. O enquadramento vertical de origem foi mantido com `contain`.

O arquivo foi decodificado integralmente com FFmpeg. O relatório técnico verifica H.264/AAC, 1080×1920, 30 fps, 4321 frames, yuv420p/BT.709, duração e ausência de clipping no pico amostral. `validation/real-sermon-results.json` guarda SHA-256, medidas e limites; não inclui caminho, fala, imagem ou transcrição da gravação.

A voz exportada foi comparada com a EDL em nove janelas de quatro segundos. A comparação mede correlação de forma de onda e atraso, mesmo após alteração de ganho. Ela não comprova cada palavra nem fidelidade semântica de toda a fala. Escuta e revisão humana continuam necessárias.

Resultado da prévia corrigida: 144,1s no contêiner; pico amostral -1,3 dBFS; loudness medido no AAC final -16,05 LUFS e true peak -1,27 dBTP. Correlação mínima das nove amostras: 0,9857; atraso máximo detectado: 0ms. Todas as palavras da transcrição alinhada foram preservadas nas páginas de legenda. Há dez alertas de leitura rápida a revisar.

## Erro encontrado e corrigido

O Whisper produziu palavras com duração zero. O motor descartava essas palavras ao converter para frames, omitindo texto nas legendas. A correção mantém os tokens na página adjacente sem fabricar duração ou destaque. Um teste cobre preservação em modo karaoke e por palavra, incluindo tokens finais sem duração. A prévia e os testes de exportação foram repetidos após a correção.

Há trechos de ASR duvidosos e alertas de leitura rápida. Duas correções ortográficas propostas estão registradas somente no job local e não equivalem a revisão humana. O arquivo permanece **prévia**, com `editorialApproval: false`; não foi criado `final.mp4` aprovado.

## Novos componentes e fontes

- Fluxograma dirigido com ramificações e convergências; ciclos exigem rede ou posições explícitas.
- Rede de relações com conexões fornecidas, sem criar causalidade.
- Pergunta e resposta com revelação no tempo anotado; o planejador usa trechos literais indicados.
- Interface visual com selecionar, digitar e marcar, calculada por frame sem executar ações externas.
- Termo e definição com origem explícita, sem paráfrase doutrinária automática.

A galeria tem 53 componentes / 2862 frames. Ela comprova renderização das técnicas próprias, não reprodução de cada exemplo externo. As regressões de cortes, B-roll e ducking também foram repetidas.

A curadoria verificou 124 publicações Prompt Motion com 111 textos normalizados distintos e 45 páginas Motif com autoria, prompt público e link original. Metadados e fingerprints ficam no Git; textos integrais continuam nas fontes. A deduplicação é literal normalizada, não semântica. Os 64 Revid permanecem referências audiovisuais.

## Recorte de pessoa e limites visuais

O MediaPipe oficial foi executado em quatro quadros da gravação. Cabeça/corpo foram encontrados, mas vidro do púlpito, dedos e objetos produziram bordas que exigem inspeção. O alpha completo não foi aplicado à prévia. GoBold não estava instalada; foi usada Arial. Alguns enquadramentos já cortam parte do sujeito no original.

As dez imagens V01–V10 não foram encontradas no Git nem na pasta original conferida. Seus descritores não permitem provar timing ou equivalência premium. Modelos 3D, continuidade de cor e demais receitas parciais continuam listados em `COBERTURA.md`.

## Reprodução com mídia autorizada

```powershell
python tools/transcribe.py "VIDEO.mp4" output/transcript.json --model small --language pt
node tools/create_job.mjs "VIDEO.mp4" output/transcript.json meu-brief.json output/job.json
node tools/engine.mjs validate output/job.json
node tools/engine.mjs preview output/job.json output/revisao
python tools/audio_fidelity.py output/job.json output/revisao/preview.mp4 output/revisao/audio-fidelity.json
```

O brief aceita as configurações do job e `transcriptCorrections` explícitas. Sem `clips`, usa o vídeo inteiro. A comparação de áudio aceita cortes montados pela EDL; música e processamento intenso podem exigir interpretação dos resultados. `review.html` mantém o fluxo de aprovação existente.

Testes desta etapa: 34 JavaScript, 16 Python e duas regressões de render. Não há declaração de conclusão integral do projeto.
