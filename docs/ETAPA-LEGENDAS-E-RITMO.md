# Legendas legíveis, arquivos de legenda e ritmo visual

Implementação de A050/A096 e reconciliação de âncoras após revisão da transcrição. Os recursos são opcionais; não definem uma aparência obrigatória para todas as pregações.

## Legibilidade e arquivos

A050 seleciona legendas estáticas, brancas sobre caixa preta opaca, com no máximo duas linhas medidas no navegador. A cor, a caixa e seu alpha são configuráveis. O modo `accessible` rejeita combinações com contraste nominal inferior a 4,5:1, caixa desativada, transparência do grupo, filtros ou mistura que invalidem a medição. A medição considera o pior fundo SDR possível sob a caixa, em vez de assumir que toda legenda tem contraste 21:1. Modos sem caixa informam contraste desconhecido.

O limiar adotado segue a orientação de [contraste da W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Não certifica os pixels de toda a gravação, a legibilidade depois da distribuição ou acessibilidade integral. [Legendas acessíveis também exigem](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html) identificação de falantes e informações sonoras significativas. Essas anotações não são inventadas pelo ASR; A050 permanece parcial.

`preview` e `final` geram `captions.srt` e `captions.vtt` com os mesmos frames das páginas exibidas. Isso também ocorre quando a legenda gravada no vídeo está desativada. Palavras com duração zero permanecem na página adjacente; não ganham um tempo por palavra estimado. A revisão local incorpora WebVTT em uma faixa nativa do player, ativável pelo controle de legendas. As faixas ficam desativadas inicialmente para evitar duplicação sobre a legenda já gravada no vídeo.

```json
{
  "operations": [
    { "recipeId": "A050", "style": { "fontSize": 64, "minFontSize": 48, "maxLines": 2 } },
    { "recipeId": "A096", "pace": { "mode": "review", "minStartGapSeconds": 0.5, "maxConcurrent": 2 } }
  ]
}
```

## Ritmo contextual

A096 calcula proximidade das entradas e máximo de eventos simultâneos, sem impor uma quantidade de efeitos por vídeo. O padrão `review` mantém os tempos. `adjust` só pode deslocar decorações explicitamente marcadas `paceFlexible: true`, dentro de `maxDelaySeconds` e da duração da edição. São elegíveis partículas, luz, flash, glitch e trilha visual sem texto/dados/assets. Fala, cortes, legendas, SFX, eventos presos a batidas e âncoras de fala conservam seus tempos.

Se não houver espaço válido, o evento é mantido e a análise continua indicando a proximidade/simultaneidade. Cada deslocamento guarda antes/depois e é reproduzível ao aplicar as operações novamente. O objetivo é ajudar a escolha editorial; a ferramenta não elimina uma ênfase nem altera a mensagem para satisfazer uma regra visual.

## Corrigir texto com gráficos ancorados

O editor remove alinhamento por palavra e aprovação anterior nos segmentos corrigidos. Por padrão, uma âncora afetada fica marcada para realinhamento; a ferramenta não inventa um novo início de palavra. A opção explícita “Manter os tempos dos gráficos desta prévia nos trechos corrigidos” conserva o intervalo visual medido e registra sua origem, removendo a âncora ativa apenas desses eventos. A nova prévia continua exigindo revisão. O teste inclui download do job pelo navegador e render real após a correção.

## Evidência atual

- 71 testes JavaScript e 24 Python passaram.
- Fixture MP4 de cinco segundos/150 frames: caixa legível sobre fundo branco e escuro; ausência de destaque por palavra no modo acessível; deslocamento de decoração de 3,7s para 4,2s observado nos pixels codificados.
- SRT decodificado pelo FFmpeg; WebVTT carregado pelo player nativo do Chrome com dois cues e início em 0s. A comparação da voz obteve correlação 0,999963 e atraso 0ms.
- Revisão no Chrome testou o bloqueio de aprovação durante alterações, a solicitação padrão de realinhamento e a conservação explícita do tempo visual. O job corrigido também gerou MP4 válido.
- Onze colisões de destinos são exercitadas pelo teste de proteção, incluindo legendas externas; os bytes de entrada precisam permanecer intactos.

Hashes e recibos vinculados ao código ficam em `validation/render-results.json`. A prévia integral com a nova variante de legendas está sendo validada; só seu resultado confirmado deve constar em `validation/real-sermon-results.json`. Os relatórios públicos não contêm transcrição, legendas nem quadros da pregação real.

Continuam abertos A050 completo, revisão espacial de pixels animados/legendas, comparação individual das referências, pós-processamento e aprovação humana. Esse teste não comprova equivalência premium de toda a biblioteca.
