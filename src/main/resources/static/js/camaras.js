/* Semáforo+ · Centro de Monitoreo con 2 Cámaras ESP32-CAM Reales
   Si las cámaras no están conectadas por HTTP/IoT, se muestra estado desconectado y 0 vehículos. */
(function () {
  'use strict';
  const { $, $$, esc, D } = VS;

  let cams = [];
  let isAnyOnline = false;

  async function loadCams() {
    try {
      const res = await fetch('/api/v1/realtime/cameras');
      if (res.ok) {
        cams = await res.json();
      } else {
        cams = D.cameras;
      }
    } catch (e) {
      cams = D.cameras;
    }

    isAnyOnline = cams.some(c => c.isOnline || c.status === 'TRANSMITIENDO_ML');

    renderBanner();
    renderSummary();
    renderGrid();
  }

  function renderBanner() {
    const banner = $('#camIotBanner');
    const txt = $('#camIotText');
    if (!banner || !txt) return;

    if (!isAnyOnline) {
      banner.className = 'alert warn';
      banner.style.display = 'block';
      txt.innerHTML = '<strong>Dispositivos IoT no detectados:</strong> Ninguna de las 2 cámaras ESP32-CAM está transmitiendo telemetría. Mostrando estado sin señal (sin datos simulados). Carga el firmware de <code>firmware/esp32_cam_norte/</code> y <code>firmware/esp32_cam_este/</code> en tus módulos ESP32-CAM para activar la inferencia en tiempo real.';
    } else {
      banner.className = 'alert ok';
      banner.style.display = 'block';
      txt.innerHTML = '<strong>Cámaras ESP32-CAM Conectadas:</strong> Inferencia On-Edge ejecutándose en microcontrolador local.';
    }
  }

  function renderSummary() {
    const total = cams.length;
    const onlineCount = cams.filter(c => c.isOnline || c.status === 'TRANSMITIENDO_ML').length;

    $('#camSummary').innerHTML = [
      ['Hardware Conectado', `${onlineCount}/${total} Cámaras`],
      ['Resolución', '1024×768 (XGA)'],
      ['Modelo Inferencia', 'TinyML MobileNet On-Edge'],
      ['Microcontrolador', 'ESP32-CAM AI-Thinker']
    ].map(([l, v]) => `<div class="chip"><strong>${v}</strong><span>${l}</span></div>`).join('');
  }

  function renderGrid() {
    const total = cams.length;
    const onlineCount = cams.filter(c => c.isOnline || c.status === 'TRANSMITIENDO_ML').length;
    $('#camCount').textContent = `${total} cámaras asignadas al cruce real (${onlineCount} conectadas, ${total - onlineCount} sin señal)`;

    const html = cams.map(c => {
      const online = c.isOnline || c.status === 'TRANSMITIENDO_ML';
      const cls = c.classification || { autos: 0, combis: 0, motos: 0, peatones: 0, unidadesEmergencia: 0 };
      const hasEmerg = cls.unidadesEmergencia > 0;

      return `
      <article class="cam-card">
        <div class="cam">
          <div style="background:#0f172a;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;border-radius:6px;overflow:hidden;border:1px solid #334155;">
            <div style="position:absolute;top:10px;left:10px;display:flex;gap:6px;z-index:2;">
              <span class="pill" style="background:rgba(15,23,42,0.85);border-color:${online ? '#38bdf8' : '#64748b'};color:${online ? '#38bdf8' : '#94a3b8'};font-size:11px;font-weight:700;">
                <i class="dot" style="background:${online ? '#ef4444' : '#64748b'};box-shadow:${online ? '0 0 6px #ef4444' : 'none'};"></i>${online ? 'REC LIVE' : 'SIN SEÑAL'}
              </span>
              <span class="pill" style="background:rgba(15,23,42,0.85);font-size:11px;">${esc(c.id)}</span>
            </div>
            <div style="position:absolute;top:10px;right:10px;z-index:2;">
              <span class="badge ${online ? (hasEmerg ? 'bad' : 'ok') : 'bad'}">${online ? (hasEmerg ? 'EMERGENCIA' : 'ML OPTICAL FLOW') : 'DESCONECTADA'}</span>
            </div>

            <svg viewBox="0 0 320 160" style="width:100%;height:100%;position:absolute;top:0;left:0;" preserveAspectRatio="none">
              <rect width="320" height="160" fill="#090d16"/>
              <line x1="0" y1="120" x2="320" y2="120" stroke="#1e293b" stroke-width="2"/>
              <line x1="0" y1="90" x2="320" y2="90" stroke="#334155" stroke-dasharray="8 6"/>
              <text x="160" y="70" text-anchor="middle" fill="${online ? '#94a3b8' : '#475569'}" font-size="12" font-family="Inter,sans-serif">${esc(c.poleLocation || c.carrilObserved || c.carril)}</text>
              <text x="160" y="100" text-anchor="middle" fill="${online ? '#38bdf8' : '#64748b'}" font-size="11" font-family="monospace">
                ${online ? `FPS: ${c.fps} · LATENCIA: ${c.inferenceLatencyMs}ms · CONFIDENCIA: ${c.confidenceScore}%` : 'DISPOSITIVO IOT NO CONECTADO'}
              </text>
            </svg>
          </div>
        </div>

        <div class="cam-body">
          <div class="cam-title">
            <div>
              <strong style="font-size:15px;">${esc(c.name)}</strong>
              <span class="sub" style="display:block;margin-top:2px;">${esc(c.poleLocation || c.carrilObserved)} · IP: ${esc(c.ipAddress || c.ip)}</span>
            </div>
            <span class="badge ${online ? 'ok' : 'bad'}"><i class="dot"></i>${online ? 'En línea' : 'Desconectada'}</span>
          </div>

          <div style="background:var(--bg-card-sub, #131922);border:1px solid var(--border, #263140);border-radius:8px;padding:12px;margin:12px 0;">
            <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
              ${online ? 'Detección TinyML en Tiempo Real' : 'Conteo Vehicular (Sin datos reales)'}
            </div>
            <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px;text-align:center;">
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:${online ? 'var(--text)' : 'var(--muted)'};">${online ? cls.autos : '—'}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Autos</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:${online ? 'var(--yellow)' : 'var(--muted)'};">${online ? cls.combis : '—'}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Combis</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:${online ? 'var(--blue)' : 'var(--muted)'};">${online ? cls.motos : '—'}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Motos</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:${online ? 'var(--green)' : 'var(--muted)'};">${online ? cls.peatones : '—'}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Peatones</span>
              </div>
              <div style="background:${hasEmerg ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)'};padding:6px;border-radius:6px;border:${hasEmerg ? '1px solid #ef4444' : 'none'};">
                <span style="font-size:18px;font-weight:700;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">${online ? cls.unidadesEmergencia : '—'}</span>
                <span style="display:block;font-size:10px;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">Emerg.</span>
              </div>
            </div>
          </div>

          <div style="font-size:12px;color:var(--muted);">
            ${online ? `Última inferencia recibida correctamente vía HTTP POST` : `Esperando conexión de firmware: <code>firmware/${c.id === 'CAM-02' ? 'esp32_cam_este' : 'esp32_cam_norte'}/</code>`}
          </div>
        </div>
      </article>
      `;
    }).join('');

    $('#camGrid').innerHTML = html;
    VS.icons();
  }

  // Polling regular
  setInterval(loadCams, 5000);
  loadCams();
})();
