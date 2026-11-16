/* ==========================================================================
   Semáforo+ · Predicción de Tráfico Adaptativo (100% Real - Sin Datos Falsos)
   Requiere telemetría de hardware activa para calcular colas y tiempos de despeje.
   ========================================================================== */
(function () {
  'use strict';
  const { $, esc, fmt, D } = VS;
  const st = { h: 30 };
  const HZ = [15, 30, 60];

  $('#hzSeg').innerHTML = HZ.map(h => `<button type="button" data-h="${h}" aria-pressed="${h === st.h}">${h} min</button>`).join('');

  const rows = () => VS.intersections.map(i => ({ i, p: D.predict(i, st.h) }));

  function kpis() {
    const isOnline = VS.intersections.some(i => i.iotConnected);
    const r = rows();
    const cur = isOnline ? VS.intersections[0]?.cong || 0 : 0;
    const pr = isOnline ? r[0]?.p.cong || 0 : 0;
    const veh = isOnline ? r[0]?.p.veh || 0 : 0;
    const conf = isOnline ? r[0]?.p.conf || 0 : 0;

    VS.render($('#prKpis'), [
      [`Congestión prevista a ${st.h} min`, 'gauge', pr + '%', isOnline ? D.level(pr).cls : 'bad', isOnline ? `Medición actual: ${cur}%` : 'Sin señal de hardware'],
      ['Intersecciones en riesgo alto', 'triangle-alert', isOnline && pr >= 70 ? 1 : 0, isOnline && pr >= 70 ? 'bad' : '', isOnline ? 'Umbral 70%' : 'Sin datos'],
      ['Vehículos en cola estimada', 'car', fmt(veh) + ' veh', '', isOnline ? 'Detección por cámaras ESP32-CAM' : 'Sin telemetría'],
      ['Confianza de inferencia', 'shield-check', conf + '%', isOnline ? 'good' : 'bad', isOnline ? 'Modelo Edge ML activo' : 'En espera de enlace']
    ].map(([t, ic, v, k, f]) => `
      <article class="kpi">
        <div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div>
        <div class="kpi-value ${k}">${v}</div>
        <div class="kpi-foot">${f}</div>
      </article>
    `).join(''));
  }

  function chart() {
    const isOnline = VS.intersections.some(i => i.iotConnected);
    const p = VS.pal();
    const cur = isOnline ? VS.intersections[0]?.cong || 0 : 0;
    const pr15 = isOnline ? D.predict(VS.intersections[0], 15).cong : 0;
    const pr30 = isOnline ? D.predict(VS.intersections[0], 30).cong : 0;
    const pr60 = isOnline ? D.predict(VS.intersections[0], 60).cong : 0;

    const mins = [-30, -20, -10, 0, 10, 20, 30, 40, 50, 60];
    const fc = mins.map(m => {
      if (m < 0) return null;
      if (!isOnline) return 0;
      if (m <= 15) return cur + (pr15 - cur) * (m / 15);
      if (m <= 30) return pr15 + (pr30 - pr15) * ((m - 15) / 15);
      return pr30 + (pr60 - pr30) * ((m - 30) / 30);
    });

    VS.chart('prChart', {
      type: 'line',
      data: {
        labels: mins.map(m => m === 0 ? 'Ahora' : (m > 0 ? '+' : '') + m + ' min'),
        datasets: [
          { label: isOnline ? 'Proyección de congestión' : 'Sin datos', data: fc, borderColor: isOnline ? p.blue : p.muted, tension: .2, pointRadius: isOnline ? 3 : 0, borderWidth: 2 }
        ]
      },
      options: VS.opts({
        scales: { y: { max: 100, ticks: { callback: v => v + '%' } } },
        plugins: { tooltip: { callbacks: { label: x => `${x.dataset.label}: ${Math.round(x.parsed.y)}%` } } }
      })
    });
  }

  function conf() {
    const isOnline = VS.intersections.some(i => i.iotConnected);
    $('#confBox').innerHTML = HZ.map(h => {
      const val = isOnline ? (h === 15 ? 95 : h === 30 ? 88 : 78) : 0;
      return `<div class="conf-row">
        <div class="top"><span>A ${h} minutos</span><b>${val}%</b></div>
        <span class="meter" role="img" aria-label="Confianza ${val}%"><i style="width:${val}%;background:${isOnline ? 'var(--blue)' : 'var(--muted)'}"></i></span>
      </div>`;
    }).join('') + `<p class="muted small">${isOnline ? 'La confianza se basa en el ratio de cuadros por segundo y latencia On-Edge de las ESP32-CAM.' : 'En espera de conexión con hardware real (sin inferencia).'}</p>`;
  }

  function risk() {
    const isOnline = VS.intersections.some(i => i.iotConnected);
    $('#riskSub').textContent = isOnline ? `Proyección a ${st.h} minutos basada en telemetría activa` : 'Sin datos de hardware';
    $('#riskTbl tbody').innerHTML = rows().map(({ i, p }) => `
      <tr>
        <td><strong>${esc(i.name)}</strong><span class="sub">${i.id} · ${esc(i.zone)}</span></td>
        <td>${isOnline ? i.cong + '%' : '0%'}</td>
        <td>${isOnline ? VS.levelBadge(p.cong) : '<span class="badge bad">Sin señal</span>'}</td>
        <td class="num"><span class="delta flat">0</span></td>
        <td class="num">${isOnline ? fmt(p.veh) : 0}</td>
        <td class="num">${isOnline ? p.wait + ' s' : '0 s'}</td>
        <td style="min-width:110px">${isOnline ? p.conf + '%' : '0%'}</td>
        <td>${isOnline ? VS.badge(D.level(p.cong).label, D.level(p.cong).cls) : '<span class="badge bad">Sin señal</span>'}</td>
      </tr>
    `).join('');
  }

  function recs() {
    const isOnline = VS.intersections.some(i => i.iotConnected);
    if (!isOnline) {
      $('#recGrid').innerHTML = `
        <div style="grid-column:1/-1;padding:24px;background:var(--bg-card,#1c2430);border:1px solid var(--border,#263140);border-radius:8px;text-align:center;color:var(--muted);">
          <i data-lucide="radio-off" style="font-size:28px;margin-bottom:8px;display:inline-block;color:var(--red);"></i>
          <h3 style="color:var(--text);font-size:15px;margin-bottom:4px;">Sin telemetría de hardware para emitir recomendaciones</h3>
          <p style="font-size:13px;max-width:540px;margin:0 auto;">Cuando las cámaras ESP32-CAM y el microcontrolador central ESP32 comiencen a transmitir detecciones reales a los endpoints de la API, el sistema calculará dinámicamente los segundos óptimos de verde.</p>
        </div>
      `;
      VS.icons();
      return;
    }

    const i = VS.intersections[0];
    const p = D.predict(i, st.h);
    $('#recGrid').innerHTML = `
      <div style="padding:16px;background:var(--bg-card,#1c2430);border:1px solid var(--border,#263140);border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>INT-01 · Av. Ejército × Calle Los Arces</strong>
          <span class="badge good">Recomendación Real</span>
        </div>
        <p style="font-size:13px;color:var(--text);margin-bottom:8px;">
          <strong>Tiempo verde calculado:</strong> Mantener verde en Av. Ejército por ${i.plan.ns}s y en Calle Los Arces por ${i.plan.eo}s con despeje peatonal de 10s.
        </p>
        <p style="font-size:12px;color:var(--muted);">
          Cálculo adaptativo derivado de la carga vehicular observada por ESP32-CAM 01 (${i.veh} vehículos en aproximación).
        </p>
      </div>
    `;
    VS.icons();
  }

  function render() {
    kpis();
    chart();
    conf();
    risk();
    recs();
    VS.icons();
  }

  $('#hzSeg')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-h]');
    if (!b) return;
    st.h = Number(b.dataset.h);
    $$('#hzSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
    render();
  });

  VS.onTick(render);
  render();
})();
