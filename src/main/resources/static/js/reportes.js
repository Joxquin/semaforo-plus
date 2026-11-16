/* Reportes · resumen e informe imprimible */
(function () {
  'use strict';
  const { $, esc, fmt, pad, D } = VS;
  const st = { period: 'hoy', from: '', to: '' };
  $('#rPeriod').innerHTML = VS.options([...Object.entries(D.periods).map(([v, p]) => ({ v, l: p.label })), { v: 'custom', l: 'Rango personalizado' }]);
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, today = new Date(), wk = new Date(Date.now() - 6 * 864e5);
  $('#rFrom').value = iso(wk); $('#rTo').value = iso(today); $('#rTo').max = iso(today);
  const avg = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);

  function periodObj() {
    if (st.period !== 'custom') return D.periods[st.period];
    const f = new Date($('#rFrom').value), t = new Date($('#rTo').value), days = Math.round((t - f) / 864e5) + 1;
    return { label: `${f.toLocaleDateString('es-PE')} – ${t.toLocaleDateString('es-PE')}`, days, k: .95, ck: .97, wk: .97 };
  }
  function validate() {
    const err = $('#rErr'); err.textContent = '';
    if (st.period !== 'custom') return true;
    const f = $('#rFrom').value, t = $('#rTo').value;
    if (!f || !t) { err.textContent = 'Selecciona la fecha de inicio y la de fin.'; return false; }
    if (f > t) { err.textContent = 'La fecha de inicio no puede ser posterior a la de fin.'; return false; }
    if ((new Date(t) - new Date(f)) / 864e5 > 90) { err.textContent = 'El rango máximo del prototipo es de 90 días.'; return false; }
    return true;
  }
  function render() {
    if (!validate()) return;
    const P = periodObj(), all = VS.intersections, flow = D.flow(all, all, P.k, 'rep' + P.label), cong = D.cong(all, all, P.ck, 'rep' + P.label);
    const veh = flow.reduce((s, v) => s + v, 0) * P.days, totV = all.reduce((s, i) => s + i.veh, 0), wait = Math.round(all.reduce((s, i) => s + i.wait * i.veh, 0) / totV * P.wk), cavg = Math.round(avg(cong)), pk = flow.indexOf(Math.max(...flow));
    const rows = all.map(i => { const f = D.flow([i], all, P.k, 'rr' + i.id + P.label), c = D.cong([i], all, P.ck, 'rr' + i.id + P.label); return { i, veh: f.reduce((s, v) => s + v, 0) * P.days, wait: Math.round(i.wait * P.wk), cong: Math.round(avg(c)), peak: D.hours[f.indexOf(Math.max(...f))] }; });
    const worst = rows.slice().sort((a, b) => b.cong - a.cong).slice(0, 2), p = VS.pal(), pl = VS.pal(true);

    $('#rFlowSub').textContent = `Vehículos por hora (promedio diario) · ${P.label}`;
    VS.render($('#rKpis'), [['Vehículos detectados', 'car', fmt(veh), ''], ['Tiempo medio de espera', 'timer', wait + ' s', ''], ['Congestión media', 'gauge', cavg + '%', D.level(cavg).cls], ['Hora pico', 'clock', D.hours[pk], '']]
      .map(([t, ic, v, k]) => `<article class="kpi"><div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div><div class="kpi-value ${k}">${v}</div></article>`).join(''));
    VS.chart('rFlow', { type: 'line', data: { labels: D.hours, datasets: [{ label: 'Vehículos/h', data: flow, borderColor: p.blue, backgroundColor: p.blue + '22', fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }] }, options: VS.opts({ plugins: { legend: { display: false } } }) });
    VS.chart('rCong', { type: 'line', data: { labels: D.hours, datasets: [{ label: 'Congestión %', data: cong, borderColor: p.yellow, backgroundColor: p.yellow + '1F', fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }] }, options: VS.opts({ scales: { y: { max: 100 } }, plugins: { legend: { display: false } } }) });

    $('#sheet').innerHTML = `<div class="s-head"><div><h1>Informe de tráfico urbano</h1><p>VIA SMART · Centro de control (prototipo)</p></div><div class="s-meta">Periodo: <strong>${esc(P.label)}</strong><br>Generado: ${VS.dt(Date.now())}<br>Operador: ${esc(VS.prefs.name)}</div></div>
      <p>Durante el periodo analizado se registraron <strong>${fmt(veh)}</strong> vehículos detectados en ${all.length} intersecciones simuladas de la red de Arequipa, con un tiempo medio de espera de <strong>${wait} s</strong> y una congestión media del <strong>${cavg}%</strong>. El pico de flujo se produjo a las <strong>${D.hours[pk]}</strong> (${fmt(flow[pk])} veh/h). Las intersecciones con mayor congestión media fueron ${worst.map(w => `${esc(w.i.name)} (${w.cong}%)`).join(' y ')}.</p>
      <div class="s-kpis"><div class="s-kpi"><b>${fmt(veh)}</b><span>Vehículos detectados</span></div><div class="s-kpi"><b>${wait} s</b><span>Espera promedio</span></div><div class="s-kpi"><b>${cavg}%</b><span>Congestión media</span></div><div class="s-kpi"><b>${D.hours[pk]}</b><span>Hora pico</span></div></div>
      <h2>Gráficos históricos</h2><div class="s-charts"><div class="chart-box"><canvas id="sFlow" role="img" aria-label="Flujo vehicular por hora"></canvas></div><div class="chart-box"><canvas id="sCmp" role="img" aria-label="Congestión media por intersección"></canvas></div></div>
      <h2>Tabla de indicadores por intersección</h2>
      <table><thead><tr><th>Intersección</th><th>Zona</th><th>Vehículos</th><th>Espera</th><th>Congestión</th><th>Hora pico</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.i.id)} · ${esc(r.i.name)}</td><td>${esc(r.i.zone)}</td><td>${fmt(r.veh)}</td><td>${r.wait} s</td><td>${r.cong}%</td><td>${r.peak}</td></tr>`).join('')}</tbody></table>
      <p class="s-foot">Documento generado por un prototipo académico. Todos los datos son ficticios y no corresponden a mediciones reales.</p>`;
    const tick = { color: pl.text }, grid = { color: pl.grid };
    VS.chart('sFlow', { type: 'bar', data: { labels: D.hours, datasets: [{ label: 'Vehículos/h', data: flow, backgroundColor: pl.blue, borderRadius: 2 }] }, options: VS.opts({ plugins: { legend: { display: false } }, scales: { x: { ticks: tick, grid: { display: false } }, y: { ticks: tick, grid } } }, { light: true }) });
    VS.chart('sCmp', { type: 'bar', data: { labels: rows.map(r => r.i.id), datasets: [{ label: 'Congestión media %', data: rows.map(r => r.cong), backgroundColor: rows.map(r => r.cong >= 70 ? pl.red : r.cong >= 40 ? pl.yellow : pl.green), borderRadius: 2 }] }, options: VS.opts({ plugins: { legend: { display: false } }, scales: { x: { ticks: tick, grid: { display: false } }, y: { max: 100, ticks: tick, grid } } }, { light: true }) });
  }
  $('#rPeriod').addEventListener('change', e => { st.period = e.target.value; $('#rFromBox').hidden = $('#rToBox').hidden = st.period !== 'custom'; render(); });
  ['#rFrom', '#rTo'].forEach(s => $(s).addEventListener('change', render));
  $('#rGen').addEventListener('click', () => { render(); if (!$('#rErr').textContent) VS.toast('Reporte generado con datos simulados', 'ok'); });
  $('#rPrint').addEventListener('click', () => { if (validate()) window.print(); });
  render();
})();
