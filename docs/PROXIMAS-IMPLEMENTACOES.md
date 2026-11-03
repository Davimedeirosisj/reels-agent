# Próximas implementações do objetivo integral

O objetivo continua sendo implementar os prompts e referências do repositório. A existência de componentes e testes próprios não encerra a comparação de cada fonte.

1. Concluído nesta etapa: a busca de tamanho de legenda inclui o mínimo exato, mesmo com máximo fracionário. O caso de dez letras/largura 106/máximo 20.5/mínimo 20/padding 6 passou no teste.
2. Concluído nesta etapa: validação por geometria, aceitando ângulos zero, ponta de cone com raio zero e parâmetros booleanos. Dimensões/segmentos inválidos continuam rejeitados.
3. Completar A050 (acessibilidade), A094 (revisão espacial) e A096 (controle de ritmo), preservando contexto e palavra falada. A documentação de cobertura mantém esses estados parciais.
4. Preparo automático e suavização com fluxo óptico implementados. A pregação completa foi processada (4321 frames) e renderizada; dez quadros do alpha codificado foram inspecionados. Conferir integralmente movimento e bordas de vidro/dedos/cabelo; processamento completo não comprova acabamento premium em toda a gravação.
5. Integrar pós-processamento solicitado por referências como M016, com reprodução determinística e controles opcionais. Bloom/grão/aberração cromática ainda não estão integrados.
6. Ampliar assets/modelos e verificar cada referência com comparação visual própria, sem copiar código ou redistribuir texto sem autorização. As dez imagens V01–V10 continuam ausentes.
7. Concluir revisão humana da pregação e das legendas. Os testes técnicos e recibos sintéticos não são aprovação editorial real.
8. Âncoras por frase/ocorrência e localização facial por amostragem foram implementadas e testadas. Completar a revisão espacial com limites dos pixels animados/legendas e tratamento das incertezas; legenda móvel, alternância FULL/card e cortes J/L com conferência das emendas por fala continuam pendentes. Ver `references/skill-reel-felpborges.md`. O motor externo não foi copiado nem executado.
9. Proteção dos destinos de `preview`/`final` e estabilidade do código implementadas. Sete colisões foram rejeitadas pelo CLI; aliases físicos também são conferidos. A nova rodada de regressões/render completo valida a integração com as âncoras.
10. Melhorar a orientação/reconciliação de âncoras após correções no editor de transcrição: remover o alinhamento de um segmento invalida suas âncoras por palavra. Realinhamento ou tempo visual explícito continuam necessários; não inventar um novo onset.

Evidência da etapa atual: `ETAPA-RECORTE-AUTOMATICO.md`, `validation/render-results.json` e `validation/real-sermon-results.json`. O projeto não está declarado integralmente concluído.
