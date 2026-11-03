# Cor, tipografia medida, cenas 3D e revisão — 03/11/2026

## Implementado e testado

- A097: matriz RGB por tomada, intensidade ajustável e proposta de correspondência entre câmeras a partir de uma área neutra explicitamente identificada. No MP4 de calibração, o erro RGB médio caiu de 11,3889 para 1,5 em seis amostras, incluindo uma cor semelhante à pele. Não foi aplicado ajuste de cor à pregação de câmera única.
- A043: paginação com até duas linhas, quebra equilibrada e tamanho calculado com a fonte real no DOM do Chrome. O primeiro teste encontrou uma terceira linha; a correção passou na imagem decodificada, com duas faixas de texto e pixels entre x=89 e x=972, dentro das margens de 85–975. Palavras e tempos permanecem intactos. Uma página que não cabe no mínimo configurado é rejeitada, sem truncar o texto.
- A024/A027/A028: cenas reais com Three.js, modelos GLB autocontidos, livro procedural autoral, painéis com imagens/texto, materiais, luzes, sombras e câmera por keyframes. Os quatro exemplos foram renderizados e inspecionados. Dois renders independentes do mesmo quadro produziram PNGs com o mesmo hash.
- A095: revisão local com reprodução por trecho, edição das legendas e download do job corrigido. Alterar o texto remove o alinhamento por palavra daquele segmento e invalida a aprovação anterior. A frase mantém seu intervalo original. O navegador confirmou o bloqueio da aprovação enquanto existem correções pendentes.
- A assinatura da composição agora inclui código do motor, revisão e lockfile. Diferenças de fim de linha entre checkouts não invalidam o mesmo conteúdo; alterar dependências ou código de render invalida a revisão. Testes cobrem essas condições.

São 45 testes JavaScript e 19 Python, além das integrações com MP4 e navegador. Os resultados, hashes e escopos estão em `validation/render-results.json`. Essa evidência não comprova reprodução de todas as referências externas.

## Cor por tomada

Uma operação manual:

```json
{"recipeId":"A097","clip":1,"color":{"gain":[0.95,1,1.04],"space":"linearRGB","intensity":0.7}}
```

Também são aceitos `offset` RGB ou uma `matrix` de 12 valores, em ordem de três linhas com quatro colunas. A matriz afeta somente o vídeo da tomada; textos e elementos de identidade ficam em suas próprias camadas. O cálculo usa a transformação de cor do SVG e espaço explicitado, conforme a [documentação de feColorMatrix](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feColorMatrix).

Para propor correspondência entre tomadas, adicione ao job:

```json
{
  "colorMatch": {
    "referenceClip": 0,
    "targets": [1],
    "intensity": 0.85,
    "samples": {
      "0": {"rect":[0.1,0.1,0.2,0.15],"label":"mesmo cartão neutro"},
      "1": {"rect":[0.2,0.12,0.18,0.15],"label":"mesmo cartão neutro"}
    }
  }
}
```

`rect` é [x,y,largura,altura] normalizado na imagem de origem. As amostras devem mostrar o mesmo material neutro nas duas câmeras. O analisador verifica vários quadros, rejeita áreas escuras/saturadas/instáveis e registra ganhos limitados e proveniência. É uma proposta SDR; HDR/gamut amplo exige conversão explícita anterior. Luzes mistas e julgamento de pele continuam sujeitos à comparação visual.

```powershell
node tools/engine.mjs color-plan output/job.json output/cor-proposta.json
node tools/engine.mjs preview output/cor-proposta.json output/revisao-cor
```

## Cenas 3D

Os eventos `product3d`, `ui3d` e `light3d` compartilham um motor configurável. `scene.camera` aceita keyframes com `time`, `position`, `target` e `fov`; o tempo é relativo ao evento. `scene.lights`, `scene.nodes`, materiais, rotação e velocidade angular podem ser fornecidos. As animações derivam do frame, seguindo a [integração oficial ThreeCanvas](https://www.remotion.dev/docs/three-canvas).

`product3d` aceita `asset` GLB, `scene.product: "book"` ou geometrias em `scene.nodes`. O GLB de regressão foi criado pelo próprio teste. O importador exige recursos incorporados; Draco, Meshopt e KTX2 comprimidos não têm decodificadores configurados. `ui3d` usa `panels` com imagens autorizadas ou rótulos fornecidos. `light3d` usa geometrias explícitas. A origem do conceito ilustrado fica em `evidence`.

O render usa ANGLE quando há cenas 3D; `REELS_GL` pode selecionar outro backend compatível. A configuração comprovada é Windows/Chrome Headless Shell, Three.js 0.187.0, Fiber 8.18.0 e Remotion/three 4.0.540 com React 18.3.1. Há aviso de descontinuação de `THREE.Clock` vindo do Fiber; os testes de render e repetibilidade passaram.

As páginas [M013, Beginning-Willow-801](https://createmotion.io/motions/reddit-1vj7s89/) e [M016, Yaori](https://createmotion.io/motions/x-2113574013523898660/) foram consultadas como referências de modelagem, iluminação e profundidade. Os componentes e assets de teste são próprios. O produto cosmético e as telas específicas dos autores não foram reproduzidos. A integração posterior de telefone/painéis, órbita, bloom, aberração e grão está documentada em [M016 e acabamento](ETAPA-M016-E-ACABAMENTO-3D.md).

## Revisão e evidências

Em `review.html`, abra “Conferir e corrigir as legendas”, ouça os trechos e baixe `job-corrigido.json`. Renderize esse job para conferir as correções. A aprovação vale somente para a prévia sem alterações pendentes, com EDL, mídia, dependências e código correspondentes. Nenhuma aprovação de pregação real foi fabricada nos testes.

Integrações reproduzíveis:

```powershell
node tests/color-integration.mjs
node tests/caption-layout-integration.mjs
node tests/scene3d-integration.mjs
node tests/review-integration.mjs
node tests/render-integration.mjs
node tests/composition-integration.mjs
node tests/approval-integration.mjs
```

O último teste usa exclusivamente o fixture de cores/tons conhecido, verifica rejeição antes da aprovação, exportação `final.mp4` e rejeição após alterar a edição. A aprovação automática desse teste não se aplica à pregação.

Continuam abertos o preparo/rastreamento de pessoa de ponta a ponta, revisão espacial mais completa, acessibilidade e controle de ritmo, comparação de cada referência e as imagens V01–V10 ausentes. A biblioteca permanece em desenvolvimento.
