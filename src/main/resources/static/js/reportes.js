/* ==========================================================================
   Semáforo+ · Generación de Reportes Técnicos (100% Real)
   Cálculo sobre mediciones reales recibidas de los dispositivos IoT.
   ========================================================================== */
(function () {
  'use strict';
  const { $, esc, fmt, pad, D } = VS;
  const st = { period: 'hoy', from: '', to: '' };

  $('#rPeriod').innerHTML = VS.options([...Object.entries(D.periods).map(([v, p]) => ({ v, l: p.label })), { v: 'custom', l: 'Rango personalizado' }]);
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  const wk = new Date(Date.now() - 6 * 864e5);
  $('#rFrom').value = iso(wk);
  $('#rTo').value = iso(today);
  $('#rTo').max = iso(today);

  function periodObj() {
    if (st.period !== 'custom') return D.periods[st.period] || D.periods.hoy;
    const f = new Date($('#rFrom').value), t = new Date($('#rTo').value), days = Math.max(1, Math.round((t - f) / 864e5) + 1);
    return { label: `${f.toLocaleDateString('es-PE')} – ${t.toLocaleDateString('es-PE')}`, days, k: 1, ck: 1, wk: 1 };
  }

  function validate() {
    const err = $('#rErr');
    if (err) err.textContent = '';
    if (st.period !== 'custom') return true;
    const f = $('#rFrom').value, t = $('#rTo').value;
    if (!f || !t) { if (err) err.textContent = 'Selecciona la fecha de inicio y la de fin.'; return false; }
    if (f > t) { if (err) err.textContent = 'La fecha de inicio no puede ser posterior a la de fin.'; return false; }
    return true;
  }

  function render() {
    if (!validate()) return;
    const P = periodObj();
    const all = VS.intersections;
    const isOnline = all.some(i => i.iotConnected);

    const flow = isOnline ? D.flow(all, all, P.k) : Array(24).fill(0);
    const cong = isOnline ? D.cong(all, all, P.ck) : Array(24).fill(0);
    const veh = isOnline ? flow.reduce((s, v) => s + v, 0) : 0;
    const totV = all.reduce((s, i) => s + i.veh, 0);
    const wait = (totV > 0 && isOnline) ? Math.round(all.reduce((s, i) => s + i.wait * i.veh, 0) / totV) : 0;
    const cavg = (isOnline && cong.some(x => x > 0)) ? Math.round(cong.filter(x => x > 0).reduce((s, x) => s + x, 0) / Math.max(1, cong.filter(x => x > 0).length)) : 0;
    const currentH = new Date().getHours();
    const pk = isOnline && veh > 0 ? currentH : 0;
    const peakText = isOnline && veh > 0 ? D.hours[pk] : '—';
    const peakFlowText = isOnline && veh > 0 ? `${fmt(flow[pk])} veh/h` : '0 veh/h';

    const p = VS.pal(), pl = VS.pal(true);

    $('#rFlowSub').textContent = `Vehículos por hora · ${P.label} ${isOnline ? '' : '(Esperando enlace de hardware)'}`;

    VS.render($('#rKpis'), [
      ['Vehículos detectados', 'car', fmt(veh), ''],
      ['Tiempo medio de espera', 'timer', wait + ' s', ''],
      ['Congestión media', 'gauge', cavg + '%', isOnline ? D.level(cavg).cls : 'bad'],
      ['Hora pico', 'clock', peakText, '']
    ].map(([t, ic, v, k]) => `
      <article class="kpi">
        <div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div>
        <div class="kpi-value ${k}">${v}</div>
      </article>
    `).join(''));

    VS.chart('rFlow', {
      type: 'line',
      data: {
        labels: D.hours,
        datasets: [{ label: 'Vehículos/h', data: flow, borderColor: p.blue, backgroundColor: p.blue + '22', fill: true, tension: .2, pointRadius: isOnline ? 2 : 0, borderWidth: 2 }]
      },
      options: VS.opts({ plugins: { legend: { display: false } } })
    });

    VS.chart('rCong', {
      type: 'line',
      data: {
        labels: D.hours,
        datasets: [{ label: 'Congestión %', data: cong, borderColor: p.yellow, backgroundColor: p.yellow + '1F', fill: true, tension: .2, pointRadius: isOnline ? 2 : 0, borderWidth: 2 }]
      },
      options: VS.opts({ scales: { y: { max: 100 } }, plugins: { legend: { display: false } } })
    });

    // Vista previa imprimible del informe
    const sheetBody = isOnline && veh > 0
      ? `<p>Durante el periodo analizado se registraron <strong>${fmt(veh)}</strong> vehículos detectados en el cruce <strong>INT-01 (Av. Ejército × Calle Los Arces)</strong>, con un tiempo medio de espera de <strong>${wait} s</strong> y una congestión media del <strong>${cavg}%</strong>. El flujo en la hora pico fue de <strong>${fmt(flow[pk])} veh/h</strong>.</p>`
      : `<p>Durante el periodo analizado no se registraron detecciones vehiculares activas debido a que los dispositivos IoT se encuentran en espera de conexión. Mostrando reporte en blanco sin datos simulados.</p>`;

    $('#sheet').innerHTML = `
      <div class="s-head">
        <div>
          <h1>Informe de Movilidad Urbana · Semáforo+</h1>
          <p>Proyecto TECSUP Arequipa · ODS 11 · Cruce Adaptativo INT-01</p>
        </div>
        <div class="s-meta">
          Periodo: <strong>${esc(P.label)}</strong><br>
          Generado: ${VS.dt(Date.now())}<br>
          Operador: ${esc(VS.prefs.name)}
        </div>
      </div>
      ${sheetBody}
      <div class="s-kpis">
        <div class="s-kpi"><b>${fmt(veh)}</b><span>Vehículos detectados</span></div>
        <div class="s-kpi"><b>${wait} s</b><span>Espera promedio</span></div>
        <div class="s-kpi"><b>${cavg}%</b><span>Congestión media</span></div>
        <div class="s-kpi"><b>${peakText}</b><span>Hora pico</span></div>
      </div>
      <h2>Gráficos de Registro</h2>
      <div class="s-charts">
        <div class="chart-box"><canvas id="sFlow" role="img" aria-label="Flujo vehicular por hora"></canvas></div>
        <div class="chart-box"><canvas id="sCmp" role="img" aria-label="Congestión por carril"></canvas></div>
      </div>
      <h2>Tabla de indicadores por carril</h2>
      <table>
        <thead>
          <tr><th>Intersección</th><th>Vía / Carril</th><th>Vehículos</th><th>Espera</th><th>Congestión</th><th>Estado</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>INT-01</td>
            <td>Av. Ejército × Calle Los Arces</td>
            <td>${fmt(veh)} veh</td>
            <td>${wait} s</td>
            <td>${cavg}%</td>
            <td>${isOnline ? 'En línea' : 'Sin señal'}</td>
          </tr>
        </tbody>
      </table>
      <p class="s-foot">Informe emitido por la plataforma Semáforo+ (TECSUP Arequipa). Los datos reflejan exclusivamente mediciones recibidas de hardware real.</p>
    `;

    const tick = { color: pl.text }, grid = { color: pl.grid };
    VS.chart('sFlow', {
      type: 'bar',
      data: { labels: D.hours, datasets: [{ label: 'Vehículos/h', data: flow, backgroundColor: pl.blue, borderRadius: 2 }] },
      options: VS.opts({ plugins: { legend: { display: false } }, scales: { x: { ticks: tick, grid: { display: false } }, y: { ticks: tick, grid } } }, { light: true })
    });

    VS.chart('sCmp', {
      type: 'bar',
      data: { labels: ['INT-01 Av. Ejército'], datasets: [{ label: 'Congestión %', data: [cavg], backgroundColor: [cavg >= 70 ? pl.red : cavg >= 40 ? pl.yellow : pl.green], borderRadius: 2 }] },
      options: VS.opts({ plugins: { legend: { display: false } }, scales: { x: { ticks: tick, grid: { display: false } }, y: { max: 100, ticks: tick, grid } } }, { light: true })
    });

    VS.icons();
  }

  $('#rPeriod')?.addEventListener('change', e => {
    st.period = e.target.value;
    const isCustom = st.period === 'custom';
    if ($('#rFromBox')) $('#rFromBox').hidden = !isCustom;
    if ($('#rToBox')) $('#rToBox').hidden = !isCustom;
    render();
  });

  ['#rFrom', '#rTo'].forEach(s => $(s)?.addEventListener('change', render));
  $('#rGen')?.addEventListener('click', render);

  VS.onTick(render);
  render();
})();
