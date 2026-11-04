# Roadmap

- [x] Criar repositório e documentação-base
- [ ] Importar e revisar os Markdown anteriores
- [x] Implementar inspeção de mídia
- [x] Implementar transcrição com timestamps
- [x] Criar EDL e motor de cortes com regressão real de vídeo/áudio
- [x] Integrar e renderizar legendas com timestamps, preservando palavras sem duração mensurável
- [x] Integrar Remotion e composição base de motion graphics
- [x] Gerar prévia e interface local de revisão; fluxo final depende de aprovação editorial
- [x] Adicionar teste reproduzível e vídeo de demonstração local
- [x] Entregar uma edição real com cortes, motions, transições, SFX e legendas, após revisão delegada e validação do MP4; ver `ETAPA-ENTREGA-FINAL.md`

## Segurança
Não guardar tokens de API no repositório. Verificar licenças e scripts antes de integrar código de terceiros.

## Cobertura completa em andamento

- [ ] Completar todas as receitas parciais/pendentes de `COBERTURA.md`
- [x] Verificar ao menos 100 textos originais externos com autoria/URL individual (111 hashes distintos Prompt Motion; mais 45 páginas Motif)
- [x] Validar PNG/BT.709, legendas, relógios de B-roll e ducking no render
- [x] Integrar preparo automático, segmentação e suavização com fluxo óptico; pregação de 4321 frames processada, com revisão de bordas ainda aberta
- [x] Renderizar modelos GLB e geometria própria com luzes/câmera Three.js
- [x] Renderizar telefone/tela e painéis, órbita e acabamento 3D opcional com bloom, aberração e grão repetível por frame
- [x] Implementar e testar cor por tomada, duas linhas medidas e revisão editável de transcrição
- [x] Corrigir transcrição por tempo/ocorrência, rejeitar ambiguidades e proteger os arquivos de entrada na criação do job
- [x] Sincronizar motions por frase/ocorrência e preservar entradas na exportação; testar intervalos no MP4
- [x] Acrescentar localização facial por amostragem e auditoria ligada à tomada preparada; cobertura contínua permanece não comprovada
- [x] Medir contraste configurável das legendas e exportar SRT/WebVTT com os mesmos frames; A050 integral permanece parcial
- [x] Analisar ritmo visual e espaçar somente decorações explicitamente flexíveis, sem retimar fala/legendas/cortes
- [x] Reconciliar âncoras após correções da transcrição e testar uma nova prévia do job corrigido
- [ ] Validar uma pregação real e registrar revisão de fidelidade
- [x] Renderizar uma pregação real completa e validar MP4, áudio e amostras visuais; revisão editorial humana continua aberta

Estado detalhado: `STATUS-IMPLEMENTACAO.md`. A edição real entregue tem revisão do agente e métricas em `validation/final-sermon-edit-results.json`; não equivale a escuta humana ou cobertura de todas as referências. A biblioteca não está declarada completa.

- [x] Executar pré-produção aprovada com casa procedural 3D, B-roll ilustrado, legendas revisadas por sentido e mixagem verificada no MP4; ver [Casa Hotel](ETAPA-CASA-HOTEL.md). Revisão humana continua aberta.
