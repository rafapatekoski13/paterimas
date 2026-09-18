(() => {
  'use strict';
  const $=id=>document.getElementById(id), C=window.PaterimasCollection;
  const ANSWER_MS=50000, PREPARE_MS=3000;
  let collection={attacks:[],beats:[]}, attackBag=[],beatBag=[],lastAttack='',lastBeat='';
  let currentAttack=null,currentBeat=null,attackPlayer=null,beatPlayer=null,initPromise=null,apiPromise=null;
  let phase='idle',paused=false,playing=false,busy=false,epoch=0,round=0,completed=0;
  let elapsed=0,anchor=null,useBeat=false,useWords=false,interval=8000,nextWordAt=0,wordBag=[],lastWord='';
  let phaseError=false, pendingBeatError=null;
  const words=[...new Set(window.RIMA_WORDS)];
  const active=()=>['attack','prepare','answer'].includes(phase);
  const clock=()=>elapsed+(anchor===null?0:performance.now()-anchor);
  function freeze(){elapsed=clock();anchor=null;}
  function resumeClock(){if(anchor===null)anchor=performance.now();}
  function resetClock(){elapsed=0;anchor=null;}
  function message(text,error=false){$('response-message').textContent=text;$('response-message').classList.toggle('error',error);}
  function shuffle(list){const bag=[...list];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}return bag;}
  function drawItem(kind){
    const list=kind==='attack'?collection.attacks:collection.beats;
    let bag=kind==='attack'?attackBag:beatBag;
    const previous=kind==='attack'?lastAttack:lastBeat;
    if(!bag.length){bag=shuffle(list);if(bag.length>1&&bag[bag.length-1].id===previous)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];}
    const item=bag.pop();
    if(kind==='attack'){attackBag=bag;lastAttack=item.id;}else{beatBag=bag;lastBeat=item.id;}
    return item;
  }
  function showWord(){
    if(!wordBag.length){wordBag=shuffle(words);if(wordBag.length>1&&wordBag[wordBag.length-1]===lastWord)[wordBag[0],wordBag[wordBag.length-1]]=[wordBag[wordBag.length-1],wordBag[0]];}
    lastWord=wordBag.pop();$('response-word').textContent=lastWord;nextWordAt=clock()+interval;
  }
  function stopPlayers(){playing=false;attackPlayer?.pauseVideo?.();beatPlayer?.pauseVideo?.();}
  function ui(){
    const on=active();
    $('response-start').textContent=on?(paused?'▶ Continuar':'Ⅱ Pausar'):phase==='finished'?'▶ Próximo ataque':'▶ Começar treino';
    $('response-start').disabled=busy||!collection.attacks.length;
    $('response-stop').disabled=!on&&!busy;
    $('response-next').disabled=busy||!round||!collection.attacks.length;
    $('response-use-beat').disabled=on||busy||!collection.beats.length;
    $('response-use-words').disabled=on||busy;
    $('response-interval').disabled=on||busy||!$('response-use-words').checked;
    $('response-skip-word').hidden=!useWords;
    $('response-skip-word').disabled=phase!=='answer'||paused||!playing;
    $('response-round').textContent=round;$('response-completed').textContent=completed;
    $('response-status').textContent=phaseError?'VÍDEO INDISPONÍVEL':paused?'EM PAUSA':busy?'CARREGANDO':({idle:'PRONTO',attack:playing?'OUÇA O ATAQUE':'AGUARDANDO O VÍDEO',prepare:'PREPARA',answer:playing?'SUA VEZ':'AGUARDANDO O BEAT',finished:'RESPOSTA ENCERRADA'})[phase];
    for(const name of ['attack','prepare','answer'])$('step-'+name).classList.toggle('current',phase===name);
  }
  function tick(){
    if(!paused&&!busy&&!phaseError){
      if(phase==='attack'&&playing&&attackPlayer.getCurrentTime()>=currentAttack.endSeconds-.03) prepare();
      if(phase==='prepare'&&clock()>=PREPARE_MS) beginAnswer();
      if(phase==='answer'&&playing){
        if(clock()>=ANSWER_MS)finish();
        else if(useWords&&clock()>=nextWordAt)showWord();
      }
    }
    const value=phase==='prepare'?Math.max(0,Math.ceil((PREPARE_MS-clock())/1000)):phase==='answer'?Math.max(0,Math.ceil((ANSWER_MS-clock())/1000)):phase==='finished'?0:50;
    $('response-time').textContent=value;
    $('response-time-label').textContent=phase==='prepare'?'SEGUNDOS PARA ENTRAR':phase==='attack'?'SUA RESPOSTA COMEÇA APÓS O ATAQUE':'SEGUNDOS PARA RESPONDER';
    $('response-progress').style.transform=`scaleX(${phase==='answer'?Math.max(0,1-clock()/ANSWER_MS):phase==='finished'?0:1})`;
    $('response-word-timer').textContent=phase==='answer'&&useWords?`Próxima palavra em ${Math.max(0,Math.ceil((nextWordAt-clock())/1000))} s`:'';
    requestAnimationFrame(tick);
  }
  function ensureAPI(){
    if(window.YT?.Player)return Promise.resolve();
    if(apiPromise)return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(()=>{apiPromise=null;script.remove();reject(Error('O YouTube não respondeu. Confira sua conexão e tente novamente.'));},15000);
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve();};
      script.onerror=()=>{clearTimeout(timer);apiPromise=null;script.remove();reject(Error('Não foi possível conectar ao YouTube.'));};
      script.src='https://www.youtube.com/iframe_api';document.head.append(script);
    });return apiPromise;
  }
  async function ensurePlayers(){
    if(initPromise)return initPromise;
    initPromise=(async()=>{
      await ensureAPI();
      await Promise.all(['attack','beat'].map(kind=>new Promise((resolve,reject)=>{
        const id=`response-${kind}-player`;
        if(!$(id)){const host=document.querySelector(kind==='attack'?'#selected-attack + .video-frame':'#selected-beat + .video-frame');const div=document.createElement('div');div.id=id;host.replaceChildren(div);}
        const timer=setTimeout(()=>reject(Error('O player demorou para carregar. Tente novamente.')),15000);
        const player=new YT.Player(id,{width:'100%',height:'100%',playerVars:{playsinline:1,rel:0,origin:location.origin},events:{
          onReady:({target})=>{clearTimeout(timer);target.getIframe().title=kind==='attack'?'Ataque da rodada':'Beat da resposta';resolve();},
          onStateChange:e=>playerState(kind,e.data),onError:e=>playerError(kind,e.data)
        }});
        if(kind==='attack')attackPlayer=player;else beatPlayer=player;
      })));
    })().catch(error=>{attackPlayer?.destroy?.();beatPlayer?.destroy?.();attackPlayer=null;beatPlayer=null;initPromise=null;throw error;});
    return initPromise;
  }
  function playerState(kind,data){
    if(busy||phaseError||!active())return;
    if((kind==='attack'&&phase!=='attack')||(kind==='beat'&&(phase!=='answer'||!useBeat)))return;
    const player=kind==='attack'?attackPlayer:beatPlayer,item=kind==='attack'?currentAttack:currentBeat;
    if(!item||player.getVideoData?.().video_id!==C.youtube(item.youtubeUrl).id)return;
    if(data===1){
      const duration=player.getDuration();
      const start=kind==='attack'?item.startSeconds:item.dropSeconds;
      if(duration>0&&(start>=duration||(kind==='attack'&&item.endSeconds>duration+.5))){playerError(kind,'range');return;}
      paused=false;playing=true;if(kind==='beat'){resumeClock();if(useWords&&!lastWord)showWord();}
      message(kind==='attack'?'Escute o trecho. A preparação começa automaticamente no final.':'Responda ao ataque. Seus 50 segundos estão valendo.');ui();
    }else if(data===3){freeze();playing=false;message('Vídeo carregando. Seu tempo está preservado.');ui();}
    else if(data===2&&playing){freeze();playing=false;paused=true;message('Treino pausado. Continue quando quiser.');ui();}
    else if(data===0&&!paused){
      if(kind==='attack')prepare();
      else {freeze();playing=false;beatPlayer.loadVideoById({videoId:C.youtube(item.youtubeUrl).id,startSeconds:item.dropSeconds});message('O beat terminou. Retomando do drop para completar a resposta.');ui();}
    }
  }
  function playerError(kind,code){
    if(kind==='beat'&&['attack','prepare'].includes(phase)&&currentBeat){pendingBeatError=code;return;}
    if(!active()||(kind==='attack'&&phase!=='attack')||(kind==='beat'&&(phase!=='answer'||!useBeat)))return;
    freeze();paused=true;phaseError=true;stopPlayers();
    const detail=code==='range'?'O trecho ou drop está fora da duração do vídeo.':[101,150].includes(code)?'O vídeo não permite incorporação.':code===100?'O vídeo foi removido ou é privado.':'O YouTube não conseguiu reproduzir o vídeo.';
    message(`${detail} ${kind==='beat'?'Continue sem beat ou avance para outro ataque.':'Confira as minutagens no cadastro ou avance para outro ataque.'}`,true);
    $('response-without-beat').hidden=kind!=='beat';ui();
  }
  async function nextRound(){
    if(!collection.attacks.length||busy)return;
    const token=++epoch;freeze();phase='idle';paused=false;phaseError=false;pendingBeatError=null;stopPlayers();resetClock();
    busy=true;round++;useBeat=$('response-use-beat').checked&&!!collection.beats.length;useWords=$('response-use-words').checked;
    interval=Number($('response-interval').value)*1000;wordBag=[];lastWord='';nextWordAt=0;
    currentAttack=drawItem('attack');currentBeat=useBeat?drawItem('beat'):null;
    $('selected-attack').textContent=`${currentAttack.title} · ${C.formatTime(currentAttack.startSeconds)} → ${C.formatTime(currentAttack.endSeconds)}`;
    $('selected-beat').textContent=currentBeat?`${currentBeat.title} · drop ${C.formatTime(currentBeat.dropSeconds)}`:'À capela';
    $('response-word').textContent='Escute o ataque.';$('response-without-beat').hidden=true;$('response-beat-panel').hidden=!useBeat;
    message('Preparando os vídeos. Nenhum tempo de resposta está sendo consumido.');ui();
    try{
      await ensurePlayers();if(token!==epoch)return;
      busy=false;phase='attack';playing=false;
      if(currentBeat)beatPlayer.cueVideoById({videoId:C.youtube(currentBeat.youtubeUrl).id,startSeconds:currentBeat.dropSeconds});
      attackPlayer.loadVideoById({videoId:C.youtube(currentAttack.youtubeUrl).id,startSeconds:currentAttack.startSeconds,endSeconds:currentAttack.endSeconds});
      message('Aguardando o ataque. Se necessário, aperte play no player do ataque.');ui();
    }catch(error){if(token!==epoch)return;busy=false;phase='idle';message(error.message,true);ui();}
  }
  function prepare(){
    if(phase!=='attack')return;
    phase='prepare';paused=false;freeze();stopPlayers();resetClock();resumeClock();$('response-word').textContent='Prepara a resposta.';message('O beat entra após a contagem.');ui();
  }
  function beginAnswer(){
    phase='answer';resetClock();playing=false;$('response-word').textContent=useWords?'A primeira palavra vem com o beat.':'Agora é com você.';
    if(useBeat&&pendingBeatError!==null){playerError('beat',pendingBeatError);return;}
    if(useBeat){beatPlayer.seekTo(currentBeat.dropSeconds,true);beatPlayer.playVideo();message('Aguardando o beat. Se necessário, aperte play no player do beat.');}
    else{playing=true;resumeClock();if(useWords)showWord();message('À capela: 50 segundos para responder.');}
    ui();
  }
  function finish(){freeze();elapsed=ANSWER_MS;phase='finished';paused=false;completed++;stopPlayers();message('50 segundos concluídos. Quando estiver pronto, siga para o próximo ataque.');ui();}
  function pause(){if(!active()||paused)return;freeze();paused=true;stopPlayers();message('Treino pausado. Tempo e palavras preservados.');ui();}
  function resume(){
    if(phaseError){message('Este vídeo não está disponível. Use Próximo ataque ou continue sem beat, se disponível.',true);return;}
    paused=false;
    if(phase==='prepare')resumeClock();
    else if(phase==='attack')attackPlayer.playVideo();
    else if(useBeat)beatPlayer.playVideo();
    else{playing=true;resumeClock();}
    message('Retomando o treino. Se o vídeo não tocar, aperte play no player.');ui();
  }
  function stop(){++epoch;freeze();phase='idle';paused=false;busy=false;phaseError=false;stopPlayers();resetClock();$('response-without-beat').hidden=true;message('Treino encerrado. As respostas concluídas ficam no contador até recarregar a página.');ui();}
  try{collection=C.read();}catch{message('Não foi possível ler sua coleção. Importe um JSON válido na página Ataques e beats.',true);}
  $('response-collection').textContent=`Ataques: ${collection.attacks.length} · Beats: ${collection.beats.length}`;
  $('response-use-beat').checked=!!collection.beats.length;
  $('selected-beat').textContent=collection.beats.length?'Escolhido a cada rodada, a partir do drop.':'À capela';
  $('beat-mode-hint').textContent=collection.beats.length>1?'Os beats alternam a cada resposta, sem repetir até passar pela lista.':collection.beats.length===1?'O mesmo beat será usado em todas as respostas, sempre a partir do drop.':'Sem beats cadastrados: o treino será à capela.';
  if(!collection.attacks.length)message('Cadastre ou importe pelo menos um ataque para começar.');
  $('response-start').addEventListener('click',()=>{if(!active())nextRound();else if(paused)resume();else pause();});
  $('response-next').addEventListener('click',nextRound);$('response-stop').addEventListener('click',stop);
  $('response-use-words').addEventListener('change',ui);
  $('response-skip-word').addEventListener('click',()=>{if(phase==='answer'&&!paused&&playing&&useWords)showWord();});
  $('response-without-beat').addEventListener('click',()=>{if(phase!=='answer')return;useBeat=false;phaseError=false;paused=false;playing=true;beatPlayer.pauseVideo();$('response-without-beat').hidden=true;$('selected-beat').textContent='À capela';resumeClock();if(useWords&&!lastWord)showWord();message('Resposta retomada sem beat, com o tempo restante preservado.');ui();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  ui();requestAnimationFrame(tick);
})();
