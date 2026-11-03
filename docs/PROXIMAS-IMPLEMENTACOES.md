# Próximas implementações do objetivo integral

O objetivo continua sendo implementar os prompts e referências do repositório. A existência de componentes e testes próprios não encerra a comparação de cada fonte.

1. Concluído nesta etapa: a busca de tamanho de legenda inclui o mínimo exato, mesmo com máximo fracionário. O caso de dez letras/largura 106/máximo 20.5/mínimo 20/padding 6 passou no teste.
2. Concluído nesta etapa: validação por geometria, aceitando ângulos zero, ponta de cone com raio zero e parâmetros booleanos. Dimensões/segmentos inválidos continuam rejeitados.
3. Completar A050 (acessibilidade), A094 (revisão espacial) e A096 (controle de ritmo), preservando contexto e palavra falada. A documentação de cobertura mantém esses estados parciais.
4. Preparo automático e suavização com fluxo óptico implementados. A pregação completa foi processada (4321 frames) e renderizada; dez quadros do alpha codificado foram inspecionados. Conferir integralmente movimento e bordas de vidro/dedos/cabelo; processamento completo não comprova acabamento premium em toda a gravação.
5. Integrar pós-processamento solicitado por referências como M016, com reprodução determinística e controles opcionais. Bloom/grão/aberração cromática ainda não estão integrados.
6. Ampliar assets/modelos e verificar cada referência com comparação visual própria, sem copiar código ou redistribuir texto sem autorização. As dez imagens V01–V10 continuam ausentes.
7. Concluir revisão humana da pregação e das legendas. Os testes técnicos e recibos sintéticos não são aprovação editorial real.
8. Completar os recursos identificados na referência técnica skill-reel: âncoras de motions por frase/ocorrência, rastreamento facial para revisão espacial, legenda móvel e alternância FULL/card opcionais; cortes J/L com conferência das emendas por fala. Ver `references/skill-reel-felpborges.md`. O motor externo não foi copiado nem executado.
9. Proteger também os destinos de `preview`/`final` contra coincidência com entradas e verificar estabilidade do código durante renders longos. O preparo de foreground e a criação de job já recusam sobrescrita das entradas; a gravação usada nesta validação fica em outro diretório e não foi sobrescrita.

Evidência da etapa atual: `ETAPA-RECORTE-AUTOMATICO.md`, `validation/render-results.json` e `validation/real-sermon-results.json`. O projeto não está declarado integralmente concluído.
