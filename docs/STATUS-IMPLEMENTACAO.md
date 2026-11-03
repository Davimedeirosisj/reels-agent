# Estado da implementação — 02/11/2026

Objetivo completo: implementar os prompts e referências do repositório, com edição contextual fiel à pregação e evidência real de render. **Objetivo ativo e incompleto.**

## Correção da auditoria anterior

O antigo `segments` só acionava legendas; não cortava a mídia. A demonstração `all-motions-demo` anterior só exercitava kinetic. A nova implementação separa `clips`, transcrição e eventos; renderiza cortes reais e testa os componentes individualmente. Afirmações antigas de cobertura total não devem ser usadas como evidência.

## Implementado nesta etapa

- Linha do tempo por frames, trim de vídeo/áudio e remapeamento de palavras/legendas.
- Propostas de corte mantendo unidades contínuas e ordem cronológica; EDL manual editável.
- ASR local com timestamps de palavras; execução real de Whisper tiny em áudio TTS local.
- Eventos visuais com duração e posição independentes, sem animação obrigatória.
- Biblioteca com 48 componentes visuais e uma opção de pausa: tipografia, máscara, perspectiva, trilha, impacto, partículas, formas, blueprint, terminal, etapas, timeline, conexões, circular, comparação, gráficos, contadores, citações, identidade, mídia, CSS 3D, luz e transições próprias.
- Paginação de legendas, destaque por palavra, palavras semânticas fornecidas, máscara, modo de alto contraste e ícone fornecido.
- Música/SFX opcionais, redução de música durante a fala e loudnorm em duas passagens.
- Prévia com revisão local, aprovação vinculada a EDL/mídias/composição e final condicionado a essa aprovação.
- Catálogo individual: 100 autorais + 45 Motif + 64 Revid + 5 Prompt Motion + 10 visuais. O catálogo diferencia implementação, parcial, dependência de asset, pendente e referência indexada.

## Evidência e limite dos testes

- 26 testes JavaScript e 8 testes Python passaram: cortes, palavras, ordem, validação, planejamento, legenda, mídia, câmeras, análise de áudio e máscaras.
- Regressão de render: vermelho/440 Hz → azul/~878,33 Hz; intervalo verde/660 Hz removido. Resultado em `docs/validation/render-results.json`.
- Prévia atual validada: 9,685s, H.264/AAC, 1080×1920, pico -2,2 dBFS, média -18,5 dBFS.
- Galeria atual: 48 componentes, 86,4s, 2592 frames, H.264/AAC, 1080×1920.
- Contatos visuais corrigidos foram inspecionados. B-roll local e ducking também passaram em testes no MP4 exportado.
- Os renders atuais foram feitos com PNG/BT.709, resultando em `yuv420p`, range TV. A decodificação integral passou.
- O bloqueio anterior da revisão automática por limite de uso foi superado. Os renders posteriores e seus hashes estão em `docs/validation/render-results.json`.
- O recorte de pessoas foi integrado como ferramenta local. Inferência real e alpha foram testados em fixtures vazios; não há validação da qualidade em um pregador.
- Nenhuma pregação real foi validada. O ASR errou “Reels” como “reals”. Não há aprovação editorial humana nem `final.mp4` aprovado desta etapa.

## Trabalho restante, preservando o escopo

1. Completar cada entrada `partial`/`pending` de `docs/COBERTURA.md`, incluindo normalização de cor e comportamentos específicos ainda aproximados.
2. Ampliar validação de legibilidade e fidelidade das receitas e a escolha contextual de motions; parâmetros e testes sintéticos não provam acabamento premium em cada referência.
3. Integrar automaticamente preparo/segmentação/rastreamento e assets/modelos próprios de 3D. O recorte local ainda exige entrada alinhada à edição; CSS 3D não comprova reprodução de produtos de terceiros.
4. Curar autoria e URL individual dos originais externos. Os 45 Motif e 64 Revid não são cópias literais verificadas; o objetivo de 100 originais externos continua aberto.
5. Conferir imagens originais V01–V10, que não estão no repositório. O timing desses screenshots nunca foi verificado.
6. Testar com culto autorizado: fidelidade bíblica, limites dos cortes, grafia de nomes/versículos, voz, enquadramento e escolha visual contextual.
7. Acompanhar a sincronização pelo commit Git. As evidências, comandos e limites desta etapa estão em `ETAPA-COMPOSICAO-E-AUDIO.md`.

O código de terceiros sem licença não foi copiado. Os componentes são implementação própria das técnicas; equivalência visual premium exige comparação com a referência autorizada e o vídeo real.
