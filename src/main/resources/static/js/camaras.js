/* Cámaras · Monitoreo de Visión Artificial On-Edge (ESP32-CAM) */
(function () {
  'use strict';
  const { $, $$, esc, D } = VS;
  const st = { q: '', stt: '', zone: '' };
  let cams = D.service.getCameras().map(c => Object.assign(c, { i: VS.byId(c.int) }));
  const inView = c => c.status === 'Sin señal' ? 0 : (c.veh !== undefined ? c.veh : 0);
  const activity = c => c.status === 'Sin señal' ? 0 : Math.min(100, Math.round((c.veh || 0) * 10));
  const actLabel = a => a >= 70 ? 'alta' : a >= 40 ? 'media' : 'baja';
  $('#fStt').innerHTML = VS.options([{ v: '', l: 'Todos' }, 'En línea', 'Degradada', 'Sin señal']);
  $('#fZone').innerHTML = VS.options([{ v: '', l: 'Todas' }, ...D.zones]);

  function refreshDataFromService() {
    cams = D.service.getCameras().map(c => Object.assign(c, { i: VS.byId(c.int) }));
  }

  /* Renderizado de video/foto REAL capturada por el lente del ESP32-CAM */
  function scene(c) {
    if (c.status === 'Sin señal') {
      return `<div class="cam-feed-placeholder offline">
        <svg viewBox="0 0 320 180" role="img" aria-label="Sin señal"><rect width="320" height="180" fill="#0a0c10"/><text x="160" y="94" text-anchor="middle" fill="#929BA8" font-size="13" font-family="Inter,sans-serif">CÁMARA FÍSICA DESCONECTADA</text></svg>
      </div>`;
    }
    // Imagen real capturada por el lente del ESP32-CAM vía HTTP
    const liveUrl = `/api/v1/realtime/cam/${c.id}/live.jpg?t=${Date.now()}`;
    return `<div class="cam-feed-container" style="position:relative;width:100%;height:180px;background:#05070a;overflow:hidden;border-radius:8px;">
      <img src="${liveUrl}" alt="Transmisión real ${esc(c.id)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\\'height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;\\\'>Esperando fotograma del lente OV2640...</div>';">
      <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.7);padding:2px 8px;border-radius:4px;font-size:11px;color:#4ade80;font-weight:600;">EN DIRECTO (LENTE FÍSICO)</div>
    </div>`;
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
      D.service.syncFromBackend().then(() => {
        refreshDataFromService();
        summary();
        render();
      });
    }
  });
  summary(); render();
  if (D.service.syncFromBackend) {
    D.service.syncFromBackend().then(() => {
      refreshDataFromService();
      summary();
      render();
    });
  }
})();
