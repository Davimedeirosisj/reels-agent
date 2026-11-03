# Referência técnica prioritária — skill-reel (Felpborges)

**Projeto original:** https://github.com/Felpborges/skill-reel

**Autor:** Felpborges. **Tipo:** skill de edição automática para Claude Code. **Status no nosso projeto:** referência técnica externa; **não integrada nem testada localmente**.

## Por que é importante

O projeto declara um fluxo próximo do objetivo do Reels Agent: receber uma gravação bruta de alguém falando, limpar erros e pausas, criar composição vertical 9:16 com legendas sincronizadas, elementos animados ligados a palavras-chave, efeitos sonoros, verificação de zonas seguras e exportação de MP4.

## Componentes para estudar primeiro

1. `SKILL.md` — orquestração de ponta a ponta.
2. `corte/` — detecção e conferência de cortes por áudio e transcrição.
3. `modelo/` — motor VSL de composição e renderização.
4. `ESTILO.md` e `regras-da-casa.md` — critérios visuais e editoriais.
5. `ferramentas/` — enquadramento, âncoras, áudio final, zonas seguras e verificação.

## Integração futura

- Preservar os prompts originais verificáveis de Prompt Motion/Motif como prioridade para motion graphics.
- Adaptar as ideias do pipeline de corte e composição ao perfil de pregações, entrevistas e podcasts.
- Respeitar 1080×1920, tipografia GoBold Bold branca em caixa alta nos títulos, e mensagem bíblica como prioridade editorial.
- Testar com vídeo próprio, comparar resultado e documentar problemas antes de prometer edição totalmente automática.

## Licenciamento

Não foi encontrado arquivo `LICENSE` na raiz do repositório durante a consulta. **Não copiar ou redistribuir o código do projeto sem verificar permissão/licença com o autor.** Este documento é somente um índice de referência com link e descrição.

## Comparação de integração — 03/11/2026

Consultados novamente o [README](https://github.com/Felpborges/skill-reel), as [regras editoriais](https://github.com/Felpborges/skill-reel/blob/main/regras-da-casa.md) e a abertura da [especificação visual](https://github.com/Felpborges/skill-reel/blob/main/ESTILO.md). Não foram executados seus scripts nem copiado seu motor. As técnicas abaixo precisam de implementação própria e teste no Reels Agent:

- Já disponíveis: EDL, palavra com timestamp, loudness configurável, alpha atrás da pessoa e correção de texto por tempo.
- Pendentes: âncoras visuais por frase/ocorrência; rastreamento facial para revisão espacial e legenda móvel opcional; alternância animada da câmera entre tela inteira e card; J/L e conferência individual de emendas por fala.
- A galeria e os testes atuais não comprovam equivalência com o VSL externo. Cadência, layout e quantidade de efeitos permanecem escolhas contextuais.
