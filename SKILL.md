> **PRIORIDADE MÁXIMA — PROMPTS ORIGINAIS DOS SITES**
>
> Para selecionar motion graphics, consulte **primeiro** os prompts originais publicados em [Prompt Motion](https://prompt-motion.com/) e as referências de [Motif](https://createmotion.io/prompts/) e [Revid](https://www.revid.ai/claude-motion-graphics). A meta editorial é curar **100 prompts originais de sites, com links individuais e autoria**, que serão a biblioteca principal do agente **quando verificados**.
>
> **Atenção à procedência:** o arquivo `prompts/100-motion-graphics.md` contém **100 prompts autorais**, não 100 prompts copiados ou testados dos sites. **Não apresentá-los como os 100 originais.** Até completar a curadoria, priorizar os originais verificáveis já referenciados em `prompts/prompt-motion-referencias.md`, `prompts/motif-45-referencias.md` e `prompts/revid-64-referencias.md`; usar os autorais apenas como alternativa, com rótulo explícito. Não afirmar teste prático sem evidência.

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
