/* Detalle de intersección · supervisión puntual */
(function () {
  'use strict';
  const { $, $$, esc, fmt, pad, D } = VS;
  const root = $('#detail'), id = VS.param('id') || 'INT-01', i = VS.byId(id);
  if (!i) {
    root.innerHTML = `<div class="card empty"><h2>Intersección no encontrada</h2><p>El código «${esc(id)}» no existe en los datos de demostración.</p><p style="margin-top:14px"><a class="btn btn-primary" href="intersecciones.html">Volver al listado</a></p></div>`;
    return;
  }
  document.title = `${i.name} · VIA SMART`;
  const AX = { N: 'Norte', S: 'Sur', E: 'Este', O: 'Oeste' };
  const L = VS.intersections, k = L.indexOf(i), prev = L[(k + L.length - 1) % L.length], next = L[(k + 1) % L.length];
  const session = [];   // eventos registrados por el operador durante esta visita (solo demostración)

  root.innerHTML = `
    <section class="card detail-head" aria-label="Resumen de la intersección">
      <div><a class="btn btn-sm" href="intersecciones.html"><i data-lucide="arrow-left"></i>Volver al listado</a>
        <h2 class="dh-title">${esc(i.name)}</h2><p class="muted">${i.id} · ${esc(i.zone)} · ${esc(i.roads.join(' / '))}</p><div class="badges" id="dhBadges"></div></div>
      <div class="dh-gauge" id="dhGauge"></div>
      <div class="dh-nav"><a class="btn btn-sm" href="detalle-interseccion.html?id=${prev.id}"><i data-lucide="chevron-left"></i>${prev.id}</a><a class="btn btn-sm" href="detalle-interseccion.html?id=${next.id}">${next.id}<i data-lucide="chevron-right"></i></a></div>
    </section>
    <div class="grid">
      <article class="card span-7"><div class="card-head"><div><h2>Vista de la intersección</h2><p>Esquema ilustrativo · la cola refleja los vehículos por acceso</p></div></div><div class="xing" id="xing"></div></article>
      <div class="span-5 stack"><article class="card" id="phaseCard"></article><article class="card" id="modeCard"></article></div>
    </div>
    <section aria-label="Datos por vía"><div class="cards4" id="approaches"></div></section>
    <div class="grid">
      <article class="card span-7"><div class="card-head"><div><h2>Flujo vehicular reciente</h2><p>Vehículos cada 10 minutos · últimas 2 horas</p></div></div><div class="chart-box"><canvas id="flowDetail" role="img" aria-label="Flujo vehicular reciente"></canvas></div></article>
      <article class="card span-5"><div class="card-head"><div><h2>Recomendaciones simuladas</h2><p>Reglas simples sobre datos ficticios</p></div><span class="badge info">Simulación</span></div><div id="recs"></div></article>
      <article class="card span-12"><div class="card-head"><div><h2>Historial reciente</h2></div></div><div class="table-wrap"><table><caption class="sr-only">Historial de eventos</caption><thead><tr><th>Cuándo</th><th>Tipo</th><th>Evento</th></tr></thead><tbody id="hist"></tbody></table></div></article>
    </div>`;

  /* ---------- Piezas visuales ---------- */
  function gauge() {
    const lv = D.level(i.cong), len = 157.08;
    $('#dhGauge').innerHTML = `<svg viewBox="0 0 120 72" role="img" aria-label="Congestión ${i.cong}%"><path class="g-bg" d="M10 62 A50 50 0 0 1 110 62"/><path class="g-fg" style="stroke:${lv.color};stroke-dasharray:${(len * i.cong / 100).toFixed(1)} ${len}" d="M10 62 A50 50 0 0 1 110 62"/><text class="g-val" x="60" y="58" text-anchor="middle">${i.cong}%</text></svg><div class="g-label" style="color:${lv.color}">Congestión ${lv.label.toLowerCase()}</div>`;
    $('#dhBadges').innerHTML = VS.statusBadge(i.status) + VS.modeBadge(i.mode) + (i.status === 'Sin datos' ? VS.badge('Últimas lecturas registradas', 'warn', false) : '');
  }
  function xing() {
    const ap = Object.fromEntries(i.approach.map(a => [a.dir, a]));
    const head = (x, y, s) => `<g transform="translate(${x},${y})"><rect class="head" width="16" height="40" rx="5"/><circle cx="8" cy="8" r="5" style="fill:${s === 'red' ? 'var(--red)' : 'var(--border)'}"/><circle cx="8" cy="20" r="5" style="fill:${s === 'yellow' ? 'var(--yellow)' : 'var(--border)'}"/><circle cx="8" cy="32" r="5" style="fill:${s === 'green' ? 'var(--green)' : 'var(--border)'}"/></g>`;
    const q = a => Math.min(4, Math.max(1, Math.round(a.veh / 45)));
    let cars = '';
    for (let n = 0; n < q(ap.N); n++) cars += `<rect class="car-s" x="170" y="${92 - n * 26}" width="16" height="20" rx="3"/>`;
    for (let n = 0; n < q(ap.S); n++) cars += `<rect class="car-s" x="214" y="${208 + n * 26}" width="16" height="20" rx="3"/>`;
    for (let n = 0; n < q(ap.E); n++) cars += `<rect class="car-s" x="${248 + n * 26}" y="132" width="20" height="16" rx="3"/>`;
    for (let n = 0; n < q(ap.O); n++) cars += `<rect class="car-s" x="${132 - n * 26}" y="172" width="20" height="16" rx="3"/>`;
    const lbl = (x, y, a, anc) => `<text class="lbl" x="${x}" y="${y}" text-anchor="${anc}">${AX[a.dir]}</text><text class="lbl-s" x="${x}" y="${y + 14}" text-anchor="${anc}">${a.veh} veh · ${a.wait} s</text>`;
    $('#xing').innerHTML = `<svg viewBox="0 0 400 320" role="img" aria-label="Esquema de la intersección con el estado de cada semáforo">
      <rect class="rd" x="160" y="0" width="80" height="320"/><rect class="rd" x="0" y="120" width="400" height="80"/><rect class="rd-c" x="160" y="120" width="80" height="80"/>
      <line class="lane" x1="200" y1="0" x2="200" y2="120"/><line class="lane" x1="200" y1="200" x2="200" y2="320"/><line class="lane" x1="0" y1="160" x2="160" y2="160"/><line class="lane" x1="240" y1="160" x2="400" y2="160"/>
      ${cars}${head(138, 76, VS.lightState(i, 'N'))}${head(246, 204, VS.lightState(i, 'S'))}${head(246, 76, VS.lightState(i, 'E'))}${head(138, 204, VS.lightState(i, 'O'))}
      ${lbl(124, 24, ap.N, 'end')}${lbl(276, 290, ap.S, 'start')}${lbl(392, 24, ap.E, 'end')}${lbl(8, 290, ap.O, 'start')}
      <text class="lbl-s" x="200" y="164" text-anchor="middle">${VS.phaseLabels[i.pi]}</text></svg>`;
  }
  function phaseCard() {
    const d = VS.durs(i)[i.pi];
    $('#phaseCard').innerHTML = `<div class="card-head"><div><h2>Fase del semáforo</h2><p>Ciclo simulado en tiempo real</p></div></div>
      <div class="phase-big" id="phaseTxt">${VS.phaseLabels[i.pi]}</div>
      <div class="countdown"><strong id="phaseRem">${i.pr}</strong><span class="muted">s restantes</span></div>
      <span class="meter"><i id="phaseBar" style="width:${Math.round(i.pr / d * 100)}%;background:var(--blue)"></i></span>
      <p class="muted small" style="margin-top:10px">Plan: N–S ${i.plan.ns} s · E–O ${i.plan.eo} s · ámbar 4 s</p>`;
  }
  function modeCard(focusMode) {
    $('#modeCard').innerHTML = `<div class="card-head"><div><h2>Modo de operación</h2></div><span class="badge warn">Demostrativo</span></div>
      <div class="seg" role="group" aria-label="Modo de operación">${['Automático', 'Adaptativo', 'Manual'].map(m => `<button type="button" data-mode="${m}" aria-pressed="${i.mode === m}">${m}</button>`).join('')}</div>
      ${i.mode === 'Manual' ? `<div class="manual-box"><button type="button" class="btn btn-sm" data-force="0">Forzar N–S en verde</button><button type="button" class="btn btn-sm" data-force="2">Forzar E–O en verde</button></div>` : ''}
      <p class="note">Estos controles son demostrativos: no envían señales a semáforos ni a ningún dispositivo real.</p>`;
    if (focusMode) { const b = $(`[data-mode="${focusMode}"]`); if (b) b.focus(); }
  }
  function approaches() {
    $('#approaches').innerHTML = i.approach.map(a => {
      const road = (a.dir === 'N' || a.dir === 'S') ? i.roads[0] : i.roads[1], pct = Math.round(a.veh / i.veh * 100);
      return `<article class="card"><div class="ap-head"><div><strong>${AX[a.dir]}</strong><span class="sub">${esc(road)}</span></div>${VS.tl(VS.lightState(i, a.dir))}</div><div class="ap-nums"><div><b>${a.veh}</b><span>vehículos</span></div><div><b>${a.wait} s</b><span>espera media</span></div></div><span class="meter" role="img" aria-label="${pct}% del flujo"><i style="width:${pct}%;background:var(--blue)"></i></span><span class="sub" style="margin-top:6px">${pct}% del flujo de la intersección</span></article>`;
    }).join('');
  }
  function recs() {
    const out = [], nsHeavy = (i.split[0] + i.split[1]) >= (i.split[2] + i.split[3]), ax = nsHeavy ? 'N–S' : 'E–O', road = nsHeavy ? i.roads[0] : i.roads[1], g = nsHeavy ? i.plan.ns : i.plan.eo;
    const heavy = i.approach.slice().sort((a, b) => b.veh - a.veh)[0];
    const neigh = D.edges.filter(e => e.includes(i.id)).map(e => VS.byId(e.find(x => x !== i.id))).filter(n => n.cong >= 60);
    if (i.status === 'Sin datos') out.push(['wifi-off', 'Verificar el sensor ultrasónico', 'No llegan lecturas nuevas; los valores mostrados son los últimos registrados.']);
    if (i.cong >= 70) {
      const add = Math.round((i.cong - 60) / 4) + 3;
      out.push(['clock', `Ampliar el verde ${ax} de ${g} s a ${g + add} s`, `${AX[heavy.dir]} concentra ${heavy.veh} vehículos con ${heavy.wait} s de espera media en ${road}.`]);
    } else if (i.cong >= 40) out.push(['eye', `Mantener el plan y vigilar ${road}`, `Congestión moderada (${i.cong}%); la previsión a 30 min es de ${D.predict(i, 30).cong}%.`]);
    else out.push(['check', 'Mantener el plan actual', `Congestión baja (${i.cong}%): no se requiere ajuste de tiempos.`]);
    if (neigh.length) out.push(['route', `Coordinar el ciclo con ${neigh[0].id}`, `La intersección vecina está al ${neigh[0].cong}%; sincronizar la onda verde evita acumulaciones.`]);
    if (i.mode === 'Manual') out.push(['rotate-ccw', 'Volver a modo adaptativo al despejar la vía', 'El modo manual mantiene los tiempos fijos y puede aumentar la espera.']);
    VS.render($('#recs'), out.map(([ic, t, w]) => `<div class="rec-item"><i data-lucide="${ic}"></i><div><strong>${esc(t)}</strong><span>${esc(w)}</span></div></div>`).join(''));
  }
  function history() {
    const now = Date.now(), seed = [[2, 'Fase', 'Cambio de fase según el plan de ciclo'], [9, 'Sensores', 'Lectura de sensores sincronizada (simulada)'], [18, 'Plan', `Plan vigente: verde N–S ${i.plan.ns} s / E–O ${i.plan.eo} s`], [34, 'Congestión', `Congestión ${D.level(i.cong).label.toLowerCase()} registrada (${i.cong}%)`], [52, 'Modo', `Modo ${i.mode.toLowerCase()} activo`], [75, 'Sistema', 'Verificación de estado completada']]
      .map(([m, t, x]) => ({ ts: now - m * 60000, t, x }));
    const inc = VS.incidents().filter(x => x.int === i.id).map(x => ({ ts: x.ts, t: 'Incidencia', x: `${x.type}: ${x.desc}` }));
    const rows = session.concat(inc, seed).sort((a, b) => b.ts - a.ts).slice(0, 12);
    $('#hist').innerHTML = rows.map(r => `<tr><td style="white-space:nowrap">${VS.ago(r.ts)}</td><td>${VS.badge(r.t, r.t === 'Incidencia' ? 'warn' : r.t === 'Demo' ? 'info' : '', false)}</td><td>${esc(r.x)}</td></tr>`).join('');
  }

  /* ---------- Gráfico ---------- */
  let chart;
  function buildChart() {
    const p = VS.pal(), now = Date.now(), labels = [];
    for (let n = 11; n >= 0; n--) { const d = new Date(now - n * 600000); labels.push(`${pad(d.getHours())}:${pad(d.getMinutes())}`); }
    chart = VS.chart('flowDetail', { type: 'bar', data: { labels, datasets: [{ label: 'Vehículos / 10 min', data: D.recentFlow(i), backgroundColor: p.blue + 'CC', borderRadius: 4 }] }, options: VS.opts({ plugins: { legend: { display: false } } }) });
  }

  /* ---------- Interacciones demostrativas ---------- */
  root.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]'), f = e.target.closest('[data-force]');
    if (m && m.dataset.mode !== i.mode) {
      i.mode = m.dataset.mode; session.unshift({ ts: Date.now(), t: 'Demo', x: `Modo cambiado a ${i.mode.toLowerCase()} (simulación)` });
      modeCard(i.mode); gauge(); history(); recs(); VS.toast(`Modo ${i.mode.toLowerCase()} aplicado en la simulación. No se envió ninguna señal real.`, 'ok');
    }
    if (f) {
      i.pi = Number(f.dataset.force); i.pr = VS.durs(i)[i.pi]; session.unshift({ ts: Date.now(), t: 'Demo', x: `Fase forzada: ${VS.phaseLabels[i.pi]} (simulación)` });
      phaseCard(); xing(); approaches(); history(); VS.toast('Fase forzada solo en la simulación.', 'ok');
    }
  });
  VS.onSecond(() => {
    const d = VS.durs(i)[i.pi], r = $('#phaseRem'); if (!r) return;
    if ($('#phaseTxt').textContent !== VS.phaseLabels[i.pi]) phaseCard(); else { r.textContent = i.pr; $('#phaseBar').style.width = Math.round(i.pr / d * 100) + '%'; }
    xing(); $$('#approaches .tl').forEach((el, n) => { el.dataset.s = VS.lightState(i, i.approach[n].dir); });
  });
  VS.onTick(() => {
    gauge(); approaches(); recs(); VS.icons();
    if (chart) { chart.data.datasets[0].data[11] = Math.round(i.veh * 10 / 15); chart.update('none'); }
  });

  gauge(); xing(); phaseCard(); modeCard(); approaches(); recs(); history(); buildChart(); VS.icons();
})();
