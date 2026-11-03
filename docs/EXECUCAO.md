# Executar o motor

Requisitos: Node/npm, FFmpeg e FFprobe no PATH. Para ASR local, Python com Whisper ou faster-whisper e um modelo disponível. O lockfile fixa as dependências JavaScript. GoBold não é redistribuída; a fonte padrão de demonstração é Arial do sistema.

```powershell
npm ci
npm test
npm run catalog
node tools/doctor.mjs output/environment.json
```

## Demonstrações reproduzíveis

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/create_demo.ps1
npm run render:demo
ffmpeg -y -f lavfi -i "sine=frequency=220:duration=2" public/showcase-tone.wav
node tools/showcase.mjs
node tests/render-integration.mjs
node tests/composition-integration.mjs
python -X utf8 -m unittest discover -s tests -p "test_*.py"
```

O primeiro comando usa a voz TTS instalada no Windows e transcreve o áudio de verdade com Whisper tiny em inglês. É um teste técnico identificado; não simula uma pregação real. Em outros sistemas, forneça `public/demo-input.mp4` e `public/demo-transcript.json` autorizados e execute `node tools/demo_jobs.mjs`. Os MP4 e WAV são ignorados pelo Git.

`REELS_BROWSER` pode apontar para um Chrome Headless Shell já instalado. Sem a variável, Remotion gerencia o navegador. A preparação inicial pode exigir rede. O render deve iniciar na raiz do projeto ou usar `tools/engine.mjs`, que resolve a raiz automaticamente.

## Seu vídeo

```powershell
python tools/transcribe.py "E:/videos/culto.mp4" output/transcript.json --backend whisper --model small --language pt
node tools/engine.mjs validate meu-job.json
node tools/engine.mjs plan meu-job.json output/proposta.json
node tools/engine.mjs preview output/proposta.json output/meu-reel
```

Crie `meu-job.json` a partir de `public/demo-props.json`. Use um caminho absoluto em `clips[].source`, ou um caminho relativo a `public/`. Copie o conteúdo de `transcript.json` para `transcript`. Os intervalos de `clips` são segundos na mídia original. Os intervalos de `motions` são segundos na edição resultante. Os keyframes de `clips[].camera` são relativos a cada corte.

Para montar o job a partir de uma transcrição e configurações em `meu-brief.json`, use `node tools/create_job.mjs "VIDEO.mp4" output/transcript.json meu-brief.json output/job.json`. Sem `clips` no brief, o vídeo inteiro é preservado. Correções de texto fornecidas em `transcriptCorrections: [{"from":"grafia original","to":"grafia corrigida"}]` ficam registradas como propostas, ainda sem revisão humana.

Após exportar, `python tools/audio_fidelity.py output/job.json output/revisao/preview.mp4 output/revisao/audio-fidelity.json` compara janelas da voz com a EDL e mede atraso. Não certifica fidelidade semântica. A segmentação pode ser inspecionada em quadros com `python tools/inspect_segmentation.py "VIDEO.mp4" output/mascaras`; a conferência de bordas continua necessária.

As sugestões de `plan` agrupam unidades contínuas da transcrição. Não detectam com certeza erros de fala ou importância teológica. Para sugestões visuais, defina `brief.suggestMotions: true`, `brief.references: ["V08"]`, por exemplo. `brief.motion: "none"` ou `brief.style: "contemplative"` permitem nenhuma animação. A EDL permanece editável antes do render. As novas operações por receita, análise de batidas, B-roll e recorte de pessoas estão em [Composição e áudio](ETAPA-COMPOSICAO-E-AUDIO.md).

Um evento pode conter `recipeId: "A008"`, `start`, `end` e `text`; o motor resolve a receita de tracking. Os IDs de câmera, legendas, tema e pós-produção pertencem às respectivas configurações, não são overlays. Consulte `src/recipes.mjs` e `docs/COBERTURA.md` para condições e pendências. Cada receita parcial preserva esse estado no catálogo.

Todos os componentes aceitam dados atuais do vídeo. Gráficos e citações exigem `evidence`; B-roll exige `asset`. Fluxogramas/redes usam `graph.nodes` e `graph.edges`; pergunta/resposta usa `question`, `answer` e `answerAt` relativo ao evento; interface usa `ui.rows`/`ui.steps`; definição usa `term`/`text`. Conceitos e relações exigem origem em `evidence`. O planejador aceita anotações explícitas em `brief.visualAnnotations`, sem inventar relações. Para pôr texto atrás da pessoa, prepare `foregroundSrc` alinhado à edição com `node tools/engine.mjs foreground meu-job.json output/recorte` e renderize `output/recorte/job.with-foreground.json`. Veja [Recorte automático](ETAPA-RECORTE-AUTOMATICO.md) para opções, cache e limites. `theme.fit: "contain"` preserva o quadro original; `cover` precisa de revisão de rosto/mãos/Bíblia.

Legendas: `captionStyle.mode` aceita `word`, `karaoke`, `block`, `semantic`, `mask` e `accessible`. `semanticWords` e `icon` são dados explícitos. `maxChars` e `maxWords` controlam páginas de leitura sem fabricar alinhamento. Sem timestamps de palavras, o modo por palavra usa o segmento inteiro e não estima tempos. `music` aceita `source`, `volume`, `duckVolume` e `duck`; a redução durante a fala usa os intervalos da transcrição. O áudio final recebe normalização em duas passagens; `audio.normalize: false` desativa.

## Revisão e exportação

Abra `output/meu-reel/review.html`, compare a prévia com o original e salve `review.json` após conferir os quatro pontos. Em seguida:

A página permite ouvir e corrigir os segmentos em “Conferir e corrigir as legendas”. Baixe `job-corrigido.json` e gere uma nova prévia após editar. O texto corrigido usa o intervalo original da frase, com alinhamento por palavra removido nesse segmento. A página bloqueia aprovação enquanto há edições pendentes.

```powershell
node tools/engine.mjs approve output/proposta.json "CAMINHO/review.json"
node tools/engine.mjs final output/proposta.json output/meu-reel
```

A aprovação fica vinculada à EDL, aos bytes das mídias e à composição. Alterar um desses itens exige revisar a nova prévia. Os relatórios técnicos incluem hash, duração, codecs, dimensões, frames e níveis de áudio; a decodificação integral verifica erros de mídia. Isso não substitui revisão editorial da pregação.

A composição também inclui o lockfile e o código do motor/revisão na assinatura. Fins de linha de Windows e Unix são normalizados. Consulte [Cor, 3D e revisão](ETAPA-COR-3D-E-REVISAO.md) para `color-plan`, matrizes por tomada, `maxLines`, modelos GLB e configuração das cenas Three.js.

Saídas: `transcript.json`, `edit_decisions.json`, `preview.mp4`, `review.html`, `quality_report.md`, JSON de validação e `final.mp4` após aprovação. O fallback FFmpeg anterior continua em `tools/reels_pipeline.py`; a linha do tempo atual e a revisão estão em `tools/engine.mjs`.
