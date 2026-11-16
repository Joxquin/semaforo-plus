/* Incidencias · gestión de eventos (los cambios viven en la sesión del navegador) */
(function () {
  'use strict';
  const { $, esc, D } = VS;
  const st = { q: '', type: '', prio: '', stt: '', int: '', sel: null };
  $('#fType').innerHTML = VS.options([{ v: '', l: 'Todos' }, ...D.incidentTypes]);
  $('#fPrio').innerHTML = VS.options([{ v: '', l: 'Todas' }, 'Alta', 'Media', 'Baja']);
  $('#fStt').innerHTML = VS.options([{ v: '', l: 'Todos' }, 'Nueva', 'Revisada', 'Resuelta']);
  $('#fInt').innerHTML = VS.options([{ v: '', l: 'Todas' }, ...VS.intersections.map(i => ({ v: i.id, l: i.id }))]);
  const all = () => VS.incidents();
  const filtered = () => { const q = st.q.trim().toLowerCase(); return all().filter(x => (!q || [x.id, x.desc, x.type, x.int].join(' ').toLowerCase().includes(q)) && (!st.type || x.type === st.type) && (!st.prio || x.prio === st.prio) && (!st.stt || x.status === st.stt) && (!st.int || x.int === st.int)); };

  function kpis() {
    const a = all(), n = s => a.filter(x => x.status === s).length;
    VS.render($('#icKpis'), [['Nuevas', 'bell-ring', n('Nueva'), n('Nueva') ? 'warn' : '', 'pendientes de revisión'], ['Revisadas', 'eye', n('Revisada'), '', 'en seguimiento'], ['Resueltas', 'check-check', n('Resuelta'), 'ok', 'cerradas en la sesión'], ['Prioridad alta activas', 'siren', a.filter(x => x.prio === 'Alta' && x.status !== 'Resuelta').length, 'bad', 'requieren atención']]
      .map(([t, ic, v, k, f]) => `<article class="kpi"><div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div><div class="kpi-value ${k}">${v}</div><div class="kpi-foot">${f}</div></article>`).join(''));
  }
  function table() {
    const l = filtered(); $('#count').textContent = `Mostrando ${l.length} de ${all().length} incidencias`;
    $('#icTbl tbody').innerHTML = l.length ? l.map(x => `<tr class="clickable ${st.sel === x.id ? 'selected' : ''}" data-id="${x.id}" tabindex="0" aria-label="Ver detalle de ${x.id}"><td><strong>${x.id}</strong></td><td>${esc(x.type)}</td><td class="truncate">${esc(x.desc)}</td><td>${x.int}</td><td style="white-space:nowrap">${VS.dt(x.ts)}</td><td>${VS.prioBadge(x.prio)}</td><td>${VS.incBadge(x.status)}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Ninguna incidencia coincide con los filtros.</td></tr>';
  }
  function detail() {
    const x = all().find(y => y.id === st.sel), box = $('#icDetail');
    if (!x) { box.innerHTML = '<div class="empty">Selecciona una incidencia de la tabla para ver su detalle y cambiar su estado.</div>'; return; }
    const i = VS.byId(x.int);
    VS.render(box, `<div class="card-head"><div><h2>${x.id}</h2><p>${esc(x.type)}</p></div>${VS.prioBadge(x.prio)}</div>
      <p class="ic-desc">${esc(x.desc)}</p>
      <dl class="dl" style="grid-template-columns:1fr 1fr"><div><dt>Estado</dt><dd>${VS.incBadge(x.status)}</dd></div><div><dt>Registrada</dt><dd>${VS.dt(x.ts)}<span class="sub">${VS.ago(x.ts)}</span></dd></div><div><dt>Intersección</dt><dd>${i ? esc(i.name) : x.int}</dd></div><div><dt>Origen</dt><dd>${esc(x.source || 'Hardware IoT')}</dd></div></dl>
      <div class="ic-actions">${x.status === 'Nueva' ? '<button class="btn" data-act="Revisada" type="button"><i data-lucide="eye"></i>Marcar como revisada</button>' : ''}${x.status !== 'Resuelta' ? '<button class="btn btn-primary" data-act="Resuelta" type="button"><i data-lucide="check"></i>Marcar como resuelta</button>' : '<button class="btn" data-act="Nueva" type="button"><i data-lucide="rotate-ccw"></i>Reabrir incidencia</button>'}<a class="btn" href="detalle-interseccion.html?id=${x.int}"><i data-lucide="map-pin"></i>Ver intersección</a></div>`);
  }
  const renderAll = () => { kpis(); table(); detail(); };
  $('#icTbl tbody').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) { st.sel = tr.dataset.id; table(); detail(); } });
  $('#icTbl tbody').addEventListener('keydown', e => { const tr = e.target.closest('tr[data-id]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); st.sel = tr.dataset.id; table(); detail(); const n = $(`tr[data-id="${st.sel}"]`); if (n) n.focus(); } });
  $('#icDetail').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; VS.setIncStatus(st.sel, b.dataset.act); renderAll(); VS.toast(`${st.sel} marcada como ${b.dataset.act.toLowerCase()}`, 'ok'); });
  [['#q', 'q', 'input'], ['#fType', 'type', 'change'], ['#fPrio', 'prio', 'change'], ['#fStt', 'stt', 'change'], ['#fInt', 'int', 'change']].forEach(([s, k, ev]) => $(s).addEventListener(ev, e => { st[k] = e.target.value; table(); }));

  /* Formulario con validación básica */
  $('#newBtn').addEventListener('click', () => {
    const body = document.createElement('form'); body.noValidate = true; body.style.cssText = 'display:flex;flex-direction:column;gap:14px';
    body.innerHTML = `<div class="field"><label for="nType">Tipo</label><select id="nType">${VS.options(D.incidentTypes)}</select></div>
      <div class="form-grid"><div class="field"><label for="nInt">Intersección</label><select id="nInt">${VS.options(VS.intersections.map(i => ({ v: i.id, l: `${i.id} · ${i.name}` })))}</select></div><div class="field"><label for="nPrio">Prioridad</label><select id="nPrio">${VS.options(['Alta', 'Media', 'Baja'])}</select></div></div>
      <div class="field"><label for="nDesc">Descripción</label><textarea id="nDesc" maxlength="220" placeholder="Describe lo observado (mínimo 10 caracteres)"></textarea><span class="field-error" id="nDescErr" role="alert"></span></div>`;
    const save = () => {
      const d = $('#nDesc', body).value.trim(), err = $('#nDescErr', body);
      if (d.length < 10) { err.textContent = 'Escribe al menos 10 caracteres para describir la incidencia.'; $('#nDesc', body).focus(); return false; }
      const x = VS.addIncident({ type: $('#nType', body).value, int: $('#nInt', body).value, prio: $('#nPrio', body).value, desc: d });
      st.sel = x.id; renderAll(); VS.toast(`Incidencia ${x.id} registrada en la sesión`, 'ok');
    };
    body.addEventListener('submit', e => e.preventDefault());
    VS.dialog({ title: 'Registrar incidencia', body, actions: [{ label: 'Cancelar' }, { label: 'Registrar', cls: 'btn-primary', onClick: save }] });
  });
  VS.onTick(() => { kpis(); });
  renderAll();
})();
