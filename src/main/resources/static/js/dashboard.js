/* Dashboard · Centro de control de tráfico */
(function () {
  'use strict';
  const { $, $$, esc, fmt, pad, D } = VS;
  const st = { zone: 'Todas', period: 'hoy', sel: null };
  const list = () => st.zone === 'Todas' ? VS.intersections : VS.intersections.filter(i => i.zone === st.zone);

  $('#zoneSel').innerHTML = VS.options(['Todas', ...D.zones]);
  $('#periodSel').innerHTML = VS.options(Object.entries(D.periods).map(([v, p]) => ({ v, l: p.label })));
  $$('[data-widget]').forEach(el => { el.hidden = !VS.prefs.widgets[el.dataset.widget]; });
  $('#mapLegend').innerHTML = [['var(--green)', 'Fluido'], ['var(--yellow)', 'Moderado'], ['var(--red)', 'Alto']].map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');

  /* ---------- KPI ---------- */
  function renderKPIs() {
    const l = list(), live = l.filter(i => i.status !== 'Sin datos');
    const veh = l.reduce((s, i) => s + i.veh, 0);
    const wait = veh ? Math.round(l.reduce((s, i) => s + i.wait * i.veh, 0) / veh) : 0;
    const cong = l.length ? Math.round(l.reduce((s, i) => s + i.cong, 0) / l.length) : 0, lv = D.level(cong);
    const ids = l.map(i => i.id), inc = VS.activeIncidents().filter(x => ids.includes(x.int)), high = inc.filter(x => x.prio === 'Alta').length;
    const worst = l.slice().sort((a, b) => b.wait - a.wait)[0];
    const p15 = l.length ? Math.round(l.reduce((s, i) => s + D.predict(i, 15).cong, 0) / l.length) : 0;
    const cards = [
      ['Intersecciones monitoreadas', 'map-pin', l.length, '', `${live.length} con datos · ${l.length - live.length} sin datos`],
      ['Vehículos detectados', 'car', fmt(veh), '', 'en los últimos 15 minutos'],
      ['Tiempo promedio de espera', 'timer', wait + ' s', '', worst ? `Máximo ${worst.wait} s en ${worst.id}` : '—'],
      ['Nivel de congestión', 'gauge', cong + '%', lv.cls, `${lv.label} · previsto a 15 min: ${p15}%`],
      ['Incidencias activas', 'triangle-alert', inc.length, high ? 'bad' : '', `${high} de prioridad alta`]
    ];
    VS.render($('#kpis'), cards.map(([t, ic, v, c, f]) => `<article class="kpi"><div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div><div class="kpi-value ${c}">${v}</div><div class="kpi-foot">${f}</div></article>`).join(''));
  }

  /* ---------- Mapa esquemático (SVG) ---------- */
  function renderMap() {
    const l = list(), inZone = new Set(l.map(i => i.id)), all = VS.intersections;
    let blocks = ''; for (let a = 0; a < 7; a++) for (let b = 0; b < 4; b++) blocks += `<rect class="blk" x="${24 + a * 112}" y="${22 + b * 108}" width="92" height="84" rx="8"/>`;
    const edges = D.edges.map(([a, b]) => {
      const A = VS.byId(a), B = VS.byId(b), c = Math.round((A.cong + B.cong) / 2), on = inZone.has(a) || inZone.has(b);
      return `<g opacity="${on ? 1 : .25}"><line class="road-case" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/><line class="road" style="stroke:${D.level(c).color}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/></g>`;
    }).join('');
    const nodes = all.map(i => {
      const lv = D.level(i.cong), on = inZone.has(i.id);
      return `<g class="node" data-int="${i.id}" transform="translate(${i.x},${i.y})" opacity="${on ? 1 : .3}" ${on ? 'tabindex="0" role="button"' : 'aria-hidden="true"'} aria-label="${esc(i.id + ' ' + i.name + ', congestión ' + i.cong + '%, ' + lv.label)}"><circle class="fring" r="27"/>${st.sel === i.id ? '<circle class="sel" r="24"/>' : ''}<circle class="ring" style="stroke:${lv.color}" r="17"/><text class="nid" y="4" text-anchor="middle">${pad(i.n)}</text><text class="nlabel" y="38" text-anchor="middle">${esc(i.roads[0])}</text></g>`;
    }).join('');
    $('#map').innerHTML = `<svg viewBox="0 0 800 460" role="group" aria-label="Mapa esquemático de la red vial con ${all.length} intersecciones">${blocks}<path class="river" d="M-10 262 C 110 300, 210 310, 320 276 S 560 170, 810 196"/><text class="river-label" x="24" y="300">Río (ilustrativo)</text>${edges}${nodes}</svg>`;
  }
  function renderDetail() {
    const i = VS.byId(st.sel);
    if (!i) { $('#mapDetail').innerHTML = '<p class="muted">Selecciona una intersección en el mapa para ver sus detalles.</p>'; return; }
    VS.render($('#mapDetail'), `<div class="md-head"><strong>${esc(i.name)}</strong>${VS.levelBadge(i.cong)}${VS.statusBadge(i.status)}<a class="btn btn-sm" style="margin-left:auto" href="detalle-interseccion.html?id=${i.id}">Ver detalle</a></div>
      <dl class="dl"><div><dt>Código y zona</dt><dd>${i.id} · ${esc(i.zone)}</dd></div><div><dt>Vehículos (15 min)</dt><dd>${fmt(i.veh)}</dd></div><div><dt>Espera promedio</dt><dd>${i.wait} s</dd></div><div><dt>Fase actual</dt><dd>${VS.phaseHTML(i)}</dd></div><div><dt>Modo</dt><dd>${esc(i.mode)}</dd></div></dl>`);
  }

  /* ---------- Tabla, predicción e incidencias ---------- */
  function renderLights() {
    $('#lightsTbl tbody').innerHTML = list().map(i => `<tr><td><strong>${esc(i.name)}</strong><span class="sub">${i.id}</span></td><td>${esc(i.zone)}</td><td>${VS.phaseHTML(i)}</td><td>${VS.modeBadge(i.mode)}</td><td>${VS.levelBadge(i.cong)}</td><td>${VS.statusBadge(i.status)}</td><td><a class="btn btn-sm" href="detalle-interseccion.html?id=${i.id}" aria-label="Ver detalle de ${esc(i.id)}">Detalle</a></td></tr>`).join('');
  }
  function renderPred() {
    const rows = list().map(i => ({ i, p: D.predict(i, 15) })).sort((a, b) => b.p.cong - a.p.cong).slice(0, 5);
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.p.conf, 0) / rows.length) : 0;
    VS.render($('#predList'), rows.map(({ i, p }) => `<li><div class="li-main"><div><strong>${i.id}</strong><span class="sub">${esc(i.roads[0])}</span></div></div><div class="pr-vals">${i.cong}% → <strong style="color:${D.level(p.cong).color}">${p.cong}%</strong><i data-lucide="${p.delta > 0 ? 'trending-up' : p.delta < 0 ? 'trending-down' : 'minus'}" aria-label="${p.delta > 0 ? 'en aumento' : p.delta < 0 ? 'en descenso' : 'estable'}"></i></div></li>`).join('') + `<li><span class="sub">Simulación · confianza media ${avg}%</span></li>`);
  }
  function renderInc() {
    const ids = list().map(i => i.id), inc = VS.incidents().filter(x => ids.includes(x.int)).slice(0, 5);
    VS.render($('#incList'), inc.length ? inc.map(x => `<li><div class="li-main"><i data-lucide="${x.prio === 'Alta' ? 'triangle-alert' : 'info'}" style="color:${x.prio === 'Alta' ? 'var(--red)' : 'var(--muted)'}"></i><div><strong>${esc(x.type)}</strong><span class="sub">${x.int} · ${VS.ago(x.ts)} · ${esc(x.status)}</span></div></div>${VS.prioBadge(x.prio)}</li>`).join('') : '<li class="muted">Sin incidencias en esta zona.</li>');
  }

  /* ---------- Gráficos ---------- */
  let flowChart, distChart;
  function flowSets() {
    const P = D.periods[st.period], refKey = st.period === 'hoy' ? 'ayer' : 'hoy', R = D.periods[refKey], l = list(), all = VS.intersections;
    return { P, R, cur: D.flow(l, all, P.k, 'dash' + st.period), ref: D.flow(l, all, R.k, 'dash' + refKey) };
  }
  function buildFlow() {
    const { P, R, cur, ref } = flowSets(), p = VS.pal(), nowH = new Date().getHours();
    $('#flowSub').textContent = `Vehículos por hora · ${P.label}${st.zone !== 'Todas' ? ' · ' + st.zone : ''}${st.period === 'hoy' ? ' (línea punteada: proyección)' : ''}`;
    flowChart = VS.chart('flowChart', {
      type: 'line', data: { labels: D.hours, datasets: [
        { label: P.label, data: cur, borderColor: p.blue, backgroundColor: p.blue + '22', fill: true, tension: .35, pointRadius: 0, borderWidth: 2, segment: st.period === 'hoy' ? { borderDash: c => c.p0DataIndex >= nowH ? [5, 4] : undefined } : undefined },
        { label: R.label, data: ref, borderColor: p.muted, borderDash: [4, 4], tension: .35, pointRadius: 0, borderWidth: 1.5 }
      ] }, options: VS.opts({ plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.y)} veh/h` } } } })
    });
  }
  function counts() { const l = list(); return ['fluido', 'moderado', 'alto'].map(k => l.filter(i => D.level(i.cong).key === k).length); }
  function buildDist() {
    const p = VS.pal(), c = counts();
    distChart = VS.chart('distChart', { type: 'doughnut', data: { labels: ['Fluido', 'Moderado', 'Alto'], datasets: [{ data: c, backgroundColor: [p.green, p.yellow, p.red], borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim(), borderWidth: 3 }] }, options: VS.opts({ cutout: '66%', plugins: { legend: { position: 'bottom' } } }, { noScales: true }) });
    $('#distSub').textContent = `${list().length} intersecciones${st.zone !== 'Todas' ? ' · ' + st.zone : ''}`;
  }

  /* ---------- Orquestación ---------- */
  function renderAll() {
    renderKPIs(); renderMap(); renderDetail(); renderLights(); renderPred(); renderInc();
    const banner = $('#iotStatusBanner');
    if (banner) {
      const int01 = VS.byId('INT-01');
      banner.style.display = (int01 && !int01.iotConnected) ? 'block' : 'none';
    }
  }

  async function syncBackendAndRender() {
    if (D.service.syncFromBackend) {
      const res = await D.service.syncFromBackend();
      if (res && res.node) {
        const int01 = VS.byId('INT-01');
        if (int01) {
          int01.iotConnected = res.node.iotConnected;
          if (res.node.iotConnected) {
            int01.status = 'Operativa';
            int01.mode = 'ESP32 Adaptativo (Local)';
          } else {
            int01.status = 'Sin datos';
            int01.mode = 'ESP32 Desconectado';
          }
        }
      }
    }
    renderAll();
    if (distChart) { distChart.data.datasets[0].data = counts(); distChart.update('none'); }
    if (flowChart) { const { cur, ref } = flowSets(); flowChart.data.datasets[0].data = cur; flowChart.data.datasets[1].data = ref; flowChart.update('none'); }
  }

  function onFilter() {
    if (st.sel && !list().some(i => i.id === st.sel)) st.sel = list().slice().sort((a, b) => b.cong - a.cong)[0].id;
    renderAll(); buildFlow(); buildDist();
  }
  $('#zoneSel').addEventListener('change', e => { st.zone = e.target.value; onFilter(); });
  $('#periodSel').addEventListener('change', e => { st.period = e.target.value; buildFlow(); });
  const select = id => { st.sel = id; renderMap(); renderDetail(); };
  $('#map').addEventListener('click', e => { const g = e.target.closest('[data-int]'); if (g && g.hasAttribute('tabindex')) { select(g.dataset.int); } });
  $('#map').addEventListener('keydown', e => { const g = e.target.closest('[data-int]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g.dataset.int); setTimeout(() => { const n = $(`[data-int="${g.dataset.int}"]`); if (n) n.focus(); }, 0); } });
  $('#refreshBtn').addEventListener('click', async () => {
    const b = $('#refreshBtn');
    b.classList.add('spin');
    await syncBackendAndRender();
    setTimeout(() => {
      b.classList.remove('spin');
      const int01 = VS.byId('INT-01');
      if (int01 && int01.iotConnected) {
        VS.toast('Telemetría real actualizada desde ESP32', 'ok');
      } else {
        VS.toast('Datos actualizados · ESP32 INT-01 sin señal de hardware', 'warn');
      }
    }, 400);
  });

  VS.onTick(() => {
    syncBackendAndRender();
  });

  st.sel = VS.intersections.slice().sort((a, b) => b.cong - a.cong)[0].id;
  renderAll(); buildFlow(); buildDist();
  syncBackendAndRender();
})();
