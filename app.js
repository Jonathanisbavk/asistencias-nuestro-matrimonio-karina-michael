(() => {
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize = value => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const choice = value => {
    const text = normalize(value);
    if (/^(no|nop|no podre|no asistire|no voy|lamentablemente no)/.test(text)) return 'no';
    if (/^(si|sip|claro|confirmo|asistire|asistimos|estare|estaremos|por supuesto|yes)/.test(text)) return 'yes';
    return 'pending';
  };
  const plural = (count, singular, pluralForm) => `${count} ${count === 1 ? singular : pluralForm}`;
  const dataUrl = window.RSVP_DATA_URL || '/api/respuestas';
  if (window.RSVP_DATA_URL) $('refresh-policy').textContent = 'Consulta cada minuto · datos publicados aprox. cada 5 min';
  let guests = [];

  function parseCsv(input) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && input[i + 1] === '\n') i++; row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    row.push(cell); if (row.some(value => value.trim())) rows.push(row);
    if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
    return rows;
  }

  function readRows(rows) {
    const headers = (rows[0] || []).map(normalize);
    const column = (name, fallback) => { const index = headers.findIndex(header => header.includes(name)); return index < 0 ? fallback : index; };
    const fields = {name:column('nombre completo',1),status:column('confirma su asistencia',2),ceremony:column('ceremonia religiosa',3),reception:column('recepcion',4),message:column('buenos deseos',6)};
    return rows.slice(1).filter(row => row.some(cell => String(cell ?? '').trim())).map(row => ({
      name:String(row[fields.name] ?? '').trim() || 'Invitado sin nombre',
      status:choice(row[fields.status]), ceremony:choice(row[fields.ceremony]), reception:choice(row[fields.reception]),
      message:String(row[fields.message] ?? '').trim()
    })).reverse();
  }

  function renderGuests() {
    const query = normalize($('search').value), filter = $('filter').value;
    const visible = guests.filter(guest => (filter === 'all' || guest.status === filter) && normalize(guest.name).includes(query));
    $('guest-subtitle').textContent = guests.length ? plural(guests.length, 'respuesta recibida', 'respuestas recibidas') + ' para este día especial.' : 'Las respuestas aparecerán aquí en cuanto lleguen.';
    $('guest-list').innerHTML = visible.length ? visible.map(guest => {
      const moments = [guest.ceremony === 'yes' ? 'Ceremonia' : '', guest.reception === 'yes' ? 'Recepción' : ''].filter(Boolean).join(' · ');
      const status = {yes:'¡Sí, estará!',no:'No podrá venir',pending:'Por definir'}[guest.status];
      return `<article class="guest-row"><div><span class="guest-name">${escapeHtml(guest.name)}</span><span class="guest-detail">${escapeHtml(moments || 'Sin momentos confirmados')}</span></div><span class="status ${guest.status}">${status}</span></article>`;
    }).join('') : `<div class="empty"><strong>${guests.length ? 'No encontramos ese nombre' : 'Esperando las primeras respuestas'}</strong>${guests.length ? 'Prueba otra búsqueda o cambia el filtro.' : 'Cada confirmación tendrá aquí su lugar.'}</div>`;
  }

  function render() {
    const confirmed = guests.filter(guest => guest.status === 'yes');
    const ceremony = confirmed.filter(guest => guest.ceremony === 'yes').length;
    const reception = confirmed.filter(guest => guest.reception === 'yes').length;
    $('total').textContent = guests.length;
    $('confirmed').textContent = confirmed.length;
    $('ceremony').textContent = ceremony;
    $('reception').textContent = reception;
    $('ceremony-summary').textContent = plural(ceremony, 'persona', 'personas');
    $('reception-summary').textContent = plural(reception, 'persona', 'personas');
    const messages = guests.filter(guest => guest.message);
    $('message-list').innerHTML = messages.length ? messages.slice(0, 8).map(guest => `<article class="message-card"><p>${escapeHtml(guest.message)}</p><span>— ${escapeHtml(guest.name)}</span></article>`).join('') : '<div class="empty"><strong>Pronto llegarán palabras bonitas</strong>Los mensajes que dejen sus invitados aparecerán aquí.</div>';
    $('message-count').textContent = messages.length ? plural(messages.length, 'mensaje para ustedes', 'mensajes para ustedes') : '';
    renderGuests();
  }

  async function load() {
    const button = $('refresh');
    button.disabled = true;
    $('sync-text').textContent = 'Actualizando respuestas';
    try {
      const response = await fetch(dataUrl + '?ts=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw new Error('El formulario no respondió correctamente.');
      const data = window.RSVP_DATA_URL ? {rows:parseCsv(await response.text())} : await response.json();
      if (!Array.isArray(data.rows)) throw new Error('Las respuestas no tienen el formato esperado.');
      guests = readRows(data.rows);
      render();
      $('updated').textContent = new Date().toLocaleTimeString('es-PE', {hour:'2-digit',minute:'2-digit'});
      $('sync-text').textContent = 'Respuestas actualizadas';
      $('error').hidden = true;
    } catch (error) {
      $('sync-text').textContent = 'Sin conexión';
      $('error').textContent = 'No se pudieron actualizar las respuestas. ' + error.message + ' Inténtalo de nuevo más tarde.';
      $('error').hidden = false;
      render();
    } finally { button.disabled = false; }
  }
  $('search').addEventListener('input', renderGuests);
  $('filter').addEventListener('change', renderGuests);
  $('refresh').addEventListener('click', load);
  render(); load(); setInterval(load, 60000);
})();
