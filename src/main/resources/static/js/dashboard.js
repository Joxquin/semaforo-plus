/* ==========================================================================
   Semáforo+ · Dashboard en Tiempo Real (2 Semáforos + 2 ESP32-CAM)
   Datos 100% Reales conectados al Microcontrolador Central ESP32.
   Si los IoTs no están conectados, muestra estado Sin Señal sin inventar datos falsos.
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, D } = VS;

  let currentNode = null;
  let isEmergencyActive = false;

  async function fetchRealtimeData() {
    try {
      const res = await fetch('/api/v1/realtime/node');
      if (res.ok) {
        currentNode = await res.json();
        isEmergencyActive = !!currentNode.activeEmergencyPriority;
        renderAll();
      }
    } catch (e) {
      console.warn('Error sincronizando con nodo central ESP32:', e);
    }
  }

  async function loadIncidents() {
    try {
      const res = await fetch('/api/v1/incidents');
      if (res.ok) {
        const list = await res.json();
        renderIncidents(list);
      }
    } catch (e) {
      console.warn('Error cargando incidencias:', e);
    }
  }

  function renderAll() {
    if (!currentNode) return;
    const isOnline = !!currentNode.iotConnected;

    // Control de banner IoT
    const banner = $('#iotStatusBanner');
    if (banner) {
      banner.style.display = isOnline ? 'none' : 'block';
    }

    // Top status pill
    const esp32Pill = $('#esp32StatusPill');
    if (esp32Pill) {
      if (isOnline) {
        esp32Pill.style.background = 'rgba(34,197,94,0.15)';
        esp32Pill.style.borderColor = '#22c55e';
        esp32Pill.style.color = '#22c55e';
        esp32Pill.innerHTML = '<i class="dot" style="background:#22c55e"></i>ESP32: 100% LOCAL (INMUNE A INTERNET)';
      } else {
        esp32Pill.style.background = 'rgba(239,68,68,0.15)';
        esp32Pill.style.borderColor = '#ef4444';
        esp32Pill.style.color = '#ef4444';
        esp32Pill.innerHTML = '<i class="dot" style="background:#ef4444"></i>ESP32: DESCONECTADO (SIN SEÑAL)';
      }
    }

    renderKPIs(isOnline);
    renderLights(isOnline);
    renderCameras(isOnline);
    renderSolar(isOnline);
    renderEmergencyBanner(isOnline);
    VS.icons();
  }

  function renderKPIs(isOnline) {
    const cams = currentNode.cameras || [];
    const totalVehicles = cams.reduce((s, c) => s + (c.classification?.totalVehicles || 0), 0);
    const solar = currentNode.solarBackup || { batteryPercent: 0, batteryVoltage: 0.0 };
    const onlineCams = cams.filter(c => c.isOnline).length;

    const cards = isOnline ? [
      ['Cerebro Central ESP32', 'cpu', '100% Local', 'good', 'Inmune a cortes de internet · Arequipa'],
      ['Semáforos Físicos', 'traffic-cone', '2 Unidades', '', 'SEM-01 (Av. Ejército) · SEM-02 (Los Arces)'],
      ['Cámaras ESP32-CAM', 'video', `${onlineCams} Activas`, 'good', 'Inferencia On-Edge en lo alto del poste'],
      ['Vehículos en Cruce', 'car', `${totalVehicles} veh`, '', 'Detectados por Machine Learning'],
      ['Respaldo Solar', 'sun', `${solar.batteryPercent}%`, 'good', `${solar.batteryVoltage}V · LiFePO4 (~18.5h autonomía)`]
    ] : [
      ['Cerebro Central ESP32', 'cpu', 'Desconectado', 'bad', 'Sin enlace de hardware local'],
      ['Semáforos Físicos', 'traffic-cone', '2 Unidades', '', 'SEM-01 (Av. Ejército) · SEM-02 (Los Arces)'],
      ['Cámaras ESP32-CAM', 'video', '0/2 Sin señal', 'bad', 'Esperando conexión IoT...'],
      ['Vehículos en Cruce', 'car', '0 veh', 'muted', 'Sin datos simulados (en espera)'],
      ['Respaldo Solar', 'sun', '0%', 'warn', '0.0V · Sin telemetría de hardware']
    ];

    VS.render($('#kpis'), cards.map(([t, ic, v, c, f]) => `
      <article class="kpi">
        <div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div>
        <div class="kpi-value ${c}">${v}</div>
        <div class="kpi-foot">${f}</div>
      </article>
    `).join(''));
  }

  function renderLights(isOnline) {
    const lights = currentNode.trafficLights || [];
    const html = lights.map(l => {
      const isGreen = isOnline && l.state === 'GREEN';
      const isYellow = isOnline && l.state === 'YELLOW';
      const isRed = isOnline && l.state === 'RED';

      const countdownText = isOnline
        ? (l.remainingSeconds > 0 ? `${l.remainingSeconds}s` : 'ESPERA')
        : 'SIN SEÑAL';

      const stateBadge = isOnline
        ? `<span class="badge ${isGreen ? 'good' : isYellow ? 'warn' : 'bad'}">${l.state}</span>`
        : `<span class="badge bad">DESCONECTADO</span>`;

      const allocatedText = isOnline
        ? `Tiempo verde asignado: <strong>${l.greenSecondsAllocated} s</strong>`
        : `Tiempo verde asignado: <strong>—</strong>`;

      const pedColor = !isOnline ? '#9ca3af' : (l.pedestrianSignal === 'WALK' ? '#22c55e' : '#ef4444');
      const pedText = !isOnline ? 'Desconectado' : (l.pedestrianSignal === 'WALK' ? 'PASE (Verde)' : 'ALTO (Rojo)');

      return `
      <div style="background:var(--bg-card, #1c2430);border:1px solid ${isGreen ? 'var(--green, #22c55e)' : 'var(--border, #2d3748)'};border-radius:8px;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <strong style="font-size:15px;display:block;">${esc(l.name)}</strong>
            <span style="font-size:11px;color:var(--muted);">${esc(l.carril)}</span>
          </div>
          ${stateBadge}
        </div>

        <!-- Semáforo visual interactivo -->
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="background:#0a0e14;padding:8px 6px;border-radius:16px;display:flex;flex-direction:column;gap:6px;width:38px;align-items:center;border:2px solid #232a35;box-shadow:inset 0 2px 4px rgba(0,0,0,0.5);">
            <div style="width:20px;height:20px;border-radius:50%;background:${isRed ? '#ef4444' : '#1a222d'};box-shadow:${isRed ? '0 0 10px #ef4444' : 'none'};"></div>
            <div style="width:20px;height:20px;border-radius:50%;background:${isYellow ? '#eab308' : '#1a222d'};box-shadow:${isYellow ? '0 0 10px #eab308' : 'none'};"></div>
            <div style="width:20px;height:20px;border-radius:50%;background:${isGreen ? '#22c55e' : '#1a222d'};box-shadow:${isGreen ? '0 0 10px #22c55e' : 'none'};"></div>
          </div>

          <div style="flex:1;">
            <div style="font-size:26px;font-weight:700;color:${isGreen ? 'var(--green, #22c55e)' : isOnline ? 'var(--text)' : 'var(--muted)'};font-family:monospace;">
              ${countdownText}
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">
              ${allocatedText}
            </div>
            <div style="margin-top:8px;font-size:11px;display:flex;align-items:center;gap:6px;color:var(--text);">
              <i data-lucide="footprints" style="color:${pedColor};"></i>
              <span>Peatonal: <strong style="color:${pedColor};">${pedText}</strong></span>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');

    $('#lightsGrid').innerHTML = html;
  }

  function renderCameras(isOnline) {
    const cams = currentNode.cameras || [];
    const html = cams.map(c => {
      const cls = c.classification || { autos: 0, combis: 0, motos: 0, peatones: 0, unidadesEmergencia: 0, totalVehicles: 0 };
      const hasEmerg = isOnline && c.isOnline && cls.unidadesEmergencia > 0;
      const camOnline = isOnline && c.isOnline;

      return `
      <div style="background:var(--bg-card,#1c2430);border:1px solid ${hasEmerg ? '#ef4444' : camOnline ? 'var(--border,#2d3748)' : 'rgba(239,68,68,0.3)'};border-radius:8px;padding:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div>
            <strong style="font-size:14px;display:block;">${esc(c.name)}</strong>
            <span style="font-size:11px;color:var(--muted);">${esc(c.carrilObserved)} · IP: ${esc(c.ipAddress)}</span>
          </div>
          <span class="badge ${camOnline ? 'good' : 'bad'}">${camOnline ? 'En línea' : 'Sin señal'}</span>
        </div>

        <!-- Conteo de detección On-Edge -->
        <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px;background:var(--bg-card-sub,#131922);padding:8px;border-radius:6px;text-align:center;">
          <div><strong style="font-size:16px;color:var(--text);">${camOnline ? cls.autos : 0}</strong><span style="display:block;font-size:9px;color:var(--muted);">Autos</span></div>
          <div><strong style="font-size:16px;color:#38bdf8;">${camOnline ? cls.combis : 0}</strong><span style="display:block;font-size:9px;color:var(--muted);">Combis</span></div>
          <div><strong style="font-size:16px;color:#eab308;">${camOnline ? cls.motos : 0}</strong><span style="display:block;font-size:9px;color:var(--muted);">Motos</span></div>
          <div><strong style="font-size:16px;color:#22c55e;">${camOnline ? cls.peatones : 0}</strong><span style="display:block;font-size:9px;color:var(--muted);">Peatones</span></div>
          <div><strong style="font-size:16px;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">${camOnline ? cls.unidadesEmergencia : 0}</strong><span style="display:block;font-size:9px;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">Emerg.</span></div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:6px;">
          <span>Latencia ML: ${camOnline ? c.inferenceLatencyMs + ' ms' : '—'}</span>
          <span>Confianza: ${camOnline ? c.confidenceScore + '%' : '—'}</span>
        </div>
      </div>
      `;
    }).join('');

    $('#camsGrid').innerHTML = html;
  }

  function renderSolar(isOnline) {
    const solar = currentNode.solarBackup || {
      batteryPercent: 0,
      batteryVoltage: 0.0,
      solarPanelWatts: 0.0,
      powerSource: 'Sin enlace de hardware',
      estimatedAutonomyHours: 0.0
    };

    const voltageTxt = isOnline ? `${solar.batteryVoltage} V` : '0.0 V';
    const wattsTxt = isOnline ? `${solar.solarPanelWatts} W` : '0.0 W';
    const hoursTxt = isOnline ? `${solar.estimatedAutonomyHours} h` : '0.0 h';
    const powerSrc = isOnline ? esc(solar.powerSource) : 'Sin telemetría de hardware';
    const chargeBadge = isOnline ? '<span class="badge good">Cargando batería</span>' : '<span class="badge bad">Sin señal</span>';

    $('#solarBox').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:12px;">
        <div style="background:var(--bg-card-sub, #131922);padding:12px;border-radius:6px;border:1px solid var(--border,#263140);text-align:center;">
          <span style="display:block;font-size:11px;color:var(--muted);">Voltaje Batería</span>
          <strong style="font-size:18px;color:${isOnline ? '#38bdf8' : 'var(--muted)'};">${voltageTxt}</strong>
          <span style="display:block;font-size:10px;color:${isOnline ? 'var(--green)' : 'var(--muted)'};">${isOnline ? 'LiFePO4 Normal' : 'Sin señal'}</span>
        </div>
        <div style="background:var(--bg-card-sub, #131922);padding:12px;border-radius:6px;border:1px solid var(--border,#263140);text-align:center;">
          <span style="display:block;font-size:11px;color:var(--muted);">Generación Solar</span>
          <strong style="font-size:18px;color:${isOnline ? '#eab308' : 'var(--muted)'};">${wattsTxt}</strong>
          <span style="display:block;font-size:10px;color:var(--muted);">Panel Monocristalino</span>
        </div>
        <div style="background:var(--bg-card-sub, #131922);padding:12px;border-radius:6px;border:1px solid var(--border,#263140);text-align:center;">
          <span style="display:block;font-size:11px;color:var(--muted);">Autonomía Estimada</span>
          <strong style="font-size:18px;color:${isOnline ? '#22c55e' : 'var(--muted)'};">${hoursTxt}</strong>
          <span style="display:block;font-size:10px;color:var(--muted);">Sin Red Comercial</span>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:6px;font-size:12px;display:flex;align-items:center;justify-content:space-between;">
        <span><strong>Alimentación Primaria:</strong> ${powerSrc}</span>
        ${chargeBadge}
      </div>
    `;

    const pill = $('#powerPill');
    if (pill) {
      if (isOnline) {
        pill.innerHTML = `<i class="dot" style="background:#eab308"></i>Solar LiFePO4: ${solar.batteryVoltage}V (${solar.batteryPercent}%)`;
      } else {
        pill.innerHTML = `<i class="dot" style="background:#9ca3af"></i>Solar: Sin telemetría`;
      }
    }
  }

  function renderEmergencyBanner(isOnline) {
    const badge = $('#emergAlertBadge');
    const btn = $('#emergBtn');

    if (isOnline && isEmergencyActive) {
      if (badge) badge.innerHTML = `<span class="badge bad" style="font-size:12px;padding:6px 12px;"><i class="dot" style="background:#ef4444;box-shadow:0 0 6px #ef4444;"></i>ONDA VERDE DE EMERGENCIA ACTIVA</span>`;
      if (btn) {
        btn.textContent = 'Desactivar Emergencia (Volver a ciclo adaptativo)';
        btn.style.background = '#ef4444';
        btn.style.color = '#fff';
      }
    } else {
      if (badge) badge.innerHTML = isOnline ? `<span class="badge good">Ciclo Adaptativo ML</span>` : `<span class="badge bad">En espera de conexión</span>`;
      if (btn) {
        btn.innerHTML = `<i data-lucide="siren"></i>Simular Ambulancia en Av. Ejército`;
        btn.style.background = 'transparent';
        btn.style.color = '#ef4444';
      }
    }
  }

  function renderIncidents(list) {
    if (!list || !list.length) {
      $('#incList').innerHTML = '<li class="empty">No hay eventos registrados.</li>';
      return;
    }
    const html = list.slice(0, 5).map(x => `
      <li>
        <div class="li-main">
          <div>
            <strong>${esc(x.title)}</strong>
            <span class="sub">${esc(x.description || '')}</span>
          </div>
        </div>
        <span class="badge ${x.severity === 'Alta' || x.severity === 'Crítica' ? 'bad' : 'good'}">${esc(x.status)}</span>
      </li>
    `).join('');
    $('#incList').innerHTML = html;
  }

  // Event Listeners
  $('#emergBtn')?.addEventListener('click', async () => {
    try {
      if (isEmergencyActive) {
        await fetch('/api/v1/realtime/emergency-reset', { method: 'POST' });
      } else {
        await fetch('/api/v1/realtime/emergency-trigger?camId=CAM-01', { method: 'POST' });
      }
      await fetchRealtimeData();
      await loadIncidents();
    } catch (e) {
      console.error(e);
    }
  });

  $('#refreshBtn')?.addEventListener('click', async () => {
    await fetchRealtimeData();
    await loadIncidents();
  });

  $('#simTeleBtn')?.addEventListener('click', async () => {
    try {
      await fetch('/api/v1/iot/simulate-telemetry', { method: 'POST' });
      await fetchRealtimeData();
      await loadIncidents();
    } catch (e) {
      console.error(e);
    }
  });

  // Arranque
  fetchRealtimeData();
  loadIncidents();
  setInterval(fetchRealtimeData, 3000);
})();
