> **PRIORIDADE MÁXIMA — PROMPTS ORIGINAIS DOS SITES**
>
> Para selecionar motion graphics, consulte **primeiro** os prompts originais publicados em [Prompt Motion](https://prompt-motion.com/) e as referências de [Motif](https://createmotion.io/prompts/) e [Revid](https://www.revid.ai/claude-motion-graphics). A meta editorial é curar **100 prompts originais de sites, com links individuais e autoria**, que serão a biblioteca principal do agente **quando verificados**.
>
> **Atenção à procedência:** o arquivo `prompts/100-motion-graphics.md` contém **100 prompts autorais**, não 100 prompts copiados ou testados dos sites. **Não apresentá-los como os 100 originais.** Até completar a curadoria, priorizar os originais verificáveis já referenciados em `prompts/prompt-motion-referencias.md`, `prompts/motif-45-referencias.md` e `prompts/revid-64-referencias.md`; usar os autorais apenas como alternativa, com rótulo explícito. Não afirmar teste prático sem evidência.

# Instruções para agentes

Você trabalha no projeto Reels Agent. Priorize fidelidade ao conteúdo original, edições reproduzíveis e validação do render.

## Fluxo
1. Inspecionar mídia e áudio com ffprobe.
2. Transcrever com timestamps e identificar erros, silêncios e trechos fortes.
3. Propor EDL (lista de cortes) antes de renderizar.
4. Montar cortes com FFmpeg; legendas e animações com Remotion.
5. Gerar prévia e registrar pontos para aprovação.
6. Exportar MP4 1080x1920 após revisão.

Não invente citações, trechos falados, timestamps ou resultados de testes. Não modifique o sentido de pregações. Nunca execute scripts de repositórios externos sem inspeção de segurança e licença.

## Implementação atual

Use `tools/engine.mjs` para validar EDL, propor cortes, gerar prévia e exportar após revisão. `src/editorial.mjs` define os mesmos frames para vídeo, áudio e legendas. `src/recipes.mjs` mantém cada prompt autoral e suas condições; `public/catalog.json` inclui todas as referências. Confira `docs/STATUS-IMPLEMENTACAO.md` antes de afirmar cobertura. O trim Remotion e sua renderização montam vídeo/áudio, e FFmpeg realiza inspeção, normalização e validação integral. O fallback FFmpeg anterior permanece disponível.

`prompts/external-verified.json` e `prompts/motif-attribution.json` registram fontes individuais verificadas. A curadoria não é teste de reprodução. Em transcrições ASR, preserve também palavras com duração zero: exiba seu texto na página adjacente, sem inventar duração nem destaque sincronizado. Mídia, transcrição e quadros de pregações reais ficam locais; registre no Git apenas agregados técnicos e limitações, salvo autorização específica de publicação.
