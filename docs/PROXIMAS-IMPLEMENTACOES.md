# Próximas implementações do objetivo integral

O objetivo continua sendo implementar os prompts e referências do repositório. A existência de componentes e testes próprios não encerra a comparação de cada fonte.

1. Concluído nesta etapa: a busca de tamanho de legenda inclui o mínimo exato, mesmo com máximo fracionário. O caso de dez letras/largura 106/máximo 20.5/mínimo 20/padding 6 passou no teste.
2. Concluído nesta etapa: validação por geometria, aceitando ângulos zero, ponta de cone com raio zero e parâmetros booleanos. Dimensões/segmentos inválidos continuam rejeitados.
3. Completar A050 (acessibilidade) e A094 (revisão espacial), preservando contexto e palavra falada. A050 já mede contraste e exporta SRT/WebVTT, sem certificar identificação de falantes/sons. A096 implementa análise de entradas/simultaneidade e espaçamento opcional de decorações; não desloca fala nem texto ligado à mensagem. Comparação editorial individual continua necessária.
4. Preparo automático e suavização com fluxo óptico implementados. A pregação completa foi processada (4321 frames) e renderizada; dez quadros do alpha codificado foram inspecionados. Conferir integralmente movimento e bordas de vidro/dedos/cabelo; processamento completo não comprova acabamento premium em toda a gravação.
5. Integrar pós-processamento solicitado por referências como M016, com reprodução determinística e controles opcionais. Bloom/grão/aberração cromática ainda não estão integrados.
6. Ampliar assets/modelos e verificar cada referência com comparação visual própria, sem copiar código ou redistribuir texto sem autorização. As dez imagens V01–V10 continuam ausentes.
7. Concluir revisão humana da pregação e das legendas. Os testes técnicos e recibos sintéticos não são aprovação editorial real.
8. Âncoras por frase/ocorrência e localização facial por amostragem foram implementadas e testadas. Completar a revisão espacial com limites dos pixels animados/legendas e tratamento das incertezas; legenda móvel, alternância FULL/card e cortes J/L com conferência das emendas por fala continuam pendentes. Ver `references/skill-reel-felpborges.md`. O motor externo não foi copiado nem executado.
9. Proteção dos destinos de `preview`/`final` e estabilidade do código implementadas. O teste atual inclui onze colisões pelo CLI, incluindo SRT/WebVTT; aliases físicos também são conferidos.
10. Reconciliação implementada: o padrão sinaliza realinhamento após corrigir o segmento; uma opção explícita preserva o tempo visual da prévia e guarda a antiga âncora para conferência. Navegador, job corrigido e novo MP4 são testados. Não há novo onset inventado nem aprovação automática.

Evidência da etapa atual: `ETAPA-RECORTE-AUTOMATICO.md`, `validation/render-results.json` e `validation/real-sermon-results.json`. O projeto não está declarado integralmente concluído.
