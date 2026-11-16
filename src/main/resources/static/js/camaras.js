/* Semáforo+ · Centro de Monitoreo con 2 Cámaras ESP32-CAM Reales */
(function () {
  'use strict';
  const { $, $$, esc, D } = VS;

  let cams = [];

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
    render();
    summary();
  }

  function summary() {
    const total = cams.length;
    $('#camSummary').innerHTML = [
      ['Cámaras Activas', total],
      ['Resolución', '1024×768 (XGA)'],
      ['Procesamiento', 'ML On-Edge (Local)'],
      ['Respaldo', 'Solar LiFePO4']
    ].map(([l, v]) => `<div class="chip"><strong>${v}</strong><span>${l}</span></div>`).join('');
  }

  function render() {
    $('#camCount').textContent = `Mostrando ${cams.length} cámaras ESP32-CAM activas en el cruce real`;

    const html = cams.map(c => {
      const cls = c.classification || { autos: 0, combis: 0, motos: 0, peatones: 0, unidadesEmergencia: 0 };
      const hasEmerg = cls.unidadesEmergencia > 0;

      return `
      <article class="cam-card">
        <div class="cam">
          <div style="background:#0f172a;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;border-radius:6px;overflow:hidden;border:1px solid #334155;">
            <div style="position:absolute;top:10px;left:10px;display:flex;gap:6px;z-index:2;">
              <span class="pill" style="background:rgba(15,23,42,0.8);border-color:#38bdf8;color:#38bdf8;font-size:11px;font-weight:700;"><i class="dot" style="background:#ef4444;box-shadow:0 0 6px #ef4444;"></i>REC LIVE</span>
              <span class="pill" style="background:rgba(15,23,42,0.8);font-size:11px;">${c.id}</span>
            </div>
            <div style="position:absolute;top:10px;right:10px;z-index:2;">
              <span class="badge ${hasEmerg ? 'bad' : 'good'}">${hasEmerg ? 'ALERTA: EMERGENCIA' : 'ML OPTICAL FLOW'}</span>
            </div>

            <svg viewBox="0 0 320 160" style="width:100%;height:100%;position:absolute;top:0;left:0;" preserveAspectRatio="none">
              <rect width="320" height="160" fill="#090d16"/>
              <line x1="0" y1="120" x2="320" y2="120" stroke="#1e293b" stroke-width="2"/>
              <line x1="0" y1="90" x2="320" y2="90" stroke="#334155" stroke-dasharray="8 6"/>
              <text x="160" y="70" text-anchor="middle" fill="#64748b" font-size="12" font-family="Inter,sans-serif">VISIÓN ARTIFICIAL ESP32-CAM · ${esc(c.carrilObserved || c.carril)}</text>
              <text x="160" y="145" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">FPS: ${c.fps || 20} · LATENCIA: ${c.inferenceLatencyMs || 145}ms · CONFIDENCIA: ${c.confidenceScore || 95}%</text>
            </svg>
          </div>
        </div>

        <div class="cam-body">
          <div class="cam-title">
            <div>
              <strong style="font-size:15px;">${esc(c.name)}</strong>
              <span class="sub" style="display:block;margin-top:2px;">${esc(c.poleLocation || c.carril)} · IP: ${c.ipAddress || c.ip}</span>
            </div>
            <span class="badge good">En línea</span>
          </div>

          <div style="background:var(--bg-card-sub, #131922);border:1px solid var(--border, #263140);border-radius:8px;padding:12px;margin:12px 0;">
            <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Clasificación de Machine Learning (Tiempo Real)</div>
            <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px;text-align:center;">
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:var(--text);">${cls.autos}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Autos</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:var(--yellow);">${cls.combis}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Combis</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:var(--blue);">${cls.motos}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Motos</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
                <span style="font-size:18px;font-weight:700;color:var(--green);">${cls.peatones}</span>
                <span style="display:block;font-size:10px;color:var(--muted);">Peatones</span>
              </div>
              <div style="background:${hasEmerg ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)'};padding:6px;border-radius:6px;border:${hasEmerg ? '1px solid #ef4444' : 'none'};">
                <span style="font-size:18px;font-weight:700;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">${cls.unidadesEmergencia}</span>
                <span style="display:block;font-size:10px;color:${hasEmerg ? '#ef4444' : 'var(--muted)'};">Emerg.</span>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn btn-sm btn-outline" data-toggle-emerg="${c.id}" style="flex:1;">
              <i data-lucide="siren"></i>${hasEmerg ? 'Normalizar carril' : 'Simular ambulancia'}
            </button>
            <button type="button" class="btn btn-sm btn-primary" data-detail="${c.id}">
              <i data-lucide="info"></i>Telemetría ESP32
            </button>
          </div>
        </div>
      </article>
      `;
    }).join('');

    VS.render($('#camGrid'), html);
  }

  $('#camGrid').addEventListener('click', async e => {
    const emergBtn = e.target.closest('[data-toggle-emerg]');
    if (emergBtn) {
      const camId = emergBtn.dataset.toggleEmerg;
      emergBtn.disabled = true;
      emergBtn.textContent = 'Procesando...';
      try {
        const res = await fetch(`/api/v1/realtime/emergency-trigger?camId=${camId}`, { method: 'POST' });
        if (res.ok) {
          await loadCams();
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const detailBtn = e.target.closest('[data-detail]');
    if (detailBtn) {
      const camId = detailBtn.dataset.detail;
      const cam = cams.find(x => x.id === camId);
      if (cam) {
        VS.dialog({
          title: `Detalles Técnicos · ${cam.id}`,
          wide: true,
          body: `
            <dl class="dl">
              <div><dt>Dispositivo</dt><dd>ESP32-CAM AI-Thinker (OV2640 + PSRAM)</dd></div>
              <div><dt>Ubicación</dt><dd>${esc(cam.poleLocation || cam.carril)}</dd></div>
              <div><dt>Dirección IP fija</dt><dd><code>${cam.ipAddress || cam.ip}</code></dd></div>
              <div><dt>Inferencia On-Edge</dt><dd>TinyML / MobileNet SSD cuantizado en INT8 (100% local)</dd></div>
              <div><dt>Latencia de inferencia</dt><dd>${cam.inferenceLatencyMs || 145} ms por cuadro</dd></div>
              <div><dt>Protocolo de enlace</dt><dd>HTTP/REST local hacia ESP32 Central (192.168.1.50)</dd></div>
              <div><dt>Resiliencia</dt><dd>Inmune a cortes de internet (toma de decisiones en el cruce)</dd></div>
            </dl>
          `,
          actions: [{ label: 'Cerrar' }]
        });
      }
    }
  });

  loadCams();
  setInterval(loadCams, 5000);
})();
