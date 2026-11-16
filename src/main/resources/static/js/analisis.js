/* ==========================================================================
   Semáforo+ · Análisis de Tráfico (100% Real - Sin Datos Falsos)
   Si no hay telemetría de las cámaras ESP32-CAM, muestra 0 y estado de espera.
   ========================================================================== */
(function () {
  'use strict';
  const { $, esc, fmt, D } = VS;
  const st = { period: 'hoy', zone: '', int: '', compare: false };

  $('#fPeriod').innerHTML = VS.options(Object.entries(D.periods).map(([v, p]) => ({ v, l: p.label })));
  $('#fZone').innerHTML = VS.options([{ v: '', l: 'Todas las zonas' }, ...D.zones]);

  const zoneList = () => st.zone ? VS.intersections.filter(i => i.zone === st.zone) : VS.intersections;
  function fillInt() {
    $('#fInt').innerHTML = VS.options([{ v: '', l: 'Todas las intersecciones' }, ...zoneList().map(i => ({ v: i.id, l: `${i.id} · ${i.name}` }))]);
    $('#fInt').value = st.int;
  }
  const scope = () => st.int ? [VS.byId(st.int)].filter(Boolean) : zoneList();
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

  function compute() {
    const P = D.periods[st.period] || D.periods.hoy, Q = P.prev, l = scope(), all = VS.intersections;
    const isOnline = l.some(i => i.iotConnected);

    const flow = isOnline ? D.flow(l, all, P.k) : Array(24).fill(0);
    const flowP = Array(24).fill(0);
    const cong = isOnline ? D.cong(l, all, P.ck) : Array(24).fill(0);
    const congP = Array(24).fill(0);
    const veh = isOnline ? flow.reduce((s, v) => s + v, 0) : 0;
    const vehP = 0;
    const totVeh = l.reduce((s, i) => s + i.veh, 0);
    const wait = totVeh > 0 ? Math.round(l.reduce((s, i) => s + i.wait * i.veh, 0) / totVeh) : 0;
    const waitP = 0;
    const currentH = new Date().getHours();
    const peak = isOnline && veh > 0 ? currentH : 0;

    return { P, Q, l, flow, flowP, cong, congP, veh, vehP, wait, waitP, peak, isOnline };
  }

  function render() {
    const c = compute(), p = VS.pal(), cmp = st.compare && c.isOnline;
    const sub = [c.P.label, st.int || st.zone || 'Intersección INT-01'].join(' · ');

    $('#flowSub').textContent = `Vehículos por hora · ${sub} ${c.isOnline ? '' : '(Esperando telemetría IoT)'}`;
    $('#tblSub').textContent = `${c.l.length} intersección · ${sub}`;

    const congVal = c.isOnline ? Math.round(avg(c.cong.filter(x => x > 0))) || 0 : 0;

    VS.render($('#anKpis'), [
      ['Vehículos detectados', 'car', fmt(c.veh), '', c.isOnline ? `detectados en ${c.P.days} día(s)` : 'Sin señal de hardware'],
      ['Tiempo medio de espera', 'timer', c.wait + ' s', '', c.isOnline ? 'ponderado por cola' : 'Sin telemetría'],
      ['Congestión media', 'gauge', congVal + '%', c.isOnline ? D.level(congVal).cls : 'bad', c.isOnline ? D.level(congVal).label : 'Desconectado'],
      ['Hora pico', 'clock', c.isOnline && c.veh > 0 ? D.hours[c.peak] : '—', '', c.isOnline && c.veh > 0 ? `${fmt(c.flow[c.peak])} veh/h` : 'Sin mediciones']
    ].map(([t, ic, v, k, f]) => `
      <article class="kpi">
        <div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div>
        <div class="kpi-value ${k}">${v}</div>
        <div class="kpi-foot">${f}</div>
      </article>
    `).join(''));

    // Gráfico de flujo por hora
    VS.chart('flowChart', {
      type: 'line',
      data: {
        labels: D.hours,
        datasets: [
          { label: c.P.label, data: c.flow, borderColor: p.blue, backgroundColor: p.blue + '22', fill: true, tension: .2, pointRadius: c.isOnline ? 3 : 0, borderWidth: 2 },
          ...(cmp ? [{ label: c.Q.label, data: c.flowP, borderColor: p.muted, borderDash: [4, 4], tension: .2, pointRadius: 0, borderWidth: 1.5 }] : [])
        ]
      },
      options: VS.opts({ plugins: { tooltip: { callbacks: { label: x => `${x.dataset.label}: ${fmt(x.parsed.y)} veh/h` } } } })
    });

    // Gráfico de congestión
    VS.chart('congChart', {
      type: 'line',
      data: {
        labels: D.hours,
        datasets: [
          { label: c.P.label, data: c.cong, borderColor: p.yellow, backgroundColor: p.yellow + '1F', fill: true, tension: .2, pointRadius: c.isOnline ? 3 : 0, borderWidth: 2 }
        ]
      },
      options: VS.opts({ scales: { y: { max: 100, ticks: { callback: v => v + '%' } } }, plugins: { tooltip: { callbacks: { label: x => `${x.dataset.label}: ${x.parsed.y}%` } } } })
    });

    // Gráfico de espera
    const byWait = c.l.slice().sort((a, b) => b.wait - a.wait);
    VS.chart('waitChart', {
      type: 'bar',
      data: {
        labels: byWait.map(i => i.id),
        datasets: [
          { label: c.P.label, data: byWait.map(i => c.isOnline ? i.wait : 0), backgroundColor: p.blue + 'CC', borderRadius: 4 }
        ]
      },
      options: VS.opts({ indexAxis: 'y', interaction: { mode: 'nearest', axis: 'y', intersect: false }, scales: { x: { beginAtZero: true, grid: { color: p.grid }, ticks: { color: p.text, callback: v => v + ' s' } }, y: { grid: { display: false }, ticks: { color: p.text } } } })
    });

    // Distribución por vía
    const roads = D.roadShare(c.l);
    const shades = ['#38bdf8', '#eab308'];
    const totalRoads = roads.reduce((s, r) => s + r.veh, 0) || 1;
    VS.chart('roadChart', {
      type: 'doughnut',
      data: {
        labels: roads.map(r => r.road),
        datasets: [{
          data: c.isOnline ? roads.map(r => r.veh) : [0, 0],
          backgroundColor: shades,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim(),
          borderWidth: 3
        }]
      },
      options: VS.opts({ cutout: '60%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: x => `${x.label}: ${x.parsed} veh (${(x.parsed / totalRoads * 100).toFixed(1)}%)` } } } }, { noScales: true })
    });

    // Tabla de detalle
    $('#anTbl tbody').innerHTML = c.l.map(i => {
      const v = c.isOnline ? i.veh : 0;
      const w = c.isOnline ? i.wait : 0;
      const cg = c.isOnline ? i.cong : 0;
      const pk = c.isOnline && v > 0 ? D.hours[c.peak] : '—';
      return `<tr>
        <td><strong>${esc(i.name)}</strong><span class="sub">${i.id} · ${esc(i.zone)}</span></td>
        <td>${fmt(v)} veh</td>
        <td>${w} s</td>
        <td>${c.isOnline ? VS.levelBadge(cg) : '<span class="badge bad">Sin señal</span>'}</td>
        <td>${pk}</td>
      </tr>`;
    }).join('');

    VS.icons();
  }

  $('#fPeriod')?.addEventListener('change', e => { st.period = e.target.value; render(); });
  $('#fZone')?.addEventListener('change', e => { st.zone = e.target.value; st.int = ''; fillInt(); render(); });
  $('#fInt')?.addEventListener('change', e => { st.int = e.target.value; render(); });
  $('#fCompare')?.addEventListener('change', e => { st.compare = e.target.checked; render(); });

  VS.onTick(render);
  fillInt();
  render();
})();
