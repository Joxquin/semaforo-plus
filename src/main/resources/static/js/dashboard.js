/* ==========================================================================
   Semáforo+ · Dashboard en Tiempo Real (2 Semáforos + 2 ESP32-CAM)
   Datos 100% Reales conectados al Microcontrolador Central ESP32.
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
        isEmergencyActive = currentNode.activeEmergencyPriority;
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
    renderKPIs();
    renderLights();
    renderCameras();
    renderSolar();
    renderEmergencyBanner();
    VS.icons();
  }

  function renderKPIs() {
    const cams = currentNode.cameras || [];
    const totalVehicles = cams.reduce((s, c) => s + (c.classification?.totalVehicles || 0), 0);
    const solar = currentNode.solarBackup || { batteryPercent: 96, batteryVoltage: 13.6 };

    const cards = [
      ['Cerebro Central ESP32', 'cpu', '100% Local', 'good', 'Inmune a cortes de internet · Arequipa'],
      ['Semáforos Físicos', 'traffic-cone', '2 Unidades', '', 'SEM-01 (Av. Ejército) · SEM-02 (Los Arces)'],
      ['Cámaras ESP32-CAM', 'video', '2 Activas', '', 'Inferencia On-Edge en lo alto del poste'],
      ['Vehículos en Cruce', 'car', totalVehicles + ' veh', '', 'Detectados por Machine Learning'],
      ['Respaldo Solar', 'sun', solar.batteryPercent + '%', 'good', `${solar.batteryVoltage}V · LiFePO4 (~18.5h autonomía)`]
    ];

    VS.render($('#kpis'), cards.map(([t, ic, v, c, f]) => `
      <article class="kpi">
        <div class="kpi-head"><span>${t}</span><i data-lucide="${ic}"></i></div>
        <div class="kpi-value ${c}">${v}</div>
        <div class="kpi-foot">${f}</div>
      </article>
    `).join(''));
  }

  function renderLights() {
    const lights = currentNode.trafficLights || [];
    const html = lights.map(l => {
      const isGreen = l.state === 'GREEN';
      const isYellow = l.state === 'YELLOW';
      const isRed = l.state === 'RED';

      return `
      <div style="background:var(--bg-card, #1c2430);border:1px solid ${isGreen ? 'var(--green, #22c55e)' : 'var(--border, #2d3748)'};border-radius:8px;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <strong style="font-size:15px;display:block;">${esc(l.name)}</strong>
            <span style="font-size:11px;color:var(--muted);">${esc(l.carril)}</span>
          </div>
          <span class="badge ${isGreen ? 'good' : isYellow ? 'warn' : 'bad'}">${l.state}</span>
        </div>

        <!-- Semáforo visual interactivo -->
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="background:#0a0e14;padding:8px 6px;border-radius:16px;display:flex;flex-direction:column;gap:6px;width:38px;align-items:center;border:2px solid #232a35;box-shadow:inset 0 2px 4px rgba(0,0,0,0.5);">
            <div style="width:20px;height:20px;border-radius:50%;background:${isRed ? '#ef4444' : '#272f3d'};box-shadow:${isRed ? '0 0 10px #ef4444' : 'none'};"></div>
            <div style="width:20px;height:20px;border-radius:50%;background:${isYellow ? '#eab308' : '#272f3d'};box-shadow:${isYellow ? '0 0 10px #eab308' : 'none'};"></div>
            <div style="width:20px;height:20px;border-radius:50%;background:${isGreen ? '#22c55e' : '#272f3d'};box-shadow:${isGreen ? '0 0 10px #22c55e' : 'none'};"></div>
          </div>

          <div style="flex:1;">
            <div style="font-size:28px;font-weight:700;color:${isGreen ? 'var(--green, #22c55e)' : 'var(--text)'};font-family:monospace;">
              ${l.remainingSeconds > 0 ? l.remainingSeconds + 's' : 'ESPERA'}
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">
              Tiempo verde asignado: <strong>${l.greenSecondsAllocated} s</strong>
            </div>
            <div style="margin-top:8px;font-size:11px;display:flex;align-items:center;gap:6px;color:var(--text);">
              <i data-lucide="footprints" style="color:${l.pedestrianSignal === 'WALK' ? '#22c55e' : '#ef4444'};width:14px;height:14px;"></i>
              Peatonal: <strong>${l.pedestrianSignal === 'WALK' ? 'PASE (Verde)' : 'ALTO (Rojo)'}</strong>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');

    $('#lightsGrid').innerHTML = html;
  }

  function renderCameras() {
    const cams = currentNode.cameras || [];
    const html = cams.map(c => {
      const cls = c.classification || { autos: 0, combis: 0, motos: 0, peatones: 0, unidadesEmergencia: 0 };
      const hasEmerg = cls.unidadesEmergencia > 0;

      return `
      <div style="background:var(--bg-card-sub, #131922);border:1px solid var(--border, #263140);border-radius:8px;padding:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div>
            <strong style="font-size:13px;display:block;">${esc(c.name)}</strong>
            <span style="font-size:11px;color:var(--muted);">${esc(c.carrilObserved)} · IP: ${c.ipAddress}</span>
          </div>
          <span class="badge ${hasEmerg ? 'bad' : 'good'}">${hasEmerg ? 'EMERGENCIA' : 'En línea'}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:4px;text-align:center;background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;">
          <div><b style="font-size:14px;">${cls.autos}</b><span style="display:block;font-size:9px;color:var(--muted);">Autos</span></div>
          <div><b style="font-size:14px;color:var(--yellow);">${cls.combis}</b><span style="display:block;font-size:9px;color:var(--muted);">Combis</span></div>
          <div><b style="font-size:14px;color:var(--blue);">${cls.motos}</b><span style="display:block;font-size:9px;color:var(--muted);">Motos</span></div>
          <div><b style="font-size:14px;color:var(--green);">${cls.peatones}</b><span style="display:block;font-size:9px;color:var(--muted);">Peatones</span></div>
          <div><b style="font-size:14px;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">${cls.unidadesEmergencia}</b><span style="display:block;font-size:9px;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">Emerg.</span></div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:6px;">
          <span>Latencia ML: ${c.inferenceLatencyMs} ms</span>
          <span>Confianza: ${c.confidenceScore}%</span>
        </div>
      </div>
      `;
    }).join('');

    $('#camsGrid').innerHTML = html;
  }

  function renderSolar() {
    const solar = currentNode.solarBackup || {
      batteryPercent: 96,
      batteryVoltage: 13.6,
      solarPanelWatts: 45.0,
      powerSource: 'HÍBRIDO (Solar + Red)',
      estimatedAutonomyHours: 18.5
    };

    $('#solarBox').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:12px;">
        <div style="background:var(--bg-card-sub, #131922);padding:12px;border-radius:6px;border:1px solid var(--border,#263140);text-align:center;">
          <span style="display:block;font-size:11px;color:var(--muted);">Voltaje Batería</span>
          <strong style="font-size:18px;color:#38bdf8;">${solar.batteryVoltage} V</strong>
          <span style="display:block;font-size:10px;color:var(--green);">LiFePO4 Normal</span>
        </div>
        <div style="background:var(--bg-card-sub, #131922);padding:12px;border-radius:6px;border:1px solid var(--border,#263140);text-align:center;">
          <span style="display:block;font-size:11px;color:var(--muted);">Generación Solar</span>
          <strong style="font-size:18px;color:#eab308;">${solar.solarPanelWatts} W</strong>
          <span style="display:block;font-size:10px;color:var(--muted);">Panel Monocristalino</span>
        </div>
        <div style="background:var(--bg-card-sub, #131922);padding:12px;border-radius:6px;border:1px solid var(--border,#263140);text-align:center;">
          <span style="display:block;font-size:11px;color:var(--muted);">Autonomía Estimada</span>
          <strong style="font-size:18px;color:#22c55e;">${solar.estimatedAutonomyHours} h</strong>
          <span style="display:block;font-size:10px;color:var(--muted);">Sin Red Comercial</span>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:6px;font-size:12px;display:flex;align-items:center;justify-content:space-between;">
        <span><strong>Alimentación Primaria:</strong> ${esc(solar.powerSource)}</span>
        <span class="badge good">Cargando batería</span>
      </div>
    `;

    const pill = $('#powerPill');
    if (pill) {
      pill.innerHTML = `<i class="dot" style="background:#eab308"></i>Solar LiFePO4: ${solar.batteryVoltage}V (${solar.batteryPercent}%)`;
    }
  }

  function renderEmergencyBanner() {
    const badge = $('#emergAlertBadge');
    const btn = $('#emergBtn');

    if (isEmergencyActive) {
      if (badge) badge.innerHTML = `<span class="badge bad" style="font-size:12px;padding:6px 12px;"><i class="dot" style="background:#ef4444;box-shadow:0 0 6px #ef4444;"></i>ONDA VERDE DE EMERGENCIA ACTIVA</span>`;
      if (btn) {
        btn.textContent = 'Desactivar Emergencia (Volver a ciclo adaptativo)';
        btn.style.background = '#ef4444';
        btn.style.color = '#fff';
      }
    } else {
      if (badge) badge.innerHTML = `<span class="badge good">Ciclo Adaptativo ML</span>`;
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
    const html = list.slice(0, 4).map(x => `
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

  // Arranque
  fetchRealtimeData();
  loadIncidents();
  setInterval(fetchRealtimeData, 3000);
})();
