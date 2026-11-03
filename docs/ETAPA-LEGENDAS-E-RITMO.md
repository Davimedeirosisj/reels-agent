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

Hashes e recibos vinculados ao código ficam em `validation/render-results.json`. A prévia integral da pregação passou: 144,1s, 4321 frames, 1080×1920/30fps, H.264/AAC estéreo 48kHz. As 232 palavras alinhadas permanecem nas 66 páginas; duas palavras sem duração continuam na página adjacente. Medição de todas as páginas no Chrome: até duas linhas, fonte efetiva de 56 a 64px e nenhum overflow. Dez páginas têm alerta de leitura rápida.

SHA-256 do MP4: `369bf119fe65767b77cb2e520074330ae85799a53b514b16175d6131d38d904d`. Decodificação integral passou. Voz comparada ao original em nove janelas: correlação mínima 0,985742, atraso 0ms; -16,05 LUFS e -1,27dBTP. Todo o PCM decodificado ficou idêntico ao da prévia anterior validada, conforme `validation/caption-variant-audio-equivalence.json`. Isso comprova a identidade de áudio entre as variantes; a comparação com a fonte original continua amostral.

O player nativo do Chrome reproduziu o arquivo, buscou 11,5s e carregou os 66 cues do WebVTT. Os 20 segmentos seguem editáveis. Cinco quadros do MP4 e dez do alpha codificado foram inspecionados. A base manteve bytes idênticos aos da variante anterior; o alpha foi recalculado e tem outro hash, embora o tamanho seja igual. A comparação binária encontrou apenas 16 bytes diferentes no primeiro quilobyte do WebM; todos os bytes após esse cabeçalho são idênticos. Isso não substitui revisão visual das bordas. A localização facial foi reaproveitada somente após confirmar o hash da base e a auditoria espacial foi recalculada para o job atual. Bordas e limites de pixels dos gráficos/legendas continuam exigindo revisão integral.

Resultados completos: `validation/real-sermon-results.json` e `validation/real-caption-layout-results.json`. A variante anterior permanece registrada em `validation/real-sermon-standard-results.json`. Os relatórios públicos não contêm transcrição, legendas nem quadros da pregação real. A pasta original passou nos 71 testes JavaScript, 24 Python e testes reais de navegador/legendas/âncoras/proteção; seus MP4 curtos foram idênticos aos da pasta de desenvolvimento. O MP4 completo arquivado nela é uma cópia verificada, não outro render integral.

Continuam abertos A050 completo, revisão espacial de pixels animados/legendas, comparação individual das referências, pós-processamento e aprovação humana. Esse teste não comprova equivalência premium de toda a biblioteca.
