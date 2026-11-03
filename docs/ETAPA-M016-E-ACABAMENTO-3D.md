# M016 — cena 3D e acabamento opcional

A [referência original de Yaori/@Pashoke1](https://createmotion.io/motions/x-2113574013523898660/) orientou esta etapa. O motor agora aceita telefone com tela fornecida, painéis em profundidade, câmera orbital, luz principal/recorte, bloom, aberração cromática e grão. A demonstração usa geometria, SVG e voz de teste próprios. A reprodução dos assets e da direção visual integral do criador permanece pendente.

## Configurar uma cena

Os controles pertencem ao evento e permanecem no mesmo JSON da edição. Nada ativa esses efeitos em toda pregação. `scene.phone` é opcional em `ui3d`; a tela aceita imagem local em `asset` ou rótulo explícito em `label`. Os painéis conservam seus próprios tamanhos, posições e rotações. A tela participa do cache, da proteção de entradas e da assinatura da aprovação.

```json
{
  "kind": "ui3d",
  "start": 0,
  "end": 6,
  "evidence": "Origem do conteúdo visual fornecido",
  "position": { "x": 85, "y": 430, "width": 880, "height": 1040 },
  "panels": [
    { "label": "Rótulo fornecido", "position": [-2, 0.2, -0.5], "size": [1.4, 2.2, 0.07] }
  ],
  "scene": {
    "phone": { "asset": "tela-autorizada.png" },
    "spin": 0,
    "rotation": [0, 0, 0],
    "orbit": { "radius": 9.5, "elevation": 0.6, "angle": -0.3, "speed": 0.1 },
    "postprocessing": {
      "bloom": { "intensity": 0.35, "luminanceThreshold": 1, "levels": 4 },
      "chromaticAberration": { "offset": [0.0007, 0.0003] },
      "grain": { "opacity": 0.025, "size": 1, "seed": "minha-cena", "animate": true }
    }
  }
}
```

`orbit` usa radianos e segundos relativos ao evento. Raio, elevação, alvo e FOV podem mudar; use órbita ou keyframes de câmera, evitando configurações sobrepostas. Luzes continuam em `scene.lights`. Para materiais luminosos, os nodes aceitam `emissive`, `emissiveIntensity` e `toneMapped`; um material emissivo acima do limiar pode produzir o halo de bloom.

O exemplo desativa a rotação contínua do grupo com `spin: 0`, para mostrar o movimento da câmera. Câmera e grupo podem ter movimentos independentes quando essa combinação ajudar a direção visual.

Cada efeito aceita opções ou `false`; `bloom: true`/`grain: true` usam os valores iniciais documentados no módulo `src/postprocessing.mjs`. Um objeto vazio não ativa um acabamento. `postprocessing.enabled: false` desativa a cadeia. A intensidade de grão é medida em sRGB perceptual, com cobertura do material; tons escuros conservam sua aparência em intensidades pequenas. `animate: false` mantém a textura do grão fixa. O estado deriva de `random(seed + frame)` do Remotion; voltar ao mesmo frame reproduz a mesma imagem no ambiente testado.

O acabamento é aplicado ao canvas 3D. Vídeo, voz e legendas permanecem em suas camadas. A implementação corrige o alpha do bloom e limita sua dispersão inicial: o teste encontrou e corrigiu um retângulo sobre o fundo. Valores altos de `levels` espalham o brilho por uma área maior; reserve espaço para o halo e confira os limites do canvas, o rosto e a leitura. O shader de grão evita criar textura em espaço transparente.

## Dependências e reprodução

Instalados e fixados: `@react-three/postprocessing` 2.19.1 (MIT) e `postprocessing` 6.39.6 (Zlib), com React 18.3.1, Fiber 8.18.0 e Three.js 0.187.0. Os peer dependencies foram conferidos; a instalação não executou scripts dos novos pacotes. A [biblioteca React](https://react-postprocessing.docs.pmnd.rs/introduction), a [orientação de bloom](https://react-postprocessing.docs.pmnd.rs/effects/bloom) e o [ThreeCanvas](https://www.remotion.dev/docs/three-canvas) são as referências de API; o código instalado dessas versões foi conferido para a integração.

```powershell
npm install --ignore-scripts
npm test
node tests/postprocessing-integration.mjs
```

Use `REELS_BROWSER` para apontar ao Chrome Headless Shell disponível, se necessário. O teste cria seis segundos de imagem sintética com voz TTS já usada nas regressões, sem baixar modelos, telas ou vídeos de terceiros. Corrige a grafia conhecida “reals” para “Reels” nesse fixture, preservando seus tempos medidos.

## Medidas confirmadas

- MP4 de 180 frames em 1080×1920/30fps, H.264/AAC, com decodificação integral e comparação de voz aprovadas; correlação mínima 0,999966, atraso 0ms.
- Bloom acrescentou 20415 pixels de halo na região medida; diferença RGB média zero no canto transparente inspecionado.
- Separação vermelho/azul medida em aproximadamente 8,79 pixels no ensaio de offset explícito.
- Grão de teste em intensidade 0,12: diferença RGB média 7,315 no material plano e zero no fundo transparente.
- O mesmo frame/semente repetiu o mesmo PNG em renders independentes; trocar frame ou semente alterou a imagem. Efeitos desativados repetiram o PNG original.
- A órbita produziu diferença RGB média 10,063 entre quadros do MP4; alterar somente a tela do telefone invalidou o recibo de aprovação anterior.

Hashes, bibliotecas e escopo ficam em `validation/postprocessing-results.json`; o catálogo registra implementação própria de técnicas em `prompts/reference-implementations.json`. `originalReproduced` permanece `false`. A repetibilidade foi medida nesta máquina com Windows/Chrome/ANGLE, sem garantia de igualdade entre GPUs ou navegadores distintos.

Uma execução da regressão de recorte parou após 20s sem receber dados de um arquivo servido localmente. O processo encerrou com erro; sua repetição idêntica e a rodada final passaram, mantendo os timeouts e critérios originais. A causa da interrupção de leitura não foi isolada. Os testes de mídia continuam necessários em cada exportação.

Na pasta original, as novas dependências foram instaladas sem remover o navegador em cache. Passaram 76 testes JavaScript, 24 Python e as regressões de M016, 3D, recorte real e proteção de saídas. O MP4 de seis segundos, o quadro da cena e os frames de grão repetidos ficaram idênticos aos da pasta de desenvolvimento por SHA-256. A amostra real de quatro segundos passou; a pregação integral continua vinculada à etapa anterior. Evidência: `validation/original-folder-results.json`.

A prévia integral da pregação validada no commit `57b16d5` permanece como evidência histórica de sua própria composição. Esta etapa valida o novo acabamento em fixtures e amostras técnicas. A escolha da cena depende do conteúdo e das referências da edição. Revisão espacial de pixels, acessibilidade integral, comparação de cada referência, layouts/cortes adicionais e aprovação humana seguem no objetivo ativo.
