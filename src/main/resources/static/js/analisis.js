/* Análisis de tráfico · estadísticas históricas simuladas */
(function () {
  'use strict';
  const { $, esc, fmt, D } = VS;
  const st = { period: 'hoy', zone: '', int: '', compare: true };
  $('#fPeriod').innerHTML = VS.options(Object.entries(D.periods).map(([v, p]) => ({ v, l: p.label })));
  $('#fZone').innerHTML = VS.options([{ v: '', l: 'Todas las zonas' }, ...D.zones]);
  const zoneList = () => st.zone ? VS.intersections.filter(i => i.zone === st.zone) : VS.intersections;
  function fillInt() { $('#fInt').innerHTML = VS.options([{ v: '', l: 'Todas las intersecciones' }, ...zoneList().map(i => ({ v: i.id, l: `${i.id} · ${i.name}` }))]); $('#fInt').value = st.int; }
  const scope = () => st.int ? [VS.byId(st.int)] : zoneList();
  const avg = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);

  function delta(cur, prev, badWhenUp) {
    if (!st.compare || !prev) return '';
    const p = (cur - prev) / prev * 100, up = p > 0.05, dn = p < -0.05;
    const cls = !up && !dn ? 'flat' : (up ? (badWhenUp ? 'up-bad' : 'up-good') : (badWhenUp ? 'down-good' : 'down-bad'));
    return `<span class="delta ${cls}">${up ? '▲' : dn ? '▼' : '■'} ${Math.abs(p).toFixed(1).replace('.', ',')}%</span> vs. periodo anterior`;
  }
  function compute() {
    const P = D.periods[st.period], Q = P.prev, l = scope(), all = VS.intersections;
    const flow = D.flow(l, all, P.k, 'an' + st.period), flowP = D.flow(l, all, Q.k, 'anp' + st.period);
    const cong = D.cong(l, all, P.ck, 'an' + st.period), congP = D.cong(l, all, Q.ck, 'anp' + st.period);
    const veh = flow.reduce((s, v) => s + v, 0) * P.days, vehP = flowP.reduce((s, v) => s + v, 0) * P.days;
    const totVeh = l.reduce((s, i) => s + i.veh, 0) || 1;
    const wait = l.reduce((s, i) => s + i.wait * i.veh, 0) / totVeh * P.wk, waitP = l.reduce((s, i) => s + i.wait * i.veh, 0) / totVeh * Q.wk;
    return { P, Q, l, flow, flowP, cong, congP, veh, vehP, wait, waitP, peak: flow.indexOf(Math.max(...flow)) };
  }
  function render() {
    const c = compute(), p = VS.pal(), cmp = st.compare, sub = [c.P.label, st.int || st.zone || 'Toda la red'].join(' · ');
    $('#flowSub').textContent = `Vehículos por hora (promedio diario) · ${sub}`;
    $('#tblSub').textContent = `${c.l.length} intersecciones · ${sub}`;
    VS.render($('#anKpis'), [
      ['Vehículos detectados', 'car', fmt(c.veh), '', delta(c.veh, c.vehP, false) || `en ${c.P.days} día${c.P.days > 1 ? 's' : ''}`],
      ['Tiempo medio de espera', 'timer', Math.round(c.wait) + ' s', '', delta(c.wait, c.waitP, true) || 'ponderado por vehículos'],
      ['Congestión media', 'gauge', Math.round(avg(c.cong)) + '%', D.level(avg(c.cong)).cls, delta(avg(c.cong), avg(c.congP), true) || D.level(avg(c.cong)).label],
      ['Hora pico', 'clock', D.hours[c.peak], '', `${fmt(c.flow[c.peak])} veh/h`]
    ].map(([t, ic, v, k, f]) => `<article class="kpi"><div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div><div class="kpi-value ${k}">${v}</div><div class="kpi-foot">${f}</div></article>`).join(''));

    VS.chart('flowChart', { type: 'line', data: { labels: D.hours, datasets: [
      { label: c.P.label, data: c.flow, borderColor: p.blue, backgroundColor: p.blue + '22', fill: true, tension: .35, pointRadius: 0, borderWidth: 2 },
      ...(cmp ? [{ label: c.Q.label, data: c.flowP, borderColor: p.muted, borderDash: [4, 4], tension: .35, pointRadius: 0, borderWidth: 1.5 }] : [])
    ] }, options: VS.opts({ plugins: { tooltip: { callbacks: { label: x => `${x.dataset.label}: ${fmt(x.parsed.y)} veh/h` } } } }) });

    VS.chart('congChart', { type: 'line', data: { labels: D.hours, datasets: [
      { label: c.P.label, data: c.cong, borderColor: p.yellow, backgroundColor: p.yellow + '1F', fill: true, tension: .35, pointRadius: 0, borderWidth: 2 },
      ...(cmp ? [{ label: c.Q.label, data: c.congP, borderColor: p.muted, borderDash: [4, 4], tension: .35, pointRadius: 0, borderWidth: 1.5 }] : [])
    ] }, options: VS.opts({ scales: { y: { max: 100, ticks: { callback: v => v + '%' } } }, plugins: { tooltip: { callbacks: { label: x => `${x.dataset.label}: ${x.parsed.y}%` } } } }) });

    const byWait = c.l.slice().sort((a, b) => b.wait - a.wait);
    VS.chart('waitChart', { type: 'bar', data: { labels: byWait.map(i => i.id), datasets: [
      { label: c.P.label, data: byWait.map(i => Math.round(i.wait * c.P.wk)), backgroundColor: p.blue + 'CC', borderRadius: 4 },
      ...(cmp ? [{ label: c.Q.label, data: byWait.map(i => Math.round(i.wait * c.Q.wk)), backgroundColor: p.muted + '88', borderRadius: 4 }] : [])
    ] }, options: VS.opts({ indexAxis: 'y', interaction: { mode: 'nearest', axis: 'y', intersect: false }, scales: { x: { beginAtZero: true, grid: { color: p.grid }, ticks: { color: p.text, callback: v => v + ' s' } }, y: { grid: { display: false }, ticks: { color: p.text } } } }) });

    const roads = D.roadShare(c.l), top = roads.slice(0, 6), rest = roads.slice(6).reduce((s, r) => s + r.veh, 0);
    if (rest) top.push({ road: 'Otras vías', veh: rest });
    const shades = ['#8BA4C7', '#6F8DB5', '#A8BCD6', '#5C7699', '#C3D1E3', '#47607F', '#3A4F69'], total = top.reduce((s, r) => s + r.veh, 0) || 1;
    VS.chart('roadChart', { type: 'doughnut', data: { labels: top.map(r => r.road), datasets: [{ data: top.map(r => r.veh), backgroundColor: shades, borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim(), borderWidth: 3 }] }, options: VS.opts({ cutout: '60%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: x => `${x.label}: ${(x.parsed / total * 100).toFixed(1).replace('.', ',')}%` } } } }, { noScales: true }) });

    $('#anTbl tbody').innerHTML = c.l.map(i => {
      const f = D.flow([i], VS.intersections, c.P.k, 'row' + i.id + st.period), cg = D.cong([i], VS.intersections, c.P.ck, 'row' + i.id + st.period), pk = f.indexOf(Math.max(...f));
      return `<tr><td><strong>${esc(i.name)}</strong><span class="sub">${i.id} · ${esc(i.zone)}</span></td><td>${fmt(f.reduce((s, v) => s + v, 0) * c.P.days)}</td><td>${Math.round(i.wait * c.P.wk)} s</td><td>${VS.levelBadge(Math.round(avg(cg)))}</td><td>${D.hours[pk]}</td></tr>`;
    }).join('');
  }
  $('#fPeriod').addEventListener('change', e => { st.period = e.target.value; render(); });
  $('#fZone').addEventListener('change', e => { st.zone = e.target.value; st.int = ''; fillInt(); render(); });
  $('#fInt').addEventListener('change', e => { st.int = e.target.value; render(); });
  $('#fCompare').addEventListener('change', e => { st.compare = e.target.checked; render(); });
  fillInt(); render();
})();
