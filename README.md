# paterimas

Treino de freestyle em português, sem IA, conta, dependências ou backend. HTML, CSS e JavaScript puros. O dicionário e o treino funcionam offline; somente o vídeo precisa de internet.

## Abrir

Com Node.js 18 ou superior, execute `npm start` nesta pasta e abra http://127.0.0.1:4173. O servidor apenas entrega os arquivos estáticos; nenhum dado é enviado a ele.

Também é possível abrir `dist/index.html` diretamente para treinar sem vídeo. Para o YouTube, use o endereço HTTP acima ou qualquer hospedagem estática: abrir via `file://` pode causar erro 153 por falta de identificação de origem.

Para hospedar, publique todos os arquivos de `dist/`. Nenhuma instalação ou compilação é necessária.

## Usar

1. Opcionalmente, cole um link do YouTube e clique em **Carregar**. São aceitos links de vídeos, youtu.be, Shorts, lives e embed. O vídeo precisa permitir incorporação.
2. Reproduza o vídeo e clique em **Marcar ponto atual**, ou digite o início em `min:seg` ou segundos. Ao iniciar uma nova sessão, o vídeo vai a esse ponto. Não há detecção automática do drop.
3. Escolha o intervalo de 3, 5, 8, 10 ou 15 segundos e a origem das palavras.
4. Em **Minhas palavras**, separe os termos por vírgulas, ponto e vírgula ou linhas. Clique em salvar. Limite: 500 termos, de até 60 caracteres. A lista fica somente neste navegador; limpar seus dados também remove a lista.
5. Clique em **Começar treino**. **Pausar** congela o tempo e a contagem; **Continuar** retoma a sessão. **Parar** encerra mantendo os resultados na tela. Começar novamente zera a sessão.

Sem vídeo, o treino começa imediatamente. Com vídeo, começa quando a reprodução é confirmada. Pausas e carregamento do player suspendem o relógio. Se o navegador impedir reprodução automática, clique no play do vídeo. Ao sair da aba, o treino pausa para não consumir palavras fora da tela.

As palavras são embaralhadas sem repetição até esgotar a lista. Não há repetição consecutiva entre rodadas, exceto em listas de uma palavra. O contador registra palavras exibidas, não avalia rimas nem detecta voz. As configurações ficam bloqueadas durante a sessão; pare para alterá-las. Não há gravação nem histórico permanente de sessões.

**Pular palavra** troca imediatamente a palavra durante o treino e reinicia o intervalo completo, sem alterar o beat nem zerar o tempo total. A nova palavra entra no contador de palavras exibidas. O botão fica desativado antes do início, em pausa, durante carregamento, após parar ou quando a lista só tem uma palavra.

## Cadastrar ataques

Abra **Cadastrar ataques** no menu. Informe um nome opcional, o link do vídeo e o começo/final do ataque em `min:seg`, `h:min:seg` ou segundos. O fim precisa ser maior que o início. Cada trecho pode ser ouvido, editado e removido, com opção de desfazer a última remoção. A prévia usa os limites de tempo do player do YouTube; tempos fracionários são arredondados para fora na reprodução. O cadastro pode ser feito offline, sem verificar a duração ou disponibilidade real do vídeo.

**Exportar JSON** reúne todos os ataques em um arquivo. A página também exibe o JSON para copiar caso o navegador não permita baixar. **Importar JSON** acrescenta ataques à coleção sem apagar os existentes e ignora trechos idênticos do mesmo vídeo. Se algum registro for inválido, o arquivo inteiro é rejeitado sem alterações. Limites: 1.000 ataques e 2 MB por arquivo.

Formato: `{"format":"paterimas.attacks","version":1,"attacks":[...],"beats":[...]}`. Cada ataque tem `title` (opcional), `youtubeUrl`, `startSeconds` e `endSeconds`. Cada beat tem `title` (opcional), `youtubeUrl` e `dropSeconds`. Os tempos são números em segundos. O campo `id` é gerado pelo site. Arquivos antigos sem `beats` continuam aceitos. O exemplo técnico está em `exemplo-ataques.json`; o vídeo usado como ataque nesse exemplo não é uma batalha real.

Os registros ficam no armazenamento local do navegador. Para transferir a outro dispositivo ou pessoa, envie o JSON e importe na página. Não há banco compartilhado, contas, feed comunitário ou publicação automática. Limpar os dados do navegador apaga os cadastros; guarde um JSON como backup.

## Beats e treino de resposta de 50 segundos

Na página **Ataques e beats**, cadastre os instrumentais informando o link e o drop. Ataques e beats são salvos juntos e exportados no mesmo JSON. É possível editar, remover e desfazer a última remoção de beat. Limite de 1.000 beats além dos 1.000 ataques.

Abra **Treino de resposta**. Ative ou desative beats e palavras aleatórias e escolha o intervalo das palavras. Clique em começar: o site toca o ataque entre as minutagens cadastradas, dá 3 segundos de preparação e abre 50 segundos para sua resposta. O relógio só avança enquanto o beat estiver tocando (ou durante a resposta à capela); pausas e carregamentos preservam o tempo. Se o navegador bloquear o início automático, use o play do player correspondente.

Com um beat, todas as respostas usam esse instrumental a partir do mesmo drop. Com vários, uma fila embaralhada passa por todos sem repetir antes de esgotar a lista; também evita repetir imediatamente na virada da fila. Os ataques seguem a mesma regra. Ao completar 50 segundos, o beat pausa e a rodada é contabilizada. Use **Próximo ataque** para continuar ou abandonar a rodada atual; rodadas interrompidas não contam como concluídas. Se o beat terminar antes dos 50 segundos, ele recomeça no drop. Um erro de beat permite continuar à capela com o tempo restante.

As palavras opcionais vêm do dicionário local e só aparecem na fase de resposta; **Pular palavra** reinicia o intervalo da palavra, sem reiniciar os 50 segundos. Sair da aba pausa a rodada. **Parar** encerra a rodada e libera configurações. Os contadores de rodadas e respostas são temporários; recarregar a página os zera. A coleção é lida ao abrir a página: depois de cadastrar em outra aba, recarregue o treino antes de começar. Não há gravação, transcrição ou avaliação de respostas.

## Arquivos

- `dist/index.html`: interface e estrutura acessível.
- `dist/styles.css`: layout responsivo, cores e estados.
- `dist/words.js`: dicionário editável de português.
- `dist/app.js`: sorteio, relógio, listas locais e YouTube IFrame Player API.
- `dist/ataques.html` e `dist/ataques.js`: cadastro, prévia e importação/exportação de ataques.
- `dist/collection.js`: validação e formato comum de ataques e beats.
- `dist/resposta.html` e `dist/resposta.js`: treino de resposta, controle dos players e relógio de 50 segundos.
- `server.mjs`: servidor estático opcional para pré-visualização local.

O YouTube recebe as solicitações de vídeo quando um link é carregado. Não há chamadas a modelos de IA, chaves de API ou serviços de geração de palavras.
