# Estado da implementação — 03/11/2026

Objetivo completo: implementar os prompts e referências do repositório, com edição contextual fiel à pregação e evidência real de render. **Objetivo ativo e incompleto.**

A rodada atual acrescenta âncoras por frase, proteção das saídas e localização facial. Os MP4 curtos, galeria e nova prévia completa de 4321 frames passaram nos testes. A âncora reproduziu o tempo visual anterior e o MP4 completo permaneceu idêntico por hash; os recibos foram atualizados para o código e job atuais. A aprovação humana permanece aberta.

## Correção da auditoria anterior

O antigo `segments` só acionava legendas; não cortava a mídia. A demonstração `all-motions-demo` anterior só exercitava kinetic. A nova implementação separa `clips`, transcrição e eventos; renderiza cortes reais e testa os componentes individualmente. Afirmações antigas de cobertura total não devem ser usadas como evidência.

## Implementado nesta etapa

- Linha do tempo por frames, trim de vídeo/áudio e remapeamento de palavras/legendas.
- Propostas de corte mantendo unidades contínuas e ordem cronológica; EDL manual editável.
- ASR local com timestamps de palavras; Whisper tiny em TTS e small em pregação real. Palavras com duração zero permanecem no texto, sem duração inventada.
- Eventos visuais com duração e posição independentes, sem animação obrigatória.
- Biblioteca com 56 componentes visuais e uma opção de pausa. Inclui tipografia, dados, mídia, transições, grafos, interfaces e cenas Three.js com câmera/luzes/modelos GLB. Os conceitos e relações ilustrados exigem origem explícita.
- Paginação de legendas, destaque por palavra, palavras semânticas fornecidas, máscara, modo de alto contraste e ícone fornecido.
- Tipografia medida no navegador, composição equilibrada em até duas linhas e editor local de transcrição. Correções invalidam alinhamento por palavra e aprovação, mantendo o intervalo da frase.
- Cor por tomada e proposta de correspondência por área neutra explícita; ajuste opcional, com intensidade e proveniência.
- Preparo automático do vídeo editado para recorte da pessoa, fluxo óptico na suavização, reset nos cortes e camada alpha vinculada à geometria/bytes do vídeo. Camada aplicada somente nos momentos com gráficos atrás da pessoa; falhas de detecção suprimem esses gráficos.
- Cache de mídia por conteúdo, sem link de escrita para o original; troca da qualidade da máscara reaproveita o vídeo base validado.
- Música/SFX opcionais, redução de música durante a fala e loudnorm em duas passagens.
- Prévia com revisão local, aprovação vinculada a EDL/mídias/composição e final condicionado a essa aprovação.
- Catálogo individual: 100 autorais + 45 Motif + 64 Revid + 5 Prompt Motion legados + 10 visuais. Curadoria adicional de 124 publicações Prompt Motion com 111 hashes de texto distintos. As 45 páginas Motif tiveram prompt, autoria e link do post original verificados. Disponibilidade de texto não comprova execução, equivalência visual ou licença de republicação.

## Evidência e limite dos testes

- 65 testes JavaScript e 24 testes Python passaram. As integrações verificam também cor, duas linhas no MP4, cenas 3D repetíveis, editor no navegador e exportação final de fixture técnico. Tamanho fracionário de legenda e argumentos válidos de geometrias 3D receberam correções e testes.
- Âncoras por frase/ocorrência foram medidas em MP4; ausências, ambiguidades, palavras cortadas e alinhamento insuficiente são rejeitados. A exportação preserva entradas mesmo sob aliases físicos e verifica estabilidade do código/bytes. Veja [Âncoras e revisão espacial](ETAPA-ANCORAS-E-EXPORTACAO.md).
- Localização facial aplicada ao vídeo preparado completo: 541 amostragens, 512 com detecção. Não há reconhecimento de identidade nem garantia entre amostras. A094 permanece parcial; a revisão atual compara caixas estimadas com retângulos declarados dos gráficos.
- Correção de transcrição por tempo/ocorrência, com rejeição de ambiguidades e substrings. Trocas de frase removem alinhamento desatualizado; originais são preservados. O CLI corrigiu o erro conhecido do TTS/Whisper e rejeitou quatro tentativas de sobrescrever entradas/relatório.
- Regressão de render: vermelho/440 Hz → azul/~878,33 Hz; intervalo verde/660 Hz removido. Resultado em `docs/validation/render-results.json`.
- Prévia atual validada: 9,685s, H.264/AAC, 1080×1920, pico -2,2 dBFS, média -18,5 dBFS.
- Galeria atual: 56 componentes, 100,8s de vídeo, 3024 frames, H.264/AAC, 1080×1920.
- Contatos visuais corrigidos foram inspecionados. B-roll local e ducking também passaram em testes no MP4 exportado.
- Os renders atuais foram feitos com PNG/BT.709, resultando em `yuv420p`, range TV. A decodificação integral passou.
- O bloqueio anterior da revisão automática por limite de uso foi superado. Os renders posteriores e seus hashes estão em `docs/validation/render-results.json`.
- Pregação real completa renderizada: aproximadamente 2min24s, 4321 frames, 1080×1920/30 fps, título e quatro ênfases textuais, sem retirar ou reordenar trechos. MP4 e voz comparada ao original; hashes/medidas em `docs/validation/real-sermon-results.json`. Mídia, transcrição e quadros permanecem locais.
- A comparação de voz usa nove janelas de quatro segundos e mede correlação/atraso. Não comprova fidelidade semântica nem substitui escuta integral.
- Uma amostra real de quatro segundos passou pelo preparo automático, com zoom/cor, 120 máscaras e MP4 com texto atrás da pessoa. Comparação no quadro medido: 4743 pixels de letras ocluídos, 507 visíveis no fundo; erro RGB médio 6,03 no núcleo opaco e 0,46 no fundo transparente. O teste cobre a ordem das camadas e não todas as bordas. A troca de CRF reutilizou o vídeo base sem alterar seus bytes ou data de modificação. Veja [Recorte automático](ETAPA-RECORTE-AUTOMATICO.md).
- Preparação integral: 4321 máscaras, sem detecções vazias; VP9 com alpha de 137721843 bytes, 487,875s de processamento. Dez quadros do alpha codificado foram inspecionados; maior erro RGB médio no núcleo opaco: 1,9914. A camada é aplicada durante os 72 frames do destaque atrás da pessoa, não obrigatoriamente no vídeo inteiro. O MP4 completo passou na decodificação e na comparação de nove janelas de voz (correlação mínima 0,985742; atraso 0 ms). Bordas de vidro/dedos/cabelo ainda não têm aprovação integral.
- GoBold não está disponível; Arial instalada foi usada. O enquadramento original foi preservado; o sujeito já sai parcialmente do quadro em alguns momentos da gravação original.
- O ASR da pregação contém trechos duvidosos, duas correções ortográficas propostas e alertas de velocidade de leitura. **Não há aprovação editorial humana nem `final.mp4` aprovado.** O ASR sintético também errou “Reels” como “reals”.

## Trabalho restante, preservando o escopo

Casos de borda e sequência concreta: [Próximas implementações](PROXIMAS-IMPLEMENTACOES.md).

1. Completar as receitas parciais de acessibilidade, revisão espacial e controle de ritmo. Cor, duas linhas, editor e cenas 3D receberam implementação e regressões próprias nesta etapa.
2. Ampliar validação de legibilidade e fidelidade das receitas e a escolha contextual de motions; parâmetros e testes sintéticos não provam acabamento premium em cada referência.
3. Conferir integralmente bordas e movimento, sobretudo vidro, dedos, cabelo e objetos finos. O comando processou os 4321 frames e foi usado na prévia completa; dez quadros inspecionados não certificam todo o recorte. Modelos GLB e geometrias próprias já são renderizados em Three.js; decodificadores comprimidos e pós-processamento das referências ainda faltam.
4. Comparar cada referência externa com sua direção visual e MP4 específico. A meta numérica de fontes foi atingida; hashes e técnicas genéricas não comprovam reprodução de 100 exemplos. Os 64 Revid continuam como referências audiovisuais.
5. Conferir imagens originais V01–V10, que não estão no repositório. O timing desses screenshots nunca foi verificado.
6. Concluir revisão humana da pregação autorizada: fidelidade bíblica, qualificações da fala, grafia, voz, enquadramento, sincronia e escolha visual contextual. Ver [Pregação real](ETAPA-PREGACAO-REAL.md).
7. Acompanhar a sincronização pelo commit Git. A etapa atual está em [Cor, 3D e revisão](ETAPA-COR-3D-E-REVISAO.md); os registros anteriores continuam disponíveis.

O código de terceiros sem licença não foi copiado. Os componentes são implementação própria das técnicas; equivalência visual premium exige comparação com a referência autorizada e o vídeo real.
