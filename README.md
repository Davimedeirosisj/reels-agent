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
