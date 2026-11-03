# Âncoras de fala e proteção da exportação

Um gráfico pode receber seu tempo diretamente de uma frase da transcrição, após o remapeamento dos cortes. Isso reduz a necessidade de copiar segundos manualmente e preserva a liberdade de escolher texto, posição, duração e linguagem visual.

```json
{
  "motions": [{
    "kind": "impact",
    "text": "PAZ",
    "anchor": {"phrase": "paz", "occurrence": 1},
    "duration": 2.4,
    "position": {"x": 85, "y": 420, "width": 550, "height": 230}
  }]
}
```

O exemplo mostra o formato de entrada; a frase precisa existir no vídeo atual. Não use um título que mude o sentido da fala só porque sua âncora foi encontrada.

## Como resolver o tempo

- `anchor.phrase` busca as mesmas palavras, acentos e ordem, sem exigir caixa ou pontuação de borda iguais. Não usa aproximação semântica.
- `occurrence` começa em um e conta apenas ocorrências intactas mantidas na edição. Se houver repetição sem seleção explícita, o motor rejeita a ambiguidade. `clip` (começando em zero) e `source` podem restringir a busca.
- `duration` define o tempo visual, não inventa duração de palavra. Sem esse campo, o gráfico termina no fim medido da frase. Alternativamente, `endAnchor` define seu término por outra frase; os dois campos não podem ser combinados.
- `edge` aceita `start` ou `end`; o padrão é início para `anchor` e fim para `endAnchor`. `offset` permite antecipação/atraso deliberado, em segundos. O resultado é quantizado para os mesmos frames do vídeo.
- Por padrão são exigidos timestamps de palavras consistentes com o texto. Não são inferidos onsets a partir da quantidade de letras. Uma palavra parcialmente cortada ou com duração zero não fornece uma borda precisa utilizável.
- `granularity: "segment"` permite explicitamente o tempo de uma frase inteira sem alinhamento por palavra. A busca deve corresponder ao segmento completo; não estima a localização de uma palavra dentro dele.
- Uma frase de busca deve permanecer inteira dentro de um corte. Não é reconstruída através de palavras removidas nem de vários cortes. Âncoras inicial/final separadas podem delimitar um evento maior.
- O job resolvido registra os tempos originais, clip, frames e granularidade em `resolvedSpeechAnchor`. Uma nova EDL recalcula os tempos; repetição da resolução permanece estável para aprovação.
- `syncToBeat` e uma âncora de fala no mesmo evento são rejeitados quando a sincronia por batida está ativa. Escolha uma intenção temporal explícita.

## Proteção das entradas e dos recibos

Antes de escrever arquivos de prévia/final, o motor verifica colisões com mídias e job de entrada, inclusive caminhos equivalentes, diferenças de caixa no Windows e hardlinks. Propostas de corte/cor também preservam as entradas. O preparo de foreground protege os modelos e mídias utilizados.

A versão do código é capturada antes do render e conferida novamente depois da renderização e validação. A revisão usa esse fingerprint e o snapshot dos bytes realmente preparados. Mudanças de mídia durante o processo impedem a aprovação; a exportação final confere novamente se o snapshot ainda corresponde ao aprovado.

Essas proteções não substituem a revisão de sentido, cortes ou legendas. Um ASR incorreto ainda pode fornecer uma âncora incorreta; confira a fala.

## Evidência inicial

65 testes JavaScript e 24 Python passaram. O teste de colisões executou o CLI em sete situações e preservou todos os bytes originais. O teste de âncora renderizou 150 frames de uma fixture TTS/Whisper: o gráfico apareceu somente no intervalo derivado da frase, com 3064 pixels de texto branco na amostra ativa e zero nas amostras anterior/posterior. A comparação da voz teve correlação 0,999972 e atraso de 0 ms na janela medida. São testes técnicos; não aprovação editorial de uma pregação.

Resultados desta etapa são registrados com fingerprint e hashes em `docs/validation/`. A atualização da pregação completa e das demais regressões permanece separada dessas amostras. A cobertura integral de todas as referências ainda está aberta.

## Localização facial para revisão espacial

```powershell
python -X utf8 tools/track_faces.py output/recorte/edited-source.mp4 output/recorte/face-localization.json
node tools/spatial_audit.mjs output/recorte/job.with-foreground.json output/recorte/face-localization.json output/recorte/face-audit.json
python -X utf8 tools/inspect_face_regions.py output/recorte/edited-source.mp4 output/recorte/face-localization.json output/recorte/face-inspection
```

O primeiro comando analisa a tomada já cortada/enquadrada. O segundo confere a ligação com a geometria e os bytes preparados e compara regiões detectadas com as posições declaradas de motions e título. Os contatos do terceiro comando ficam locais; são desenhados a partir das detecções salvas, sem nova inferência.

Modelo oficial [BlazeFace short-range](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector), SHA-256 `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`, 229746 bytes, guardado em `cache/models/`. Licença Apache-2.0 conforme o [model card](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf). Não há reconhecimento de identidade.

A análise da pregação percorreu 4321 frames, com 541 amostragens e detecção em 512 delas. Seis quadros positivos e cinco sem detecção foram inspecionados; as falhas observadas coincidem com rosto parcial nas bordas do quadro. A área expandida tocou uma borda em 100 amostras — isso é um alerta conservador, não medição exata de rosto cortado.

Intervalos sem detecção permanecem desconhecidos. A união de caixas observadas entre amostras é estimada; movimentos entre elas, faces distantes/de perfil, cabelo, mãos e objetos não têm proteção contínua comprovada. Um teste real de quatro segundos sinalizou um retângulo sobre a região facial, não sinalizou outro separado dela e rejeitou dados de vídeo diferente. A094 continua parcial: faltam limites reais dos pixels animados/legendas e conferência integral. Um gráfico atrás da pessoa continua exigindo revisão de bordas mesmo quando há máscara.
