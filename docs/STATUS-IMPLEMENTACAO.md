# Estado da implementação — 03/11/2026

Objetivo completo: implementar os prompts e referências do repositório, com edição contextual fiel à pregação e evidência real de render. **Objetivo ativo e incompleto.**

## Correção da auditoria anterior

O antigo `segments` só acionava legendas; não cortava a mídia. A demonstração `all-motions-demo` anterior só exercitava kinetic. A nova implementação separa `clips`, transcrição e eventos; renderiza cortes reais e testa os componentes individualmente. Afirmações antigas de cobertura total não devem ser usadas como evidência.

## Implementado nesta etapa

- Linha do tempo por frames, trim de vídeo/áudio e remapeamento de palavras/legendas.
- Propostas de corte mantendo unidades contínuas e ordem cronológica; EDL manual editável.
- ASR local com timestamps de palavras; Whisper tiny em TTS e small em pregação real. Palavras com duração zero permanecem no texto, sem duração inventada.
- Eventos visuais com duração e posição independentes, sem animação obrigatória.
- Biblioteca com 53 componentes visuais e uma opção de pausa. Além de tipografia, dados, mídia, CSS 3D e transições, inclui fluxogramas com ramificações, redes, perguntas/respostas temporizadas, interfaces e definições com dados e origem explícitos. Não infere causalidade nem respostas da pregação.
- Paginação de legendas, destaque por palavra, palavras semânticas fornecidas, máscara, modo de alto contraste e ícone fornecido.
- Música/SFX opcionais, redução de música durante a fala e loudnorm em duas passagens.
- Prévia com revisão local, aprovação vinculada a EDL/mídias/composição e final condicionado a essa aprovação.
- Catálogo individual: 100 autorais + 45 Motif + 64 Revid + 5 Prompt Motion legados + 10 visuais. Curadoria adicional de 124 publicações Prompt Motion com 111 hashes de texto distintos. As 45 páginas Motif tiveram prompt, autoria e link do post original verificados. Disponibilidade de texto não comprova execução, equivalência visual ou licença de republicação.

## Evidência e limite dos testes

- 34 testes JavaScript e 16 testes Python passaram: cortes, palavras, ordem, validação, planejamento, legenda, mídia, câmeras, áudio, máscaras, grafos, UI, curadoria e comparação de voz.
- Regressão de render: vermelho/440 Hz → azul/~878,33 Hz; intervalo verde/660 Hz removido. Resultado em `docs/validation/render-results.json`.
- Prévia atual validada: 9,685s, H.264/AAC, 1080×1920, pico -2,2 dBFS, média -18,5 dBFS.
- Galeria atual: 53 componentes, 95,4s de vídeo, 2862 frames, H.264/AAC, 1080×1920.
- Contatos visuais corrigidos foram inspecionados. B-roll local e ducking também passaram em testes no MP4 exportado.
- Os renders atuais foram feitos com PNG/BT.709, resultando em `yuv420p`, range TV. A decodificação integral passou.
- O bloqueio anterior da revisão automática por limite de uso foi superado. Os renders posteriores e seus hashes estão em `docs/validation/render-results.json`.
- Pregação real completa renderizada: aproximadamente 2min24s, 4321 frames, 1080×1920/30 fps, título e quatro ênfases textuais, sem retirar ou reordenar trechos. MP4 e voz comparada ao original; hashes/medidas em `docs/validation/real-sermon-results.json`. Mídia, transcrição e quadros permanecem locais.
- A comparação de voz usa nove janelas de quatro segundos e mede correlação/atraso. Não comprova fidelidade semântica nem substitui escuta integral.
- Quatro máscaras foram inferidas e inspecionadas em quadros reais do pregador. Púlpito de vidro, dedos e objetos ainda exigem revisão de borda. Não foi aplicado alpha em toda a pregação.
- GoBold não está disponível; Arial instalada foi usada. O enquadramento original foi preservado; o sujeito já sai parcialmente do quadro em alguns momentos da gravação original.
- O ASR da pregação contém trechos duvidosos, duas correções ortográficas propostas e alertas de velocidade de leitura. **Não há aprovação editorial humana nem `final.mp4` aprovado.** O ASR sintético também errou “Reels” como “reals”.

## Trabalho restante, preservando o escopo

1. Completar cada entrada `partial`/`pending` de `docs/COBERTURA.md`, incluindo normalização de cor e comportamentos específicos ainda aproximados.
2. Ampliar validação de legibilidade e fidelidade das receitas e a escolha contextual de motions; parâmetros e testes sintéticos não provam acabamento premium em cada referência.
3. Integrar automaticamente preparo/segmentação/rastreamento e assets/modelos próprios de 3D. O recorte local ainda exige entrada alinhada à edição; CSS 3D não comprova reprodução de produtos de terceiros.
4. Comparar cada referência externa com sua direção visual e MP4 específico. A meta numérica de fontes foi atingida; hashes e técnicas genéricas não comprovam reprodução de 100 exemplos. Os 64 Revid continuam como referências audiovisuais.
5. Conferir imagens originais V01–V10, que não estão no repositório. O timing desses screenshots nunca foi verificado.
6. Concluir revisão humana da pregação autorizada: fidelidade bíblica, qualificações da fala, grafia, voz, enquadramento, sincronia e escolha visual contextual. Ver [Pregação real](ETAPA-PREGACAO-REAL.md).
7. Acompanhar a sincronização pelo commit Git. As evidências, comandos e limites desta etapa estão em `ETAPA-COMPOSICAO-E-AUDIO.md`.

O código de terceiros sem licença não foi copiado. Os componentes são implementação própria das técnicas; equivalência visual premium exige comparação com a referência autorizada e o vídeo real.
