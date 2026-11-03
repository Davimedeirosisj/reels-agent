# Guia de prompts e referências — Reels Agent Skill

## Objetivo

Receber um vídeo bruto + instruções do usuário + referências visuais, extrair um briefing de edição e executar a pipeline quando o motor estiver disponível. Não prometer renderização sem executar.

## Prompt recomendado

```text
Use a Skill Reels Agent para editar o vídeo anexado.
Objetivo: [emocionar / ensinar / reter atenção / divulgar].
Público: [quem vai assistir].
Duração: [ex.: 30–60 segundos / manter duração].
Estilo: [cinematográfico / dinâmico / minimalista / referência anexada].
Referências: [links, vídeos, imagens e o que aproveitar de cada uma].
Preservar: [falas essenciais, sequência, rosto, tom, música, identidade].
Evitar: [efeitos exagerados, cortes que mudem o sentido, legendas sobre o rosto].
Identidade: vertical 1080x1920; títulos GoBold Bold, caixa alta, branco, sem contorno.
Entregar: MP4 + resumo de decisões e verificação final, se houver motor disponível.
```

## Como anexar referências

| Formato | O que enviar | Como interpretar |
|---|---|---|
| Vídeo | MP4 de um Reel editado | Cortes, ritmo, timing, enquadramento, transições |
| Link | URL da publicação ou galeria | Consultar a fonte, registrar autor e técnica; não assumir acesso ao arquivo |
| Imagem | Screenshot de frame ou composição | Fonte, cores, hierarquia, disposição dos elementos |
| Timecode | Ex.: 00:08–00:12 do vídeo de referência | Aplicar a técnica identificada nesse trecho, adaptada ao vídeo bruto |
| Texto | Descrição ou prompt original | Usar como instrução, não como evidência de que um efeito foi testado |

## Ordem de precedência

1. Pedido atual do usuário e restrições explícitas.
2. Mensagem, fidelidade ao conteúdo e qualidade de áudio.
3. Referências visuais específicas enviadas para o vídeo atual.
4. Biblioteca de prompts originais **verificados** dos sites (Prompt Motion, Motif etc.), quando pertinente.
5. Referências técnicas como Felpborges/skill-reel.
6. Prompts autorais de fallback, identificados como tal.

**Nota:** os 100 prompts de `prompts/100-motion-graphics.md` são autorais; não são os 100 prompts originais dos sites. Não alegar que foram testados. Referências externas são exemplos e não substituem avaliação editorial.

## Procedimento da Skill

1. Inventariar anexos e URLs; verificar quais mídias estão acessíveis.
2. Analisar vídeo bruto e referências; obter transcrição e timecodes quando houver ferramentas.
3. Criar mapa editorial de trechos e uma EDL (lista de decisões de edição).
4. Associar cada técnica à sua referência e justificar por que cabe naquele trecho.
5. Aplicar cortes, legendas, motion graphics, B-roll e áudio, conforme ferramentas disponíveis.
6. Conferir ortografia, sincronia, zonas seguras, duração, formato e mensagem.
7. Exportar MP4 quando a execução estiver disponível; caso contrário, entregar plano executável e informar o bloqueio.

## Exemplo de referência bem especificada

> Referência: [link]. Entre 00:03 e 00:07, gosto do zoom progressivo e da palavra-chave que aparece no centro. Quero esse comportamento na frase mais forte da minha pregação, mas sem esconder meu rosto. Não copie as imagens nem o texto do vídeo original.

## Regras de segurança editorial

- Não inventar palavras, não reordenar falas de modo enganoso e não remover contexto que altere o sentido.
- Não reproduzir integralmente código ou prompts de terceiros sem licença/autorização.
- Pedir esclarecimento apenas se faltar algo indispensável; caso contrário, usar padrão editorial e registrar escolhas.

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
