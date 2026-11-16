/* Predicciones · módulo inteligente SIMULADO (sin modelos reales) */
(function () {
  'use strict';
  const { $, esc, fmt, D } = VS;
  const st = { h: 30 }, applied = new Set();
  const HZ = [15, 30, 60];
  $('#hzSeg').innerHTML = HZ.map(h => `<button type="button" data-h="${h}" aria-pressed="${h === st.h}">${h} min</button>`).join('');
  const rows = () => VS.intersections.map(i => ({ i, p: D.predict(i, st.h) })).sort((a, b) => b.p.cong - a.p.cong);
  const netAvg = h => Math.round(VS.intersections.reduce((s, i) => s + (h ? D.predict(i, h).cong : i.cong), 0) / VS.intersections.length);

  function kpis() {
    const r = rows(), cur = netAvg(0), pr = netAvg(st.h), riskNow = VS.intersections.filter(i => i.cong >= 70).length, riskPr = r.filter(x => x.p.cong >= 70).length;
    const conf = Math.round(r.reduce((s, x) => s + x.p.conf, 0) / r.length), veh = r.reduce((s, x) => s + x.p.veh, 0);
    VS.render($('#prKpis'), [
      [`Congestión prevista a ${st.h} min`, 'gauge', pr + '%', D.level(pr).cls, `Ahora: ${cur}% (${pr - cur >= 0 ? '+' : ''}${pr - cur} pts)`],
      ['Intersecciones en riesgo alto', 'triangle-alert', riskPr, riskPr > riskNow ? 'bad' : '', `Ahora: ${riskNow} · umbral 70%`],
      ['Vehículos previstos (15 min)', 'car', fmt(veh), '', 'suma de la red'],
      ['Confianza media estimada', 'shield-check', conf + '%', '', 'valor simulado']
    ].map(([t, ic, v, k, f]) => `<article class="kpi"><div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div><div class="kpi-value ${k}">${v}</div><div class="kpi-foot">${f}</div></article>`).join(''));
  }
  function chart() {
    const p = VS.pal(), cur = netAvg(0), pts = [[0, cur], [15, netAvg(15)], [30, netAvg(30)], [60, netAvg(60)]];
    const at = m => { for (let k = 1; k < pts.length; k++) if (m <= pts[k][0]) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; return y0 + (y1 - y0) * (m - x0) / (x1 - x0); } return pts[3][1]; };
    const mins = []; for (let m = -30; m <= 60; m += 5) mins.push(m);
    const hist = mins.map(m => m > 0 ? null : Math.round(cur + (netAvg(15) - cur) * (m / 15) * .6 + (D.rnd(m + 99) - .5) * 2));
    const fc = mins.map(m => m < 0 ? null : Math.round(at(m)));
    const band = m => m < 0 ? null : (m / 60) * ((100 - [93, 85, 73][st.h === 15 ? 0 : st.h === 30 ? 1 : 2]) * .6) + 1;
    const up = mins.map((m, k) => fc[k] == null ? null : Math.min(100, Math.round(fc[k] + band(m)))), lo = mins.map((m, k) => fc[k] == null ? null : Math.max(0, Math.round(fc[k] - band(m))));
    VS.chart('prChart', { type: 'line', data: { labels: mins.map(m => m === 0 ? 'Ahora' : (m > 0 ? '+' : '') + m + ' min'), datasets: [
      { label: 'Histórico', data: hist, borderColor: p.muted, tension: .3, pointRadius: 0, borderWidth: 2 },
      { label: 'Previsión simulada', data: fc, borderColor: p.blue, borderDash: [6, 4], tension: .3, pointRadius: mins.map(m => [0, 15, 30, 60].includes(m) ? 4 : 0), borderWidth: 2 },
      { label: 'Banda superior', data: up, borderColor: 'transparent', backgroundColor: p.blue + '22', fill: '+1', pointRadius: 0, tension: .3 },
      { label: 'Banda inferior', data: lo, borderColor: 'transparent', pointRadius: 0, tension: .3 }
    ] }, options: VS.opts({ scales: { y: { max: 100, ticks: { callback: v => v + '%' } } }, plugins: { legend: { labels: { filter: it => it.datasetIndex < 2 } }, tooltip: { filter: it => it.datasetIndex < 2, callbacks: { label: x => `${x.dataset.label}: ${x.parsed.y}%` } } } }) });
  }
  function conf() {
    const r = h => Math.round(VS.intersections.reduce((s, i) => s + D.predict(i, h).conf, 0) / VS.intersections.length);
    $('#confBox').innerHTML = HZ.map(h => `<div class="conf-row"><div class="top"><span>A ${h} minutos</span><b>${r(h)}%</b></div><span class="meter" role="img" aria-label="Confianza ${r(h)}%"><i style="width:${r(h)}%;background:var(--blue)"></i></span></div>`).join('') + '<p class="muted small">La confianza es un valor ilustrativo que decrece con el horizonte y con la falta de datos de sensores.</p>';
  }
  function risk() {
    $('#riskSub').textContent = `Ordenadas por congestión prevista a ${st.h} minutos · simulación`;
    $('#riskTbl tbody').innerHTML = rows().map(({ i, p }) => `<tr><td><strong>${esc(i.name)}</strong><span class="sub">${i.id} · ${esc(i.zone)}</span></td><td>${i.cong}%</td><td>${VS.levelBadge(p.cong)}</td><td class="num"><span class="delta ${p.delta > 0 ? 'up-bad' : p.delta < 0 ? 'down-good' : 'flat'}">${p.delta > 0 ? '▲ +' : p.delta < 0 ? '▼ ' : '■ '}${p.delta}</span></td><td class="num">${fmt(p.veh)}</td><td class="num">${p.wait} s</td><td style="min-width:110px">${p.conf}%<span class="meter" style="margin-top:4px"><i style="width:${p.conf}%;background:var(--blue)"></i></span></td><td>${VS.badge(D.level(p.cong).label, D.level(p.cong).cls)}</td></tr>`).join('');
  }
  function recs() {
    const top = rows().slice(0, 4);
    VS.render($('#recGrid'), top.map(({ i, p }) => {
      const ns = (i.split[0] + i.split[1]) >= (i.split[2] + i.split[3]), ax = ns ? 'N–S' : 'E–O', ox = ns ? 'E–O' : 'N–S', road = ns ? i.roads[0] : i.roads[1];
      const g = ns ? i.plan.ns : i.plan.eo, og = ns ? i.plan.eo : i.plan.ns, share = Math.round((ns ? i.split[0] + i.split[1] : i.split[2] + i.split[3]) * 100);
      let title, why;
      if (p.cong >= 60) {
        const add = Math.min(15, Math.max(3, Math.round((p.cong - 50) / 4) + 3)), cut = Math.round(add / 2);
        title = `Ampliar el verde ${ax} de ${g} s a ${g + add} s`;
        why = `<strong>Por qué:</strong> la congestión prevista sube de ${i.cong}% a ${p.cong}% y la espera estimada llega a ${p.wait} s. El eje ${ax} (${esc(road)}) concentra el ${share}% del flujo. Reducir el verde ${ox} de ${og} s a ${og - cut} s compensa el ciclo sin dejar ese eje con esperas críticas.`;
      } else if (p.cong >= 45) {
        title = `Ajustar el desfase con las intersecciones vecinas`;
        why = `<strong>Por qué:</strong> la congestión prevista es moderada (${p.cong}%) pero con tendencia ${p.delta > 0 ? 'al alza' : 'estable'}. Sincronizar el inicio del verde ${ax} con la onda verde del corredor evita acumulaciones sin cambiar los tiempos.`;
      } else {
        title = 'Mantener el plan actual';
        why = `<strong>Por qué:</strong> la congestión prevista permanece baja (${p.cong}%) y la espera estimada (${p.wait} s) está dentro del rango normal.`;
      }
      const done = applied.has(i.id);
      return `<article class="card rec-card"><div class="card-head" style="margin:0"><div><h3>${i.id} · ${esc(i.roads[0])}</h3><span class="sub">${esc(i.zone)} · confianza ${p.conf}%</span></div><span class="badge info">Simulación</span></div><strong>${esc(title)}</strong><div class="why">${why}</div><button type="button" class="btn btn-sm ${done ? '' : 'btn-primary'}" data-apply="${i.id}" ${done ? 'disabled' : ''}>${done ? 'Aplicada en la simulación' : 'Aplicar en la simulación'}</button></article>`;
    }).join(''));
  }
  function renderAll() { kpis(); chart(); conf(); risk(); recs(); }
  $('#hzSeg').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (!b) return; st.h = Number(b.dataset.h); $('#hzSeg').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); renderAll(); });
  $('#recGrid').addEventListener('click', e => { const b = e.target.closest('[data-apply]'); if (!b) return; applied.add(b.dataset.apply); recs(); VS.toast('Recomendación aplicada solo en la simulación. No se controla ningún semáforo real.', 'ok'); });
  VS.onTick(() => { kpis(); risk(); });
  renderAll();
})();
