(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const unique = list => [...new Map(list.map(w => [w.toLocaleLowerCase('pt-BR'), w])).values()];
  const dictionary = unique(window.RIMA_WORDS);
  let custom = [], pool = [], bag = [], lastWord = '', state = 'idle';
  let elapsed = 0, anchor = 0, nextAt = 8000, interval = 8000, count = 0;
  let player = null, ready = false, videoId = '', useVideo = false, apiPromise = null, loadGeneration = 0;
  let pendingPlay = null;
  const active = () => ['running', 'paused', 'waiting'].includes(state);
  const time = ms => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function message(id, text, error = false) { $(id).textContent = text; $(id).classList.toggle('error', error); }
  function saveCustom() {
    const words = unique($('custom-words').value.split(/[,;\n]+/u).map(w => w.trim()).filter(Boolean));
    if (words.length > 500 || words.some(w => w.length > 60)) { message('custom-message', 'Use até 500 palavras, com no máximo 60 caracteres cada.', true); return false; }
    custom = words; $('custom-count').textContent = custom.length;
    try { localStorage.setItem('rima-livre.words.v1', JSON.stringify(custom)); message('custom-message', `${custom.length} palavras salvas neste navegador.`); }
    catch { message('custom-message', 'Palavras aplicadas. O navegador não permitiu salvar para a próxima visita.'); }
    return true;
  }
  try {
    const saved = JSON.parse(localStorage.getItem('rima-livre.words.v1') || '[]');
    if (Array.isArray(saved)) custom = unique(saved.filter(w => typeof w === 'string' && w.trim() && w.length <= 60).slice(0, 500));
  } catch { /* Treino continua mesmo sem armazenamento. */ }
  $('custom-words').value = custom.join(', '); $('custom-count').textContent = custom.length;
  function parseDrop(value) {
    const v = value.trim();
    if (/^\d+(?:[.,]\d+)?$/.test(v)) return Number(v.replace(',', '.'));
    if (/^\d+:[0-5]\d(?:[.,]\d+)?$/.test(v)) { const [m,s] = v.split(':'); return Number(m) * 60 + Number(s.replace(',', '.')); }
    return NaN;
  }
  function parseURL(value) {
    const raw = value.trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol)) throw Error('URL inválida');
    const host = url.hostname.toLowerCase(), path = url.pathname.split('/').filter(Boolean);
    let id;
    if (['youtu.be', 'www.youtu.be'].includes(host)) id = path[0];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(path[0]) ? path[1] : null;
    }
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) throw Error('Cole um link válido de vídeo do YouTube.');
    let t = url.searchParams.get('t') || url.searchParams.get('start') || '0';
    let seconds = /^\d+$/.test(t) ? Number(t) : 0;
    const match = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (match && t) seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
    return {id, seconds};
  }
  function ensureAPI() {
    if (window.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => { script.remove(); apiPromise = null; reject(Error('O YouTube demorou para responder. Tente carregar novamente ou treine sem vídeo.')); }, 15000);
      window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); resolve(); };
      script.onerror = () => { clearTimeout(timeout); script.remove(); apiPromise = null; reject(Error('Não foi possível conectar ao YouTube. Confira sua conexão ou treine sem vídeo.')); };
      script.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(script);
    });
    return apiPromise;
  }
  function freeze() { if (state === 'running') elapsed = performance.now() - anchor; }
  function draw() {
    const current = state === 'running' ? performance.now() - anchor : elapsed;
    $('elapsed').textContent = time(current); $('used').textContent = count;
    const left = Math.max(0, nextAt - current);
    $('remaining').textContent = `${Math.ceil(left / 1000)} s`;
    $('progress').style.transform = `scaleX(${Math.min(1, left / interval)})`;
  }
  function controls() {
    const isActive = active();
    $('status').textContent = ({idle:'PRONTO PARA RIMAR',running:'NO FLOW',waiting:'AGUARDANDO O BEAT',paused:'EM PAUSA',ended:'TREINO ENCERRADO'})[state];
    $('start').innerHTML = state === 'running' || state === 'waiting' ? 'Ⅱ <span>Pausar treino</span>' : state === 'paused' ? '▶ <span>Continuar treino</span>' : '▶ <span>Começar treino</span>';
    $('stop').disabled = !isActive;
    $('skip').disabled = state !== 'running' || pool.length < 2;
    for (const id of ['intervals','source','custom-words','save-words','video-url','drop']) $(id).disabled = isActive;
    $('video-form').querySelector('button').disabled = isActive;
    $('mark-drop').disabled = isActive || !ready;
    $('use-video').disabled = isActive || !ready;
    draw();
  }
  function nextWord() {
    if (!bag.length) {
      bag = [...pool];
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === lastWord) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    lastWord = bag.pop(); count++; $('word').textContent = lastWord;
    $('word').classList.remove('active-word'); void $('word').offsetWidth; $('word').classList.add('active-word');
    $('word-label').textContent = 'ENCONTRE SEU VERSO';
    $('word-hint').textContent = pool.length === 1 ? 'Adicione mais palavras para variar o treino.' : 'Puxa uma ideia. Conecta. Continua.';
  }
  function skipWord() {
    if (state !== 'running' || pool.length < 2) return;
    elapsed = performance.now() - anchor;
    nextWord();
    nextAt = elapsed + interval;
    draw();
  }
  function runClock() {
    clearTimeout(pendingPlay);
    if (!count) nextWord();
    anchor = performance.now() - elapsed; state = 'running'; controls();
    message('session-message', useVideo ? 'Palavras e tempo acompanham as pausas do vídeo.' : 'À capela, no seu ritmo.');
  }
  function pause(fromVideo = false) {
    if (!active()) return;
    freeze(); state = 'paused'; clearTimeout(pendingPlay);
    if (useVideo && !fromVideo) player?.pauseVideo();
    controls(); message('session-message', 'Seu tempo está pausado. Continue quando quiser.');
  }
  function stop() {
    if (!active()) return;
    freeze(); state = 'ended'; clearTimeout(pendingPlay);
    if (useVideo) player?.pauseVideo();
    controls(); message('session-message', `Treino encerrado: ${time(elapsed)} e ${count} palavras. Começar abre uma nova sessão.`);
  }
  function requestPlay() {
    state = 'waiting'; controls(); player.playVideo();
    message('session-message', 'Aguardando reprodução. Se necessário, aperte play no vídeo.');
    clearTimeout(pendingPlay);
    pendingPlay = setTimeout(() => { if (state === 'waiting') message('session-message', 'O vídeo ainda não começou. Aperte play no player ou pare e desmarque “Usar o vídeo no treino”.'); }, 7000);
  }
  function start() {
    if (state === 'running' || state === 'waiting') { pause(); return; }
    if (state === 'paused') { if (useVideo) requestPlay(); else runClock(); return; }
    const mode = $('source').value;
    if (mode !== 'local' && !saveCustom()) return;
    pool = mode === 'custom' ? [...custom] : mode === 'local' ? [...dictionary] : unique([...dictionary, ...custom]);
    if (!pool.length) { message('session-message', 'Adicione suas palavras ou selecione o dicionário para começar.', true); $('custom-words').closest('details').open = true; $('custom-words').focus(); return; }
    useVideo = $('use-video').checked;
    const drop = parseDrop($('drop').value);
    if (useVideo && (!ready || !Number.isFinite(drop) || drop < 0 || (player.getDuration() > 0 && drop >= player.getDuration()))) {
      message('session-message', 'Digite um início válido antes do fim do vídeo (ex.: 0:31).', true); return;
    }
    interval = Number(document.querySelector('[name="interval"]:checked').value) * 1000;
    elapsed = 0; count = 0; nextAt = interval; bag = []; lastWord = '';
    $('word').textContent = 'Prepara…'; $('word').classList.remove('active-word');
    if (useVideo) { player.seekTo(drop, true); requestPlay(); } else runClock();
  }
  async function loadVideo(event) {
    event.preventDefault();
    if (active()) return;
    let parsed;
    try { parsed = parseURL($('video-url').value); } catch { message('video-message', 'Cole um link válido de vídeo do YouTube.', true); return; }
    const generation = ++loadGeneration;
    ready = false; $('use-video').checked = false; controls();
    $('video-form').querySelector('button').disabled = true;
    message('video-message', 'Conectando ao YouTube…');
    try {
      await ensureAPI();
      if (generation !== loadGeneration) return;
      player?.destroy(); videoId = parsed.id;
      if (!$('player')) { const target = document.createElement('div'); target.id = 'player'; document.querySelector('.video-frame').prepend(target); }
      $('video-placeholder').hidden = true;
      $('drop').value = time(parsed.seconds * 1000).replace(/^0(?=\d:)/, '');
      player = new YT.Player('player', {
        videoId, width:'100%', height:'100%', host:'https://www.youtube.com',
        playerVars:{playsinline:1,rel:0,origin:location.origin,start:parsed.seconds},
        events:{
          onReady: () => {
            ready = true; const frame = player.getIframe(); frame.title = 'Beat do YouTube';
            if (!active()) $('use-video').checked = true;
            controls(); message('video-message', 'Vídeo carregado. Ouça e marque o ponto do drop.');
          },
          onStateChange: ({data}) => {
            if (!useVideo || !active()) return;
            if (data === 1 && state !== 'running') runClock();
            else if (data === 2 && state === 'running') pause(true);
            else if (data === 3 && state === 'running') { freeze(); state = 'waiting'; controls(); message('session-message', 'O vídeo está carregando. Tempo e palavras em espera.'); }
            else if (data === 0) stop();
          },
          onError: ({data}) => {
            if (useVideo && active()) pause(true);
            ready = false; $('use-video').checked = false; useVideo = false; controls();
            const reason = [101,150].includes(data) ? 'Este vídeo não permite incorporação.' : data === 100 ? 'Vídeo indisponível ou privado.' : data === 153 ? 'O YouTube recusou este ambiente. Abra o site via http://localhost ou em uma hospedagem.' : 'Não foi possível reproduzir este vídeo.';
            message('video-message', `${reason} Tente outro link ou treine sem vídeo.`, true);
            if (state === 'paused') message('session-message', 'Vídeo indisponível. Continuar retoma o treino sem vídeo.');
          }
        }
      });
    } catch (error) { message('video-message', error.message, true); controls(); }
    finally { if (!active()) $('video-form').querySelector('button').disabled = false; }
  }
  $('video-form').addEventListener('submit', loadVideo);
  $('mark-drop').addEventListener('click', () => { if (ready && !active()) { $('drop').value = time(player.getCurrentTime() * 1000).replace(/^0(?=\d:)/, ''); message('video-message', `Início marcado em ${$('drop').value}.`); } });
  $('save-words').addEventListener('click', saveCustom);
  $('start').addEventListener('click', start); $('stop').addEventListener('click', stop);
  $('skip').addEventListener('click', skipWord);
  $('intervals').addEventListener('change', () => {
    interval = Number(document.querySelector('[name="interval"]:checked').value) * 1000;
    nextAt = elapsed + interval; $('pace').innerHTML = `${interval / 1000}<span class="unit"> s</span>`; draw();
  });
  function tick() {
    if (state === 'running') {
      elapsed = performance.now() - anchor;
      if (elapsed >= nextAt) { nextWord(); nextAt = elapsed + interval; }
      draw();
    }
    requestAnimationFrame(tick);
  }
  // Evita perder palavras enquanto o usuário está em outra aba ou bloqueia o celular.
  document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'running' || state === 'waiting')) pause(); });
  controls(); requestAnimationFrame(tick);
  // Integração opcional de leitura com navegadores compatíveis. Sem IA no treino.
  if (document.modelContext?.registerTool) {
    try { Promise.resolve(document.modelContext.registerTool({name:'read_training_session',description:'Lê o estado visível do treino de rima, sem alterá-lo.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if (input && Object.keys(input).length) throw Error('Nenhum parâmetro é aceito.'); return {state,word:count ? lastWord : null,wordsUsed:count,time:$('elapsed').textContent,intervalSeconds:interval/1000};}})).catch(() => {}); } catch { /* API opcional. */ }
  }
})();
