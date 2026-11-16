/* Cámaras · Monitoreo de Visión Artificial On-Edge (ESP32-CAM) */
(function () {
  'use strict';
  const { $, $$, esc, D } = VS;
  const st = { q: '', stt: '', zone: '' };
  const cams = D.service.getCameras().map(c => Object.assign(c, { i: VS.byId(c.int) }));
  const inView = c => c.status === 'Sin señal' ? 0 : (c.veh !== undefined ? c.veh : 0);
  const activity = c => c.status === 'Sin señal' ? 0 : Math.min(100, Math.round((c.veh || 0) * 10));
  const actLabel = a => a >= 70 ? 'alta' : a >= 40 ? 'media' : 'baja';
  $('#fStt').innerHTML = VS.options([{ v: '', l: 'Todos' }, 'En línea', 'Degradada', 'Sin señal']);
  $('#fZone').innerHTML = VS.options([{ v: '', l: 'Todas' }, ...D.zones]);

  /* Ilustración de una calle (SVG). Los vehículos se animan con CSS; más congestión = más lentos. */
  function scene(c) {
    const s = D.hash(c.id);
    if (c.status === 'Sin señal') {
      let n = ''; for (let k = 0; k < 150; k++) n += `<rect x="${(D.rnd(s + k) * 320) | 0}" y="${(D.rnd(s + k + 300) * 180) | 0}" width="${4 + (k % 4) * 3}" height="2" fill="#fff" opacity="${(.04 + D.rnd(k + 9) * .1).toFixed(2)}"/>`;
      return `<svg viewBox="0 0 320 180" role="img" aria-label="Sin señal"><rect width="320" height="180" fill="#0a0c10"/>${n}<text x="160" y="94" text-anchor="middle" fill="#929BA8" font-size="13" font-family="Inter,sans-serif">SIN SEÑAL</text></svg>`;
    }
    let b = '', x = -6;
    for (let k = 0; x < 330; k++) {
      const w = 30 + ((s + k * 7) % 22), h = 34 + ((s * 3 + k * 11) % 46);
      b += `<rect x="${x}" y="${100 - h}" width="${w}" height="${h}" fill="${k % 2 ? '#171d26' : '#1c232d'}"/>`;
      for (let wy = 100 - h + 6; wy < 92; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (D.rnd(s + wx * 3 + wy) > .62) b += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="#d8c27a" opacity=".55"/>`;
      x += w + 2;
    }
    const n = Math.min(inView(c), 9), dur = (7 + c.i.cong / 100 * 14).toFixed(1), colors = ['#8BA4C7', '#c3cbd6', '#6d7a8c', '#9aa5b4', '#d6b45a'];
    let cars = '';
    for (let k = 0; k < n; k++) {
      const right = k % 2 === 0, y = right ? 140 : 117, per = Math.ceil(n / 2), slot = Math.floor(k / 2), col = colors[(s + k) % colors.length];
      const px = ((slot * 320 / per) + (right ? 0 : 24)) % 320;
      cars += `<g class="car${right ? '' : ' rev'}" style="--d:${dur}s;animation-delay:-${(slot * dur / per).toFixed(1)}s" transform="translate(${px.toFixed(0)},0)"><rect x="0" y="${y}" width="30" height="11" rx="3" fill="${col}"/><rect x="6" y="${y - 5}" width="16" height="6" rx="2" fill="${col}"/><circle cx="7" cy="${y + 11}" r="2.6" fill="#0b0d10"/><circle cx="23" cy="${y + 11}" r="2.6" fill="#0b0d10"/></g>`;
    }
    const ls = VS.lightState(c.i, 'E'), lc = { red: '#F87171', yellow: '#FACC15', green: '#4ADE80' };
    return `<svg viewBox="0 0 320 180" role="img" aria-label="Vista ilustrativa de ${esc(c.name)} con ${inView(c)} vehículos estimados"><rect width="320" height="100" fill="#0e131a"/>${b}<rect y="100" width="320" height="8" fill="#232a33"/><rect y="108" width="320" height="52" fill="#171b21"/><rect y="160" width="320" height="20" fill="#232a33"/><line x1="0" y1="134" x2="320" y2="134" stroke="#5b6573" stroke-width="1.5" stroke-dasharray="10 8"/>${cars}<rect x="298" y="64" width="3" height="46" fill="#2b3340"/><rect x="293" y="52" width="13" height="30" rx="3" fill="#0f1318"/><circle cx="299.5" cy="59" r="3.4" fill="${ls === 'red' ? lc.red : '#2a313b'}"/><circle cx="299.5" cy="67" r="3.4" fill="${ls === 'yellow' ? lc.yellow : '#2a313b'}"/><circle cx="299.5" cy="75" r="3.4" fill="${ls === 'green' ? lc.green : '#2a313b'}"/></svg>`;
  }

  const filtered = () => { const q = st.q.trim().toLowerCase(); return cams.filter(c => (!q || [c.id, c.name, c.i.roads.join(' ')].join(' ').toLowerCase().includes(q)) && (!st.stt || c.status === st.stt) && (!st.zone || c.i.zone === st.zone)); };
  function summary() { const n = s => cams.filter(c => c.status === s).length; $('#camSummary').innerHTML = [['Cámaras', cams.length], ['En línea', n('En línea')], ['Degradadas', n('Degradada')], ['Sin señal', n('Sin señal')]].map(([l, v]) => `<div class="chip"><strong>${v}</strong><span>${l}</span></div>`).join(''); }
  function render() {
    const l = filtered();
    $('#camCount').textContent = `Mostrando ${l.length} de ${cams.length} cámaras`;
    VS.render($('#camGrid'), l.length ? l.map(c => { const a = activity(c); return `<article class="cam-card"><div class="cam ${c.status === 'Degradada' ? 'degraded' : ''}">${scene(c)}<div class="cam-top"><span class="cam-tag">${c.status === 'Sin señal' ? '' : '<i class="rec"></i>'}${c.id}</span><span class="cam-tag">${c.status === 'Sin señal' ? 'Sin señal' : 'En vivo (ML)'}</span></div></div>
      <div class="cam-body"><div class="cam-title"><div><strong>${esc(c.name)}</strong><span class="sub">${esc(c.i.zone)} · ${esc(c.i.roads[0])} · ${c.int}</span></div>${VS.camBadge(c.status)}</div>
      <div class="cam-stats"><div><b data-cv="${c.id}">${c.status === 'Sin señal' ? '—' : inView(c)}</b><span class="t">vehículos detectados</span></div><div><span class="meter" role="img" aria-label="Actividad ${actLabel(a)}"><i data-ca="${c.id}" style="width:${a}%;background:${D.level(a).color}"></i></span><span class="t">Actividad ${c.status === 'Sin señal' ? 'no disponible' : actLabel(a)}</span></div></div>
      <button type="button" class="btn btn-sm" data-zoom="${c.id}"><i data-lucide="maximize-2"></i>Ampliar vista</button></div></article>`; }).join('') : '<p class="empty">Ninguna cámara coincide con los filtros.</p>');
  }
  function zoom(c) {
    const a = activity(c);
    VS.dialog({ title: `${c.id} · ${c.name}`, wide: true, body: `<div class="cam ${c.status === 'Degradada' ? 'degraded' : ''}">${scene(c)}<div class="cam-top"><span class="cam-tag">${c.status === 'Sin señal' ? '' : '<i class="rec"></i>'}${c.id}</span><span class="cam-tag">${c.status === 'Sin señal' ? 'Sin señal' : 'En vivo (ML)'}</span></div></div>
      <dl class="dl"><div><dt>Estado</dt><dd>${VS.camBadge(c.status)}</dd></div><div><dt>Ubicación</dt><dd>${esc(c.i.zone)} · ${esc(c.i.name)}</dd></div><div><dt>Vehículos detectados</dt><dd>${c.status === 'Sin señal' ? '—' : inView(c)}</dd></div><div><dt>Actividad</dt><dd>${c.status === 'Sin señal' ? 'No disponible' : actLabel(a) + ' (' + a + '%)'}</dd></div><div><dt>Fase del semáforo</dt><dd>${VS.phaseHTML(c.i)}</dd></div></dl>
      <p class="muted small">Visualización de telemetría de inferencia On-Edge recibida desde el módulo ESP32-CAM.</p>`,
      actions: [{ label: 'Ver intersección', cls: 'btn-primary', onClick: () => { location.href = `detalle-interseccion.html?id=${c.int}`; return false; } }, { label: 'Cerrar' }] });
  }
  $('#camGrid').addEventListener('click', e => { const b = e.target.closest('[data-zoom]'); if (b) zoom(cams.find(c => c.id === b.dataset.zoom)); });
  $('#q').addEventListener('input', e => { st.q = e.target.value; render(); });
  $('#fStt').addEventListener('change', e => { st.stt = e.target.value; render(); });
  $('#fZone').addEventListener('change', e => { st.zone = e.target.value; render(); });
  VS.onTick(() => {
    cams.forEach(c => {
      const v = $(`[data-cv="${c.id}"]`), m = $(`[data-ca="${c.id}"]`);
      if (v && c.status !== 'Sin señal') v.textContent = inView(c);
      if (m) { const a = activity(c); m.style.width = a + '%'; m.style.background = D.level(a).color; }
    });
    if (D.service.syncFromBackend) {
      D.service.syncFromBackend().then(() => { summary(); render(); });
    }
  });
  summary(); render();
  if (D.service.syncFromBackend) {
    D.service.syncFromBackend().then(() => { summary(); render(); });
  }
})();
