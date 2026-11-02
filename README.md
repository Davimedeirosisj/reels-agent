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
**Planejamento / protótipo.** Ainda não há pipeline de edição validado ponta a ponta. As ferramentas externas citadas são referências, não dependências instaladas.

## Próximos passos
1. Implementar ingestão e transcrição.
2. Criar cortes orientados por transcrição.
3. Gerar legendas e títulos.
4. Adicionar motion graphics com Remotion.
5. Renderizar e revisar MP4.

Consulte `AGENTS.md` e `SKILL.md` para as instruções do agente.
