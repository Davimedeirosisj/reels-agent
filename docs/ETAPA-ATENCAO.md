# Ciclo da atenção — edição executada · 04/11/2026

Pré-produção aprovada pelo usuário executada em 35,967s, 1080×1920/30fps. O vídeo fonte integral permanece na ordem original. Foram aplicados seis eventos: dois diagramas de repetição, símbolo de cuidado, tipografia de tensão, telefone procedural Three.js e conclusão condicional. Voz original, legendas, trilha e quatro efeitos acompanham a edição.

## Evidências

- 1079 frames H.264/AAC, áudio 48kHz; decodificação integral passou.
- 101 palavras e 23 páginas; ordem conservada. A palavra sem duração mensurável foi preservada sem duração inventada.
- Áudio: -16.08 LUFS, -1.44 dBTP. Comparação em 18 janelas contíguas: correlação mínima 0.975801, atraso máximo 0ms.
- Quatro efeitos identificados, correlação residual mínima 0.813259. Música identificada independentemente, correlação residual 0.996190.
- 121 amostras faciais, 113 com detecção, 0 conflitos nas áreas verificadas. A inserção 3D intencional em tela cheia é excluída da auditoria de sobreposição. Sem garantia contínua entre amostras.
- 16 quadros codificados inspecionados, incluindo diferentes posições da câmera 3D. 81 testes JavaScript passaram.

SHA-256: 934deace0165a146948c0f1b830e6376f04b48c333e06beb1dfeddf15cdf6794. Métricas: [validation/atencao-results.json](validation/atencao-results.json).

## Implementação e correções

MotionsAtencao é uma direção opcional de blueprint, com layouts loop, protect, tension e closing. Cada elemento usa tempo local por frame; o número e a última etapa entram conforme o exemplo falado. O evento ui3d pode usar design atencao-phone para uma inserção de fundo escuro que preserva a região da legenda. O aparelho usa PhoneThree e SceneThree existentes.

A primeira prévia mostrou o painel lateral cortado e o telefone pouco legível. Na edição final, o painel foi aproximado e reduzido por panel.size, pois panel.scale não é aplicado pelo componente existente. A iluminação foi reforçada e o material clareado. Os rótulos do diagrama foram ajustados para caber integralmente. Dois quadros críticos foram conferidos antes da exportação completa. Os parâmetros ficam no projeto local; o MP4 corrigido foi gerado novamente e validado.

A normalização foi dinâmica. A auditoria da música em uma janela fixa de fala intensa não passou; a verificação final escolhe uma janela de um segundo com melhor relação de energia música/voz nos stems previstos, sem consultar a saída para a escolha. Termos de ganho suave da voz tratam a variação de loudnorm. O limiar de correlação foi mantido. A comparação integral e a de todos os efeitos permanecem independentes.

A revisão foi realizada pelo agente sob orientação do usuário; humanReviewed permanece false. O MP4 entregue é cópia idêntica ao render conferido, sem segunda compressão. Transcrição automática e enquadramento original ainda têm limitações; a inspeção visual é amostral. O resultado comprova esta edição, sem afirmar equivalência premium de todas as referências ou concluir a biblioteca.

Música, sons e gráficos são próprios. Mídia, transcrição, prompts com conteúdo da gravação e quadros ficam locais. O pacote de entrega inclui projeto, configuração, prompts aprovados, três trilhas separadas antes da normalização conjunta e código do motor.
