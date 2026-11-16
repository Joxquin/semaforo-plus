/* Intersecciones · listado supervisado */
(function () {
  'use strict';
  const { $, esc, fmt, D } = VS;
  const st = { q: '', lvl: '', stt: '', zone: '', mode: '', sort: 'cong', dir: -1 };
  const COLS = [
    { k: 'name', l: 'Intersección' }, { k: 'zone', l: 'Ubicación' }, { k: 'veh', l: 'Vehículos', num: 1 }, { k: 'wait', l: 'Espera', num: 1 },
    { k: 'phase', l: 'Fase del semáforo', nosort: 1 }, { k: 'cong', l: 'Congestión' }, { k: 'mode', l: 'Modo' }, { k: 'status', l: 'Estado' }, { k: 'act', l: 'Acciones', nosort: 1 }
  ];
  $('#fLvl').innerHTML = VS.options([{ v: '', l: 'Todas' }, { v: 'fluido', l: 'Fluido' }, { v: 'moderado', l: 'Moderado' }, { v: 'alto', l: 'Alto' }]);
  $('#fStt').innerHTML = VS.options([{ v: '', l: 'Todos' }, 'Operativa', 'Atención', 'Sin datos']);
  $('#fZone').innerHTML = VS.options([{ v: '', l: 'Todas' }, ...D.zones]);
  $('#fMode').innerHTML = VS.options([{ v: '', l: 'Todos' }, 'Automático', 'Adaptativo', 'Manual']);

  function head() {
    $('#tbl thead').innerHTML = '<tr>' + COLS.map(c => c.nosort ? `<th scope="col">${c.l}</th>` : `<th scope="col" class="${c.num ? 'num' : ''}" aria-sort="${st.sort === c.k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-sort="${c.k}">${c.l}${st.sort === c.k ? (st.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('') + '</tr>';
  }
  function filtered() {
    const q = st.q.trim().toLowerCase();
    return VS.intersections.filter(i =>
      (!q || [i.id, i.name, i.zone, ...i.roads].join(' ').toLowerCase().includes(q)) &&
      (!st.lvl || D.level(i.cong).key === st.lvl) && (!st.stt || i.status === st.stt) && (!st.zone || i.zone === st.zone) && (!st.mode || i.mode === st.mode)
    ).sort((a, b) => { const x = a[st.sort], y = b[st.sort]; return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * st.dir; });
  }
  function summary() {
    const a = VS.intersections, n = f => a.filter(f).length;
    $('#summary').innerHTML = [['Registradas', a.length], ['Operativas', n(i => i.status === 'Operativa')], ['En atención', n(i => i.status === 'Atención')], ['Sin datos', n(i => i.status === 'Sin datos')], ['Congestión alta', n(i => i.cong >= 70)], ['Modo manual', n(i => i.mode === 'Manual')]]
      .map(([l, v]) => `<div class="chip"><strong>${v}</strong><span>${l}</span></div>`).join('');
  }
  function render() {
    const rows = filtered();
    $('#count').textContent = `Mostrando ${rows.length} de ${VS.intersections.length} intersecciones`;
    $('#tbl tbody').innerHTML = rows.length ? rows.map(i => `<tr class="clickable" data-href="detalle-interseccion.html?id=${i.id}"><td><strong>${esc(i.name)}</strong><span class="sub">${i.id}</span></td><td>${esc(i.zone)}<span class="sub">${esc(i.roads.join(' / '))}</span></td><td class="num">${fmt(i.veh)}</td><td class="num">${i.wait} s</td><td>${VS.phaseHTML(i)}</td><td>${VS.levelBadge(i.cong)}${VS.meter(i.cong)}</td><td>${VS.modeBadge(i.mode)}</td><td>${VS.statusBadge(i.status)}</td><td><a class="btn btn-sm" href="detalle-interseccion.html?id=${i.id}" aria-label="Ver detalle de ${esc(i.name)}"><i data-lucide="eye"></i>Ver detalle</a></td></tr>`).join('') : `<tr><td colspan="${COLS.length}" class="empty">Ninguna intersección coincide con los filtros. Prueba a limpiarlos.</td></tr>`;
    VS.icons();
  }
  const bind = (id, key) => $(id).addEventListener(key === 'q' ? 'input' : 'change', e => { st[key] = e.target.value; render(); });
  bind('#q', 'q'); bind('#fLvl', 'lvl'); bind('#fStt', 'stt'); bind('#fZone', 'zone'); bind('#fMode', 'mode');
  $('#clear').addEventListener('click', () => { Object.assign(st, { q: '', lvl: '', stt: '', zone: '', mode: '' }); ['#q', '#fLvl', '#fStt', '#fZone', '#fMode'].forEach(s => { $(s).value = ''; }); render(); });
  $('#tbl thead').addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; const k = b.dataset.sort; st.dir = st.sort === k ? -st.dir : (k === 'cong' || k === 'veh' || k === 'wait' ? -1 : 1); st.sort = k; head(); render(); });
  $('#tbl tbody').addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr && !e.target.closest('a')) location.href = tr.dataset.href; });
  VS.onTick(() => { summary(); render(); });
  head(); summary(); render();
})();
