> **PRIORIDADE MÁXIMA — PROMPTS ORIGINAIS DOS SITES**
>
> Para selecionar motion graphics, consulte **primeiro** os prompts originais publicados em [Prompt Motion](https://prompt-motion.com/) e as referências de [Motif](https://createmotion.io/prompts/) e [Revid](https://www.revid.ai/claude-motion-graphics). A meta editorial é curar **100 prompts originais de sites, com links individuais e autoria**, que serão a biblioteca principal do agente **quando verificados**.
>
> **Atenção à procedência:** o arquivo `prompts/100-motion-graphics.md` contém **100 prompts autorais**, não 100 prompts copiados ou testados dos sites. **Não apresentá-los como os 100 originais.** Até completar a curadoria, priorizar os originais verificáveis já referenciados em `prompts/prompt-motion-referencias.md`, `prompts/motif-45-referencias.md` e `prompts/revid-64-referencias.md`; usar os autorais apenas como alternativa, com rótulo explícito. Não afirmar teste prático sem evidência.

# Reels Agent

Agente de edição de Reels com IA — projeto em desenvolvimento.

## Objetivo
Transformar vídeos brutos em Reels verticais com cortes inteligentes, transcrição, legendas dinâmicas, motion graphics, processamento de áudio e revisão antes da exportação.

## Arquitetura planejada
- Transcrição: Whisper/faster-whisper
- Edição e render: FFmpeg
- Animações: Remotion
- Orquestração: ChatGPT/Codex e Claude Code

## Status
**Motor executável em desenvolvimento.** Existe uma linha do tempo com cortes reais, remapeamento de legendas, biblioteca de eventos Remotion e render MP4. Uma prévia sintética, uma galeria de 48 componentes e regressões de cortes, B-roll e ducking foram executadas com vídeo BT.709/yuv420p. A cobertura completa das referências e a validação pastoral permanecem abertas. Recorte local de pessoas foi integrado como ferramenta auxiliar e ainda precisa de validação em um pregador real.

## Próximos passos
1. Seguir [Execução](docs/EXECUCAO.md) para transcrever, preparar EDL e renderizar prévia.
2. Revisar contexto, legendas, enquadramento e áudio em `review.html`.
3. Conferir [Cobertura individual](docs/COBERTURA.md) antes de selecionar uma receita.
4. Acompanhar [Estado e evidências](docs/STATUS-IMPLEMENTACAO.md), incluindo o trabalho restante.
5. Aprovar a edição para exportar `final.mp4`.

Consulte `AGENTS.md` e `SKILL.md` para as instruções do agente.
