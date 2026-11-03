# Próximas implementações do objetivo integral

O objetivo continua sendo implementar os prompts e referências do repositório. A existência de componentes e testes próprios não encerra a comparação de cada fonte.

1. Corrigir e testar tamanhos fracionários no ajuste de legenda: a busca atual decrementa 1px e pode pular o mínimo exato quando o máximo tem fração. Caso: um token de dez letras, medição `texto.length * tamanho * 0.5`, largura 106, máximo 20.5 e mínimo 20, padding 6. O mínimo cabe, mas a busca atual sinaliza overflow.
2. Refinar validação dos argumentos das primitivas 3D. Ela exige todos positivos e rejeita parâmetros angulares zero válidos e cones com raio superior zero. Validar cada argumento conforme sua geometria; cobrir intervalos angulares e raios com testes.
3. Completar A050 (acessibilidade), A094 (revisão espacial) e A096 (controle de ritmo), preservando contexto e palavra falada. A documentação de cobertura mantém esses estados parciais.
4. Automatizar preparo da tomada editada para segmentação, acompanhar movimentos e avaliar bordas no vídeo completo. Testes de quatro quadros não comprovam todo o recorte do pregador.
5. Integrar pós-processamento solicitado por referências como M016, com reprodução determinística e controles opcionais. Bloom/grão/aberração cromática ainda não estão integrados.
6. Ampliar assets/modelos e verificar cada referência com comparação visual própria, sem copiar código ou redistribuir texto sem autorização. As dez imagens V01–V10 continuam ausentes.
7. Concluir revisão humana da pregação e das legendas. Os testes técnicos e recibos sintéticos não são aprovação editorial real.

Evidência da etapa atual: `ETAPA-COR-3D-E-REVISAO.md` e `validation/render-results.json`. O projeto não está declarado integralmente concluído.
