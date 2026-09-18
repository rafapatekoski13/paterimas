(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.PaterimasCollection;
  const STORAGE_KEY = C.key, LIMIT = C.limit;
  const {youtube, parseTime, formatTime, newId} = C;
  const validate = C.attack;
  let attacks = [], beats = [], editingId = null, editingBeat = null, removed = null, removedBeat = null;
  const notify = (id, text, error = false) => { $(id).textContent = text; $(id).classList.toggle('error', error); };
  const fingerprint = a => `${a.youtubeUrl}|${a.startSeconds}|${a.endSeconds}`;
  function readForm() {
    return validate({title:$('attack-title').value, youtubeUrl:$('attack-url').value, startSeconds:parseTime($('attack-start').value), endSeconds:parseTime($('attack-end').value)});
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(C.pack(attacks, beats))); notify('storage-message', 'Salvo apenas neste navegador. Exporte uma cópia para guardar ou compartilhar.'); }
    catch { notify('storage-message', 'Não foi possível salvar no navegador. Exporte o JSON antes de sair para não perder sua coleção.', true); }
  }
  function resetForm() {
    editingId = null; $('attack-form').reset(); $('save-attack').textContent = 'Adicionar à coleção'; $('cancel-edit').hidden = true;
    $('form-heading').textContent = '01  Cadastrar ataque';
  }
  function closePreview() { $('preview-player').replaceChildren(); $('attack-preview').hidden = true; }
  function preview(attack) {
    const id = youtube(attack.youtubeUrl).id;
    const frame = document.createElement('iframe');
    frame.title = `Ataque: ${attack.title}`;
    frame.src = `https://www.youtube.com/embed/${id}?start=${Math.floor(attack.startSeconds)}&end=${Math.ceil(attack.endSeconds)}&autoplay=1&playsinline=1&rel=0`;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    $('preview-player').replaceChildren(frame); $('attack-preview').hidden = false;
    $('preview-title').textContent = `${attack.title} · ${formatTime(attack.startSeconds)} → ${formatTime(attack.endSeconds)}`;
  }
  function button(text, label, action) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'outline-button'; el.textContent = text; el.setAttribute('aria-label', label); el.addEventListener('click', action); return el;
  }
  function render() {
    $('export-panel').hidden = true;
    $('attack-count').textContent = attacks.length;
    $('export-attacks').disabled = !attacks.length && !beats.length;
    $('attack-empty').hidden = !!attacks.length;
    $('attack-list').replaceChildren();
    for (const attack of attacks) {
      const row = document.createElement('li'); row.className = 'attack-card';
      const heading = document.createElement('h3'); heading.textContent = attack.title;
      const meta = document.createElement('p'); meta.className = 'attack-meta';
      meta.textContent = `${formatTime(attack.startSeconds)} → ${formatTime(attack.endSeconds)} · ${Number((attack.endSeconds - attack.startSeconds).toFixed(3))} s`;
      const link = document.createElement('a'); link.href = `${attack.youtubeUrl}&t=${Math.floor(attack.startSeconds)}s`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Vídeo original no YouTube';
      const actions = document.createElement('div'); actions.className = 'attack-card-actions';
      actions.append(button('▶ Ouvir', `Ouvir ${attack.title}`, () => { preview(attack); $('attack-preview').scrollIntoView({block:'nearest'}); }));
      actions.append(button('Editar', `Editar ${attack.title}`, () => {
        editingId = attack.id; $('attack-title').value = attack.title; $('attack-url').value = attack.youtubeUrl; $('attack-start').value = formatTime(attack.startSeconds); $('attack-end').value = formatTime(attack.endSeconds);
        $('save-attack').textContent = 'Salvar alterações'; $('cancel-edit').hidden = false; $('form-heading').textContent = '01  Editar ataque'; closePreview(); notify('attack-form-message', 'Edite os campos e salve as alterações.'); $('attack-title').focus();
      }));
      actions.append(button('Remover', `Remover ${attack.title}`, () => {
        removed = {attack, index:attacks.findIndex(a => a.id === attack.id)};
        attacks = attacks.filter(a => a.id !== attack.id); if (editingId === attack.id) resetForm();
        closePreview(); persist(); render(); $('undo-area').hidden = false; notify('collection-message', 'Ataque removido. Você pode desfazer a última remoção.'); $('undo-remove').focus();
      }));
      row.append(heading, meta, link, actions); $('attack-list').append(row);
    }
  }
  try {
    ({attacks, beats} = C.read());
  } catch { notify('storage-message', 'Não foi possível recuperar a coleção salva. Importe seu backup em JSON, se tiver.', true); }
  render();
  $('attack-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const attack = readForm();
      if (attacks.some(a => a.id !== editingId && fingerprint(a) === fingerprint(attack))) throw Error('Este trecho já está na coleção. Edite o ataque existente para mudar o nome.');
      if (!editingId && attacks.length >= LIMIT) throw Error(`A coleção atingiu o limite de ${LIMIT} ataques.`);
      const wasEditing = !!editingId;
      if (wasEditing) attacks = attacks.map(a => a.id === editingId ? {...attack, id:editingId} : a); else attacks.push(attack);
      persist(); render(); resetForm(); closePreview();
      notify('attack-form-message', wasEditing ? 'Ataque atualizado.' : 'Ataque adicionado. Cadastre outro trecho quando quiser.');
      $('attack-title').focus();
    } catch (error) { notify('attack-form-message', error.message, true); }
  });
  $('preview-draft').addEventListener('click', () => { try { preview(readForm()); notify('attack-form-message', 'Confira o trecho antes de adicionar à coleção.'); } catch (error) { notify('attack-form-message', error.message, true); } });
  $('close-preview').addEventListener('click', closePreview);
  $('cancel-edit').addEventListener('click', () => { resetForm(); closePreview(); notify('attack-form-message', 'Edição cancelada. O ataque original foi mantido.'); });
  $('undo-remove').addEventListener('click', () => {
    if (!removed) return;
    if (attacks.length >= LIMIT || attacks.some(a => fingerprint(a) === fingerprint(removed.attack))) { notify('collection-message', 'Não foi possível restaurar: coleção cheia ou trecho já existente.', true); return; }
    attacks.splice(removed.index, 0, removed.attack); removed = null; $('undo-area').hidden = true; persist(); render(); notify('collection-message', 'Ataque restaurado.');
  });
  $('export-attacks').addEventListener('click', () => {
    if (!attacks.length && !beats.length) return;
    const json = JSON.stringify(C.pack(attacks, beats), null, 2);
    $('export-json').value = json; $('export-panel').hidden = false;
    const url = URL.createObjectURL(new Blob([json], {type:'application/json;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = `paterimas-ataques-${new Date().toISOString().slice(0,10)}.json`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    notify('collection-message', `JSON gerado com ${attacks.length} ataques e ${beats.length} beats. Confira os downloads do navegador.`);
  });
  function resetBeat() {
    editingBeat = null; $('beat-form').reset(); $('save-beat').textContent = 'Adicionar beat'; $('cancel-beat-edit').hidden = true;
  }
  function readBeat() { return C.beat({title:$('beat-title').value,youtubeUrl:$('beat-url').value,dropSeconds:parseTime($('beat-drop').value)}); }
  function renderBeats() {
    $('beat-count').textContent = beats.length; $('beat-empty').hidden = !!beats.length; $('beat-list').replaceChildren();
    for (const b of beats) {
      const row = document.createElement('li'); row.className = 'attack-card';
      const title = document.createElement('h3'); title.textContent = b.title;
      const meta = document.createElement('p'); meta.className = 'attack-meta'; meta.textContent = `Drop em ${formatTime(b.dropSeconds)}`;
      const actions = document.createElement('div'); actions.className = 'attack-card-actions';
      actions.append(button('▶ Ouvir',`Ouvir beat ${b.title}`,() => { preview({title:b.title,youtubeUrl:b.youtubeUrl,startSeconds:b.dropSeconds,endSeconds:b.dropSeconds+50}); $('attack-preview').scrollIntoView({block:'nearest'}); }));
      actions.append(button('Editar',`Editar beat ${b.title}`,() => {editingBeat=b.id; $('beat-title').value=b.title; $('beat-url').value=b.youtubeUrl; $('beat-drop').value=formatTime(b.dropSeconds); $('save-beat').textContent='Salvar beat'; $('cancel-beat-edit').hidden=false; $('beat-title').focus();}));
      actions.append(button('Remover',`Remover beat ${b.title}`,() => {removedBeat={beat:b,index:beats.findIndex(x=>x.id===b.id)}; beats=beats.filter(x=>x.id!==b.id); if(editingBeat===b.id) resetBeat(); closePreview(); persist(); render(); renderBeats(); $('undo-beat').hidden=false;}));
      row.append(title,meta,actions); $('beat-list').append(row);
    }
  }
  $('beat-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const b=readBeat();
      if (beats.some(x=>x.id!==editingBeat && x.youtubeUrl===b.youtubeUrl && x.dropSeconds===b.dropSeconds)) throw Error('Este beat com esse drop já foi cadastrado.');
      if (!editingBeat && beats.length>=LIMIT) throw Error('Limite de 1.000 beats atingido.');
      if (editingBeat) beats=beats.map(x=>x.id===editingBeat?{...b,id:editingBeat}:x); else beats.push(b);
      persist(); render(); renderBeats(); resetBeat(); notify('beat-message','Beat salvo. Ele já está disponível no treino de resposta.');
    } catch(error) {notify('beat-message',error.message,true);}
  });
  $('cancel-beat-edit').addEventListener('click',resetBeat);
  $('undo-beat').addEventListener('click',() => {
    if (!removedBeat) return;
    const b=removedBeat.beat;
    if(beats.length>=LIMIT || beats.some(x=>x.youtubeUrl===b.youtubeUrl && x.dropSeconds===b.dropSeconds)) {notify('beat-message','Não foi possível restaurar: beat já existente ou coleção cheia.',true);return;}
    beats.splice(removedBeat.index,0,b);removedBeat=null;$('undo-beat').hidden=true;persist();render();renderBeats();
  });
  renderBeats();
  $('import-attacks').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files[0]; if (!file) return;
    $('import-attacks').disabled = true;
    try {
      if (file.size > 2 * 1024 * 1024) throw Error('O arquivo deve ter no máximo 2 MB.');
      let data; try { data = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); } catch { throw Error('Não foi possível ler o JSON. Confira a sintaxe do arquivo.'); }
      const decoded = C.decode(data), incoming = decoded.attacks, keys = new Set(attacks.map(fingerprint)), additions = [];
      for (const a of incoming) { const key = fingerprint(a); if (!keys.has(key)) { additions.push(a); keys.add(key); } }
      if (attacks.length + additions.length > LIMIT) throw Error(`A importação ultrapassaria o limite de ${LIMIT} ataques. Nenhum ataque foi importado.`);
      const beatKeys = new Set(beats.map(b => `${b.youtubeUrl}|${b.dropSeconds}`)), newBeats = [];
      for (const b of decoded.beats) { const k = `${b.youtubeUrl}|${b.dropSeconds}`; if (!beatKeys.has(k)) {newBeats.push(b); beatKeys.add(k);} }
      if (beats.length + newBeats.length > LIMIT) throw Error('A importação ultrapassaria o limite de 1.000 beats.');
      attacks.push(...additions); beats.push(...newBeats); persist(); render(); renderBeats();
      notify('collection-message', `Ataques importados: ${additions.length}. Beats importados: ${newBeats.length}. Duplicados ignorados: ${incoming.length - additions.length + decoded.beats.length - newBeats.length}.`);
    } catch (error) { notify('collection-message', `${error.message} Sua coleção não foi alterada.`, true); }
    finally { $('import-file').value = ''; $('import-attacks').disabled = false; }
  });
})();
