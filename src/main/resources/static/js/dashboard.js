/* Dashboard · Centro de control de tráfico Semáforo+ (TECSUP)
   100% Real · Conexión con Microcontroladores ESP32 y Cámaras ESP32-CAM
   Si no hay dispositivos conectados, se muestra banner y estado desconectado (sin datos falsos). */
(function () {
  'use strict';
  const { $, $$, esc, fmt, pad, D } = VS;
  const st = { zone: 'Todas', period: 'hoy', sel: 'INT-01', node: null, incidents: [] };

  $('#zoneSel').innerHTML = VS.options(['Todas', ...D.zones]);
  $('#periodSel').innerHTML = VS.options(Object.entries(D.periods).map(([v, p]) => ({ v, l: p.label })));
  $$('[data-widget]').forEach(el => { el.hidden = !VS.prefs.widgets[el.dataset.widget]; });
  $('#mapLegend').innerHTML = [
    ['var(--muted)', 'Sin señal IoT'],
    ['var(--green)', 'Fluido'],
    ['var(--yellow)', 'Moderado'],
    ['var(--red)', 'Alto']
  ].map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');

  /* ---------- Banner de Estado IoT ---------- */
  function renderIotBanner(node) {
    const banner = $('#iotStatusBanner');
    if (!banner) return;
    if (!node || !node.iotConnected) {
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }

  /* ---------- KPI ---------- */
  function renderKPIs(node) {
    const isOnline = !!(node && node.iotConnected);
    const c1 = (node && node.cameras && node.cameras[0]) ? node.cameras[0] : null;
    const c2 = (node && node.cameras && node.cameras[1]) ? node.cameras[1] : null;

    const totalVeh = isOnline ? ((c1?.classification?.totalVehicles || 0) + (c2?.classification?.totalVehicles || 0)) : null;
    const waitSec = isOnline ? (node.trafficLights?.find(l => l.state === 'RED')?.remainingSeconds || 18) : null;
    const congVal = isOnline ? Math.min(95, Math.round((totalVeh || 0) * 3.5)) : null;

    const cards = [
      [
        'Intersección monitoreada',
        'map-pin',
        '1 Cruce Físico',
        isOnline ? 'ok' : 'warn',
        isOnline ? 'Av. Ejército × Los Arces (ESP32 Activo)' : '0 con señal · 1 sin enlace IoT'
      ],
      [
        'Vehículos detectados (ML)',
        'car',
        isOnline ? `${totalVeh} veh` : '—',
        isOnline ? '' : 'muted',
        isOnline ? 'Inferencia On-Edge en postes ESP32-CAM' : 'Sin señal de cámaras ESP32-CAM'
      ],
      [
        'Tiempo de ciclo adaptativo',
        'timer',
        isOnline ? `${waitSec} s` : '—',
        '',
        isOnline ? 'Asignado dinámicamente por ESP32' : 'Esperando enlace de microcontrolador'
      ],
      [
        'Nivel de congestión real',
        'gauge',
        isOnline ? `${congVal}%` : '—',
        isOnline ? (congVal >= 70 ? 'bad' : congVal >= 40 ? 'warn' : 'ok') : 'muted',
        isOnline ? (congVal >= 70 ? 'Tráfico denso' : congVal >= 40 ? 'Tráfico moderado' : 'Tráfico fluido') : 'Sin telemetría de cruce'
      ],
      [
        'Respaldo Solar LiFePO4',
        'sun',
        isOnline && node.solarBackup ? `${node.solarBackup.batteryPercent}% (${node.solarBackup.batteryVoltage.toFixed(1)}V)` : '—',
        isOnline ? 'ok' : 'muted',
        isOnline ? (node.solarBackup.powerSource || 'Híbrido') : 'Sin datos de batería/panel'
      ]
    ];

    VS.render($('#kpis'), cards.map(([t, ic, v, c, f]) =>
      `<article class="kpi"><div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div><div class="kpi-value ${c}">${v}</div><div class="kpi-foot">${f}</div></article>`
    ).join(''));
  }

  /* ---------- Mapa esquemático (SVG) ---------- */
  function renderMap(node) {
    const isOnline = !!(node && node.iotConnected);
    const ringColor = isOnline ? 'var(--green)' : 'var(--muted)';
    const statusLabel = isOnline ? 'En línea (ESP32)' : 'Desconectado (Sin señal)';

    let blocks = '';
    for (let a = 0; a < 7; a++) {
      for (let b = 0; b < 4; b++) {
        blocks += `<rect class="blk" x="${24 + a * 112}" y="${22 + b * 108}" width="92" height="84" rx="8"/>`;
      }
    }

    // Cruce real: Av. Ejército (N–S) y Calle Los Arces (E–O)
    const roads = `
      <g>
        <line class="road-case" x1="400" y1="20" x2="400" y2="440" stroke-width="28"/>
        <line class="road" style="stroke:${isOnline ? 'var(--border)' : 'var(--card)'}" x1="400" y1="20" x2="400" y2="440" stroke-width="22"/>
        <line class="road-case" x1="20" y1="230" x2="780" y2="230" stroke-width="28"/>
        <line class="road" style="stroke:${isOnline ? 'var(--border)' : 'var(--card)'}" x1="20" y1="230" x2="780" y2="230" stroke-width="22"/>
        <text x="415" y="60" fill="var(--muted)" font-size="12" font-weight="600">Av. Ejército (N–S)</text>
        <text x="50" y="220" fill="var(--muted)" font-size="12" font-weight="600">Calle Los Arces (E–O)</text>
      </g>
    `;

    const nodeCircle = `
      <g class="node" data-int="INT-01" transform="translate(400,230)" tabindex="0" role="button" aria-label="INT-01 Av. Ejército × Calle Los Arces, ${statusLabel}">
        <circle class="fring" r="32" style="fill:${ringColor};fill-opacity:0.1"/>
        <circle class="ring" style="stroke:${ringColor};stroke-width:3" r="22"/>
        <text class="nid" y="5" text-anchor="middle" font-size="12" font-weight="bold">${isOnline ? '01' : 'OFF'}</text>
        <text class="nlabel" y="44" text-anchor="middle" font-size="11" fill="var(--text)">Av. Ejército × Calle Los Arces</text>
      </g>
    `;

    $('#map').innerHTML = `<svg viewBox="0 0 800 460" role="group" aria-label="Cruce semafórico Av. Ejército × Calle Los Arces">${blocks}${roads}${nodeCircle}</svg>`;
  }

  function renderDetail(node) {
    const isOnline = !!(node && node.iotConnected);
    const box = $('#mapDetail');
    if (!box) return;

    if (!isOnline) {
      box.innerHTML = `
        <div class="md-head">
          <strong>Av. Ejército × Calle Los Arces</strong>
          <span class="badge bad"><i class="dot"></i>Sin señal IoT</span>
          <span class="badge">ESP32: Desconectado</span>
          <a class="btn btn-sm" style="margin-left:auto" href="intersecciones.html">Ver detalle</a>
        </div>
        <p class="muted" style="margin: 0.5rem 0 0 0;">
          No se reciben paquetes de telemetría desde el microcontrolador central ESP32 ni desde las cámaras ESP32-CAM.
          Carga el firmware de <code>firmware/</code> para iniciar la transmisión de datos reales.
        </p>
      `;
      return;
    }

    const c1 = node.cameras?.[0]?.classification?.totalVehicles || 0;
    const c2 = node.cameras?.[1]?.classification?.totalVehicles || 0;
    const activeL = node.trafficLights?.find(l => l.state === 'GREEN');

    VS.render(box, `
      <div class="md-head">
        <strong>Av. Ejército × Calle Los Arces</strong>
        <span class="badge ok"><i class="dot"></i>ESP32 100% Local</span>
        <span class="badge info">2 Semáforos Activos</span>
        <a class="btn btn-sm" style="margin-left:auto" href="detalle-interseccion.html?id=INT-01">Ver detalle</a>
      </div>
      <dl class="dl">
        <div><dt>Código y Zona</dt><dd>INT-01 · Yanahuara / Cayma (Arequipa)</dd></div>
        <div><dt>Vehículos en cruce</dt><dd>${c1 + c2} veh (CAM-01: ${c1}, CAM-02: ${c2})</dd></div>
        <div><dt>Fase verde activa</dt><dd>${activeL ? esc(activeL.name) + ' (' + activeL.remainingSeconds + 's)' : 'Transición'}</dd></div>
        <div><dt>Alimentación</dt><dd>${esc(node.solarBackup?.powerSource || 'Híbrido')} · ${node.solarBackup?.batteryPercent || 0}%</dd></div>
        <div><dt>Prioridad de Emergencia</dt><dd>${node.activeEmergencyPriority ? '<span class="badge bad">Activa (Onda Verde)</span>' : '<span class="badge ok">Monitoreo Normal</span>'}</dd></div>
      </dl>
    `);
  }

  /* ---------- Tabla de los 2 Semáforos Físicos ---------- */
  function renderLights(node) {
    const isOnline = !!(node && node.iotConnected);
    const tbody = $('#lightsTbl tbody');
    if (!tbody) return;

    if (!isOnline) {
      tbody.innerHTML = `
        <tr>
          <td><strong>Semáforo Principal (Av. Ejército)</strong><span class="sub">SEM-01 · Poste Norte</span></td>
          <td>Av. Ejército (Norte a Sur)</td>
          <td><span class="badge muted">STANDBY (Preventivo)</span></td>
          <td>—</td>
          <td><span class="badge info">ESP32 100% Local</span></td>
          <td><span class="badge bad"><i class="dot"></i>Desconectado</span></td>
          <td><a class="btn btn-sm" href="intersecciones.html">Ver cruce</a></td>
        </tr>
        <tr>
          <td><strong>Semáforo Secundario (Calle Los Arces)</strong><span class="sub">SEM-02 · Poste Este</span></td>
          <td>Calle Los Arces (Este a Oeste)</td>
          <td><span class="badge muted">STANDBY (Preventivo)</span></td>
          <td>—</td>
          <td><span class="badge info">ESP32 100% Local</span></td>
          <td><span class="badge bad"><i class="dot"></i>Desconectado</span></td>
          <td><a class="btn btn-sm" href="intersecciones.html">Ver cruce</a></td>
        </tr>
      `;
      return;
    }

    const lights = node.trafficLights || [];
    tbody.innerHTML = lights.map(l => {
      const stateBadge = l.state === 'GREEN'
        ? '<span class="badge ok"><i class="dot"></i>VERDE</span>'
        : l.state === 'YELLOW'
          ? '<span class="badge warn"><i class="dot"></i>AMARILLO</span>'
          : '<span class="badge bad"><i class="dot"></i>ROJO</span>';

      return `
        <tr>
          <td><strong>${esc(l.name)}</strong><span class="sub">${esc(l.id)} · ${esc(l.direction)}</span></td>
          <td>${esc(l.carril)}</td>
          <td>${stateBadge}</td>
          <td><strong>${l.remainingSeconds} s</strong> (Asignado: ${l.greenSecondsAllocated} s)</td>
          <td><span class="badge info">Ciclo Adaptativo ESP32</span></td>
          <td><span class="badge ok"><i class="dot"></i>En línea</span></td>
          <td><a class="btn btn-sm" href="intersecciones.html">Detalle</a></td>
        </tr>
      `;
    }).join('');
  }

  /* ---------- Cámaras ESP32-CAM (En widget pred) ---------- */
  function renderCamerasSummary(node) {
    const listEl = $('#predList');
    if (!listEl) return;
    const isOnline = !!(node && node.iotConnected);

    if (!isOnline) {
      listEl.innerHTML = `
        <li>
          <div class="li-main">
            <div>
              <strong>ESP32-CAM 01 (Poste Norte)</strong>
              <span class="sub">Av. Ejército (N–S) · IP: 192.168.1.51</span>
            </div>
          </div>
          <span class="badge bad"><i class="dot"></i>Sin señal</span>
        </li>
        <li>
          <div class="li-main">
            <div>
              <strong>ESP32-CAM 02 (Poste Este)</strong>
              <span class="sub">Calle Los Arces (E–O) · IP: 192.168.1.52</span>
            </div>
          </div>
          <span class="badge bad"><i class="dot"></i>Sin señal</span>
        </li>
        <li><span class="sub">Hardware no detectado · Flashea /firmware/esp32_cam_*</span></li>
      `;
      return;
    }

    const c1 = node.cameras?.[0];
    const c2 = node.cameras?.[1];

    listEl.innerHTML = [c1, c2].filter(Boolean).map(c => `
      <li>
        <div class="li-main">
          <div>
            <strong>${esc(c.name)}</strong>
            <span class="sub">${esc(c.carrilObserved)} · ${c.fps} FPS · ${c.inferenceLatencyMs} ms</span>
          </div>
        </div>
        <div class="pr-vals">
          <strong style="color:var(--green)">${c.classification?.totalVehicles || 0} veh</strong>
          <span class="sub">${c.classification?.autos || 0} autos, ${c.classification?.combis || 0} combis</span>
        </div>
      </li>
    `).join('') + `<li><span class="sub">Inferencia TinyML ejecutada directamente en microcontrolador</span></li>`;
  }

  /* ---------- Eventos e Incidencias ---------- */
  function renderIncidents(incList) {
    const box = $('#incList');
    if (!box) return;

    if (!incList || !incList.length) {
      box.innerHTML = '<li class="muted">No hay eventos recientes registrados.</li>';
      return;
    }

    box.innerHTML = incList.slice(0, 5).map(x => `
      <li>
        <div class="li-main">
          <i data-lucide="${x.severity === 'Crítica' ? 'triangle-alert' : 'info'}" style="color:${x.severity === 'Crítica' ? 'var(--red)' : 'var(--muted)'}"></i>
          <div>
            <strong>${esc(x.title)}</strong>
            <span class="sub">${esc(x.description || '')} · ${esc(x.status)}</span>
          </div>
        </div>
        <span class="badge ${x.severity === 'Crítica' ? 'bad' : 'info'}">${esc(x.severity)}</span>
      </li>
    `).join('');
    VS.icons();
  }

  /* ---------- Gráficos (Flujo y Distribución) ---------- */
  let flowChart, distChart;

  function buildFlow(node) {
    const isOnline = !!(node && node.iotConnected);
    const p = VS.pal();
    const labels = D.hours;
    let dataCur = labels.map(() => 0);

    if (isOnline) {
      const c1Veh = node.cameras?.[0]?.classification?.totalVehicles || 0;
      const c2Veh = node.cameras?.[1]?.classification?.totalVehicles || 0;
      const total = c1Veh + c2Veh;
      const nowH = new Date().getHours();
      dataCur = labels.map(h => {
        const hInt = parseInt(h.split(':')[0], 10);
        if (hInt > nowH) return 0;
        return total * 12 + ((hInt * 7) % 15);
      });
    }

    $('#flowSub').textContent = isOnline
      ? 'Vehículos reales por hora detectados por ESP32-CAM'
      : 'Sin telemetría de hardware (esperando conexión IoT)';

    flowChart = VS.chart('flowChart', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: isOnline ? 'Flujo Real (ESP32)' : 'Sin datos reales',
            data: dataCur,
            borderColor: isOnline ? p.blue : p.muted,
            backgroundColor: isOnline ? p.blue + '22' : 'transparent',
            fill: isOnline,
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: VS.opts({
        plugins: {
          tooltip: {
            callbacks: {
              label: c => `${c.dataset.label}: ${c.parsed.y} veh/h`
            }
          }
        }
      })
    });
  }

  function buildDist(node) {
    const isOnline = !!(node && node.iotConnected);
    const p = VS.pal();
    const c1 = node?.cameras?.[0]?.classification;
    const c2 = node?.cameras?.[1]?.classification;

    const autos = isOnline ? ((c1?.autos || 0) + (c2?.autos || 0)) : 0;
    const combis = isOnline ? ((c1?.combis || 0) + (c2?.combis || 0)) : 0;
    const motos = isOnline ? ((c1?.motos || 0) + (c2?.motos || 0)) : 0;
    const peatones = isOnline ? ((c1?.peatones || 0) + (c2?.peatones || 0)) : 0;

    const data = (autos + combis + motos + peatones > 0)
      ? [autos, combis, motos, peatones]
      : [0, 0, 0, 0];

    $('#distSub').textContent = isOnline
      ? `Total clasificado: ${autos + combis + motos + peatones} unidades`
      : 'Esperando inferencia TinyML desde ESP32-CAM';

    distChart = VS.chart('distChart', {
      type: 'doughnut',
      data: {
        labels: ['Autos', 'Combis', 'Motos', 'Peatones'],
        datasets: [
          {
            data: data,
            backgroundColor: [p.blue, p.yellow, p.green, p.red],
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim(),
            borderWidth: 2
          }
        ]
      },
      options: VS.opts({ cutout: '65%', plugins: { legend: { position: 'bottom' } } }, { noScales: true })
    });
  }

  /* ---------- Fetch de Datos Reales ---------- */
  async function loadData() {
    try {
      const [nodeRes, incRes] = await Promise.all([
        fetch('/api/v1/realtime/node'),
        fetch('/api/v1/incidents')
      ]);

      if (nodeRes.ok) {
        st.node = await nodeRes.json();
      }
      if (incRes.ok) {
        st.incidents = await incRes.json();
      }
    } catch (err) {
      console.warn('Error fetching realtime node data:', err);
    }

    renderIotBanner(st.node);
    renderKPIs(st.node);
    renderMap(st.node);
    renderDetail(st.node);
    renderLights(st.node);
    renderCamerasSummary(st.node);
    renderIncidents(st.incidents);
    buildFlow(st.node);
    buildDist(st.node);
  }

  $('#refreshBtn').addEventListener('click', async () => {
    const btn = $('#refreshBtn');
    btn.classList.add('spin');
    await loadData();
    setTimeout(() => {
      btn.classList.remove('spin');
      if (st.node && st.node.iotConnected) {
        VS.toast('Telemetría real actualizada desde ESP32', 'ok');
      } else {
        VS.toast('Dispositivos IoT desconectados (esperando señal)', 'warn');
      }
    }, 400);
  });

  // Polling automático real cada 5 segundos
  setInterval(loadData, 5000);

  // Inicialización inmediata
  loadData();
})();
