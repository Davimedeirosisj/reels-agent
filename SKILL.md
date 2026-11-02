---
name: reels-agent
description: Planejamento e edição assistida de vídeos brutos em Reels verticais com transcrição, cortes, legendas, motion graphics e revisão.
---

# Reels Agent — Skill principal

## Entrada
Vídeo bruto, preferências visuais, duração-alvo e referências autorizadas.

## Motor editorial
- **Cortes:** remover erros, retomadas e pausas desnecessárias sem alterar o sentido.
- **Transições:** usar apenas quando ajudarem a continuidade.
- **Efeitos:** dosar zoom, recorte e destaque visual.
- **Motion graphics:** ilustrar conceitos com gráficos contextualizados e legíveis.
- **Legendas:** sincronizar com fala e preservar a grafia.
- **Áudio:** preservar voz, evitar compressão excessiva e mixar efeitos discretamente.

## Perfil pregação
Vertical 1080×1920; títulos em maiúsculas, fonte GoBold Bold quando licenciada e disponível, branco, sem contorno. Priorizar curiosidade, identificação e tensão no título, sem sensacionalismo nem distorção bíblica.

## Saídas propostas
`transcript.json`, `edit_decisions.json`, `preview.mp4`, `final.mp4`, `quality_report.md`.

## Critérios de aprovação
Conferir cortes, sincronia, safe areas, legibilidade, picos de áudio, erros de renderização e fidelidade à mensagem.

## Status
Especificação inicial. Não pressupõe integração instalada ou execução bem-sucedida.
