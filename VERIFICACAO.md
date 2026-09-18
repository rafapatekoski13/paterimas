# Verificação funcional

Verificação realizada na prévia HTTP local, usando o navegador integrado do Codex.

| Fluxo | Resultado observado |
|---|---|
| Iniciar sem vídeo | Palavra exibida, cronômetro iniciado e contador em 1. |
| Intervalo de 3 segundos | Contador chegou a 2 com a segunda palavra após 3 segundos. |
| Pausar e continuar | Estado “EM PAUSA”, tempo e palavra preservados; retomada disponível. |
| Parar e começar novamente | Resultados finais mantidos; nova sessão começa do zero. |
| Lista própria vazia | Início impedido com mensagem orientando adicionar palavras. |
| Palavras próprias | Cajati, Corinthians e universo foram aceitas; duplicata CAJATI removida. |
| Persistência local | As três palavras continuaram disponíveis após recarregar a página. |
| URL inválida | Link fora do YouTube rejeitado sem carregar player. |
| YouTube | Player real carregado com URL normal e link youtu.be. |
| Timestamp no link | `t=31s` preencheu o drop com `0:31`. |
| Marcar ponto atual | O controle preencheu o início com `0:07`, acompanhado de confirmação. |
| Drop inválido | `0:99` rejeitado com orientação de formato válido. |
| Treino com vídeo | Transição de “AGUARDANDO O BEAT” para “NO FLOW”; relógio e palavras avançaram. |
| Pausa com vídeo | Estado “EM PAUSA” e cronômetro em `00:31`. |
| Responsividade | Layout inspecionado no desktop e em 390 px; medidas em 320, 390 e 1440 px sem transbordamento horizontal após correção. |
| Console | Nenhum erro registrado na verificação do fluxo principal. |
| JavaScript | Arquivos de aplicação, dicionário e servidor passaram na checagem de sintaxe. |
| Leitura opcional WebMCP | Retornou o estado da sessão; parâmetro desconhecido rejeitado. |

Não foram simulados todos os bloqueios regionais, anúncios, falhas de rede ou vídeos privados do YouTube. O site apresenta mensagens para erros reportados pelo player e permite continuar sem vídeo. A aparência foi avaliada em navegador com tamanhos de tela ajustados, sem teste em aparelhos físicos. A precisão do seek depende do player do YouTube; não há sincronização musical por BPM.

Referência utilizada para o player: https://developers.google.com/youtube/iframe_api_reference

## Pular palavra
Verificado no navegador: ao clicar, farol mudou para oportunidade, o contador passou de 1 para 2 e o intervalo voltou a 8 segundos. O botão ficou desativado em pausa e após parar.


## Coleções de ataques e beats
Cadastro de ataque com começo maior que fim foi rejeitado. Cadastro válido, edição, persistência após recarregar e desfazer remoção foram verificados. Importação acrescentou registros, ignorou duplicados e rejeitou arquivo com registro inválido sem alterar a coleção. JSON gerado foi lido na interface e continha os dois trechos esperados; o evento de download não foi confirmado pela automação do navegador integrado, por isso há também um campo de JSON copiável. Layout de cadastro verificado em 390 px, sem transbordamento horizontal.

## Treino de resposta de 50 segundos
Foi executada uma rodada real usando os players do YouTube: ataque 0:31–0:40, preparação e beat a partir de 0:15. O relógio chegou a zero, exibiu RESPOSTA ENCERRADA e contabilizou 1 resposta concluída. Uma pausa preservou 35 segundos restantes durante o intervalo de inspeção; a retomada concluiu apenas o tempo restante. Pular palavra trocou coelho por terra. Com um único beat, a rodada seguinte reutilizou o mesmo beat e drop. Com dois beats, a rodada seguinte escolheu outro instrumental (drop 0:10) e outro ataque (0:01–0:03).

O JSON exportado incluiu attacks e beats com dropSeconds numérico. Importação conjunta adicionou 1 ataque e 1 beat, ignorando o beat duplicado. Arquivo com ataque válido e beat de drop negativo foi totalmente rejeitado, preservando os 2 ataques e os 2 beats. A coleção antiga sem beats foi lida normalmente. Os arquivos JavaScript passaram na checagem de sintaxe. Cenários de anúncios, vídeos restritos e todos os erros de rede não foram exaustivamente testados.


Modo à capela, sem palavras: observado SUA VEZ, 33 segundos restantes, À capela e Agora é com você. Layout do treino de resposta verificado em 390 px sem transbordamento horizontal.

