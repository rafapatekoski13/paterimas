/* Formato compartilhado entre o cadastro e o treino de resposta. */
window.PaterimasCollection = (() => {
  const key = 'paterimas.attacks.v1', limit = 1000;
  const newId = () => globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function youtube(value) {
    if (typeof value !== 'string' || value.length > 2048) throw Error('Informe um link válido de vídeo do YouTube.');
    let url;
    try { url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`); } catch { throw Error('Informe um link válido de vídeo do YouTube.'); }
    const host = url.hostname.toLowerCase(), parts = url.pathname.split('/').filter(Boolean);
    let id;
    if (!['https:', 'http:'].includes(url.protocol)) throw Error('Use um link HTTP ou HTTPS do YouTube.');
    if (['youtu.be', 'www.youtu.be'].includes(host)) id = parts[0];
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) id = url.pathname === '/watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null;
    if (!id || !/^[\w-]{11}$/.test(id)) throw Error('Informe um link de vídeo do YouTube, não de canal ou playlist.');
    return {id, url:`https://www.youtube.com/watch?v=${id}`};
  }
  function parseTime(value) {
    const v = value.trim().replace(',', '.');
    if (/^\d+(?:\.\d{1,3})?$/.test(v)) return Number(v);
    if (!/^\d+:[0-5]\d(?:\.[0-9]{1,3})?$/.test(v) && !/^\d+:[0-5]\d:[0-5]\d(?:\.[0-9]{1,3})?$/.test(v)) return NaN;
    return v.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  }
  function formatTime(seconds) {
    const whole = Math.floor(seconds), fraction = Number((seconds - whole).toFixed(3));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}${fraction ? fraction.toFixed(3).slice(1).replace(/0+$/, '') : ''}`;
  }
  function base(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('Cada registro deve ser um objeto.');
    const video = youtube(record.youtubeUrl);
    if (record.title !== undefined && (typeof record.title !== 'string' || record.title.length > 120)) throw Error('O nome deve ser um texto de até 120 caracteres.');
    return {id:newId(), title:record.title?.trim(), youtubeUrl:video.url};
  }
  const validTime = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 604800;
  function attack(record) {
    const common = base(record), start = record.startSeconds, end = record.endSeconds;
    if (!validTime(start) || !validTime(end) || end <= start) throw Error('O final deve ser maior que o começo, com tempos válidos de até 7 dias.');
    return {...common, title:common.title || `Ataque ${formatTime(start)}–${formatTime(end)}`, startSeconds:start, endSeconds:end};
  }
  function beat(record) {
    const common = base(record), drop = record.dropSeconds;
    if (!validTime(drop)) throw Error('Informe um drop válido entre zero e 7 dias.');
    return {...common, title:common.title || `Beat · drop ${formatTime(drop)}`, dropSeconds:drop};
  }
  function decode(data) {
    if (!data || data.format !== 'paterimas.attacks' || data.version !== 1 || !Array.isArray(data.attacks) || (data.beats !== undefined && !Array.isArray(data.beats))) throw Error('Use um JSON paterimas.attacks, versão 1, com attacks e, opcionalmente, beats.');
    if (data.attacks.length > limit || (data.beats?.length || 0) > limit) throw Error('Limite de 1.000 ataques e 1.000 beats por coleção.');
    const parse = (list, fn, label) => list.map((r,i) => {try {return fn(r);} catch(e) {throw Error(`${label} ${i+1}: ${e.message}`);}});
    return {attacks:parse(data.attacks,attack,'Ataque'), beats:parse(data.beats || [],beat,'Beat')};
  }
  const pack = (attacks,beats) => ({format:'paterimas.attacks',version:1,attacks,beats});
  function read() { const raw = localStorage.getItem(key); return raw ? decode(JSON.parse(raw)) : {attacks:[],beats:[]}; }
  return {key,limit,newId,youtube,parseTime,formatTime,attack,beat,decode,pack,read};
})();
