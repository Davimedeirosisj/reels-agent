> **PRIORIDADE MÁXIMA — PROMPTS ORIGINAIS DOS SITES**
>
> Para selecionar motion graphics, consulte **primeiro** os prompts originais publicados em [Prompt Motion](https://prompt-motion.com/) e as referências de [Motif](https://createmotion.io/prompts/) e [Revid](https://www.revid.ai/claude-motion-graphics). A meta editorial é curar **100 prompts originais de sites, com links individuais e autoria**, que serão a biblioteca principal do agente **quando verificados**.
>
> **Atenção à procedência:** o arquivo `prompts/100-motion-graphics.md` contém **100 prompts autorais**, não 100 prompts copiados ou testados dos sites. **Não apresentá-los como os 100 originais.** Até completar a curadoria, priorizar os originais verificáveis já referenciados em `prompts/prompt-motion-referencias.md`, `prompts/motif-45-referencias.md` e `prompts/revid-64-referencias.md`; usar os autorais apenas como alternativa, com rótulo explícito. Não afirmar teste prático sem evidência.

# Reels Agent

Agente de edição de Reels com IA — projeto em desenvolvimento.

## Objetivo
Transformar vídeos brutos em Reels verticais com cortes inteligentes, transcrição, legendas dinâmicas, motion graphics, processamento de áudio e revisão antes da exportação.

## Ferramentas do motor
- Transcrição: Whisper/faster-whisper
- Edição e render: FFmpeg
- Animações: Remotion
- Orquestração: ChatGPT/Codex e Claude Code

## Status
**Motor executável em desenvolvimento, com renderização comprovada.** Existe uma linha do tempo com cortes reais, remapeamento de legendas e eventos Remotion. A biblioteca tem 56 componentes, incluindo cenas Three.js com modelos, luzes e câmera. Cor por tomada, duas linhas medidas, editor de legendas, B-roll, ducking e exportação possuem testes próprios. Uma prévia completa de pregação real foi renderizada em 1080×1920, com voz comparada ao original. A revisão humana e a cobertura integral das referências permanecem abertas.

A curadoria verificou 124 publicações Prompt Motion / 111 textos normalizados distintos e 45 páginas individuais Motif, com autoria e links. Isso comprova as fontes, não a reprodução de todos os exemplos. Os resultados técnicos e limites estão em [Validação com pregação real](docs/ETAPA-PREGACAO-REAL.md); a gravação e sua transcrição permanecem locais.

Novos comandos, provas de render e limites: [Cor, 3D e revisão](docs/ETAPA-COR-3D-E-REVISAO.md).

[Recorte automático](docs/ETAPA-RECORTE-AUTOMATICO.md): preparo alinhado a cortes/câmera/cor, transparência e textos atrás da pessoa. A pregação completa foi processada e renderizada; vidro, mãos e cabelo continuam exigindo revisão. Correções de legendas podem ser delimitadas por tempo/ocorrência, sem substituir trechos ambíguos.

[Âncoras e revisão espacial](docs/ETAPA-ANCORAS-E-EXPORTACAO.md): gráficos ligados às frases da transcrição, proteção de arquivos durante exportação e localização facial para conferir possíveis sobreposições. Intervalos sem detecção continuam exigindo revisão.

## Próximos passos
1. Seguir [Execução](docs/EXECUCAO.md) para transcrever, preparar EDL e renderizar prévia.
2. Revisar contexto, legendas, enquadramento e áudio em `review.html`.
3. Conferir [Cobertura individual](docs/COBERTURA.md) antes de selecionar uma receita.
4. Acompanhar [Estado e evidências](docs/STATUS-IMPLEMENTACAO.md), incluindo o trabalho restante.
5. Aprovar a edição para exportar `final.mp4`.

Consulte `AGENTS.md` e `SKILL.md` para as instruções do agente.
