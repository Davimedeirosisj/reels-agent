# Recorte automático e camadas atrás da pessoa

O comando `foreground` prepara as tomadas já cortadas, com a câmera, cor e transições geométricas da edição. Em seguida calcula uma camada VP9 com transparência, vinculada aos mesmos frames. A composição mantém o áudio da gravação original.

```powershell
node tools/engine.mjs foreground output/job.json output/recorte
node tools/engine.mjs preview output/recorte/job.with-foreground.json output/revisao
```

O modelo local deve existir em `cache/models/selfie_segmenter.tflite`. Consulte a licença e o model card em [Composição e áudio](ETAPA-COMPOSICAO-E-AUDIO.md). O comando não baixa pesos nem executa código de referências externas.

Um evento com `layer: "behind"` fica entre o vídeo base e a camada da pessoa. Textos, cores e posições continuam livres; o preparo não escolhe um estilo visual nem acrescenta gráficos obrigatórios. A opção só deve ser usada quando ajudar a mensagem e depois da conferência de bordas.

## Reprodução, cache e falhas

- Corte, câmera, cor, tamanho, ajuste do quadro, transições, bytes da gravação e versão do motor vinculam a camada à edição. Mudanças nessas entradas exigem novo preparo.
- Alterar somente o texto, música ou outro gráfico pode reutilizar a camada. Trocar o modelo ou a qualidade da máscara preserva o vídeo base validado quando sua geometria continua igual.
- `foregroundOptions` aceita `model`, `smoothing` (padrão 0,15), `motionCompensation` (padrão verdadeiro), `crf` (inteiro 0–63, padrão 16) e `lossless` (padrão falso). A opção sem perdas gera arquivos maiores. A qualidade efetiva precisa de inspeção visual.
- O fluxo óptico alinha a máscara anterior antes da suavização. A suavização é reiniciada nos cortes conhecidos e em mudanças visuais acentuadas. Não há reconhecimento de identidade.
- Ausências de detecção são registradas por intervalo de frames; nesses intervalos, os eventos atrás da pessoa são suprimidos para evitar cobrir o pregador com uma máscara ausente. Isso não certifica a qualidade das bordas nos demais frames.
- Cache e preparação são conferidos por SHA-256. O estágio de render usa cópia imutável em cache e links quando o sistema permite; a gravação original nunca é um link de escrita do estágio.
- O relatório inclui frames, dimensões, regiões acompanhadas, ausências, parâmetros de codificação e tempo de processamento. O alpha é decodificado de verdade e o arquivo inteiro passa por decodificação antes de ser aceito.

## Limites

O modelo privilegia pessoas próximas da câmera. Não separa automaticamente um pastor específico de vários participantes. Vidro, dedos, cabelo, microfone, Bíblia, mãos rápidas e objetos finos precisam de conferência. Bounds são a união das regiões detectadas; não são prova de isolamento preciso de rosto ou mãos.

`python tools/inspect_foreground.py output/recorte/job.with-foreground.json output/inspecao --times "0,2,11.5"` extrai o alpha realmente codificado e o compara ao vídeo base, sem inferir uma máscara diferente para a inspeção. Os contatos com imagens da pregação ficam locais. Nas três amostras iniciais foram observadas regiões do púlpito de vidro que entram parcialmente na máscara e bordas suaves em mãos/cabelo; isso impede tratar a máscara como recorte de estúdio aprovado automaticamente.

## Testes desta etapa

Além de 52 testes JavaScript e 21 Python, foram executados testes de MP4 para cortes, mixagem, cor, duas linhas, 3D, revisão, aprovação sintética, oclusão real, cache e timeline com alpha. A galeria dos 56 componentes foi renderizada com 3024 frames e o mesmo fingerprint do motor.

Na amostra de quatro segundos, a comparação mediu 4743 pixels de letras encobertos pelo núcleo opaco e 507 visíveis no fundo; erro RGB médio 6,03 e 0,46, respectivamente. São regiões de um quadro selecionado, não certificação de todas as bordas. No teste de seis segundos com dois cortes, zoom e transição, a suavização reiniciou no frame 90; a janela de voz de quatro segundos que atravessa a junção teve correlação 0,999926 e atraso medido de 0 ms.

O primeiro teste 3D desta rodada excedeu o tempo de espera do R3F durante execuções simultâneas. Após o encerramento confirmado, a nova execução com menos tarefas passou, incluindo PNGs repetidos idênticos. Isso é uma limitação observada sob carga, não prova de causa única; não foi aumentado o tempo de espera para ocultar a falha. Consulte a orientação de [timeouts do Remotion](https://www.remotion.dev/docs/timeout).

As amostras técnicas com a palavra `TESTE` verificam a ordem das camadas e não representam a direção visual final de uma pregação. A revisão editorial, o áudio integral e a comparação com referências permanecem requisitos separados. Evidências atuais ficam em `docs/validation/`; não declarar aprovação humana por causa de testes automáticos.
