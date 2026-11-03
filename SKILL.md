---
name: reels-agent
description: Editar cortes de cultos e pregações com EDL revisável, legendas, motion graphics contextuais e exportação MP4 validada, preservando a mensagem original.
---

> **PRIORIDADE MÁXIMA — PROMPTS ORIGINAIS DOS SITES**
>
> Para selecionar motion graphics, consulte **primeiro** os prompts originais publicados em [Prompt Motion](https://prompt-motion.com/) e as referências de [Motif](https://createmotion.io/prompts/) e [Revid](https://www.revid.ai/claude-motion-graphics). A meta editorial é curar **100 prompts originais de sites, com links individuais e autoria**, que serão a biblioteca principal do agente **quando verificados**.
>
> **Atenção à procedência:** o arquivo `prompts/100-motion-graphics.md` contém **100 prompts autorais**, não 100 prompts copiados ou testados dos sites. **Não apresentá-los como os 100 originais.** Até completar a curadoria, priorizar os originais verificáveis já referenciados em `prompts/prompt-motion-referencias.md`, `prompts/motif-45-referencias.md` e `prompts/revid-64-referencias.md`; usar os autorais apenas como alternativa, com rótulo explícito. Não afirmar teste prático sem evidência.

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
Motor executável em desenvolvimento. A entrada atual usa `clips`, `transcript`, `motions`, câmera, tema e áudio em JSON. Consulte `docs/EXECUCAO.md` para comandos; `docs/COBERTURA.md` para cobertura individual e `docs/STATUS-IMPLEMENTACAO.md` para testes/pendências. Componentes renderizados com mídia sintética não comprovam todos os prompts nem fidelidade de uma pregação real. A revisão atual de PNG/BT.709 e legendas ainda requer render.

## REGRA FUNDAMENTAL: NÃO ENGESSAR A EDIÇÃO

Este documento descreve **padrões adaptáveis, não presets obrigatórios**. A Skill deve exercer julgamento editorial sobre cada gravação e obedecer ao pedido específico do usuário.

- Aceitar tanto culto inteiro quanto trecho pré-selecionado; um ou vários cortes; vídeo vertical ou outro formato solicitado.
- Duração, ritmo, intensidade dos zooms, estilo de legendas, tipografia, posição do título, trilha, B-roll, efeitos e motion graphics são **decisões contextuais**, não quantidades fixas.
- GoBold Bold, branco, caixa alta e 1080×1920 são **preferências padrão**, não limitações; referências e instruções explícitas do usuário podem substituí-las.
- O princípio de títulos com problema humano é **uma heurística**, não fórmula obrigatória; em alguns trechos é melhor usar pergunta, versículo, frase direta ou nenhum título.
- Não aplicar efeitos só porque estão disponíveis; um Reel contemplativo pode funcionar melhor sem efeitos, e outro pode pedir edição mais enérgica.
- As referências dos sites são repertório criativo, **não um cardápio fechado**; combinar, adaptar ou deixar de usar quando não fizer sentido.
- Preservar sempre a fidelidade à fala, o contexto bíblico e a integridade do conteúdo. Essas são restrições editoriais, não estéticas.
- Quando houver conflito entre padrão e instrução do usuário, prevalece a instrução atual, exceto se distorcer fatos ou criar problemas de direitos.
- Não interromper o fluxo para perguntar escolhas cosméticas; usar julgamento profissional e explicar as escolhas quando útil.
