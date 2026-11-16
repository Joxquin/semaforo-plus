/* ==========================================================================
   Semáforo+ · Capa de Datos y Servicio Adaptativo (Arquitectura Hexagonal)
   Red Metropolitana de Arequipa (8 Intersecciones · 8 Cámaras)
   Nodo Piloto Físico: INT-01 (Av. Ejército × Av. Salaverry / Los Arces)
   con Microcontrolador Central ESP32 y 2 Módulos ESP32-CAM (On-Edge ML).
   ========================================================================== */
window.VS_DATA = (function () {
  'use strict';

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

  const loginBrand = 'Semáforo+';
  const demoUser = { user: 'operador', pass: 'via2026' };

  const zones = ['Yanahuara'];

  /* ---------- Única Intersección Piloto Físico (2 Semáforos y 2 Cámaras ESP32-CAM) ----------
     INT-01 es el nodo físico equipado con retrofit ESP32 y 2x ESP32-CAM en Av. Ejército × Calle Los Arces */
  const intersections = [
    { id: 'INT-01', name: 'Av. Ejército × Calle Los Arces', zone: 'Yanahuara', roads: ['Av. Ejército', 'Calle Los Arces'], cong: 0, mode: 'ESP32 Adaptativo (Local 100%)', status: 'Sin señal', x: 400, y: 220, plan: { ns: 38, eo: 30 }, split: [.55, .45, 0, 0], trend: [0, 0, 0], iotConnected: false }
  ];
  intersections.forEach((i, k) => { i.n = k + 1; });

  /* Tramos viales (nodo único autónomo) */
  const edges = [];

  /* ---------- Reglas de coherencia ---------- */
  function level(c) {
    if (c === 0 && intersections[0] && !intersections[0].iotConnected) {
      return { key: 'sin_senal', label: 'Sin señal', cls: 'bad', color: 'var(--red)' };
    }
    return c >= 70 ? { key: 'alto', label: 'Alto', cls: 'bad', color: 'var(--red)' }
      : c >= 40 ? { key: 'moderado', label: 'Moderado', cls: 'warn', color: 'var(--yellow)' }
        : { key: 'fluido', label: 'Fluido', cls: 'ok', color: 'var(--green)' };
  }

  function metrics(i, cong) {
    if (i.id === 'INT-01' && (!i.iotConnected || i.status === 'Sin señal' || i.status === 'Sin datos')) {
      return { veh: 0, wait: 0 };
    }
    return { veh: Math.round(cong * 1.2), wait: Math.round(15 + cong * 0.4) };
  }

  const DIRS = ['N', 'S', 'E', 'O'];
  function derive(i) {
    const m = metrics(i, i.cong);
    i.veh = m.veh;
    i.wait = m.wait;
    i.approach = DIRS.map((d, k) => ({
      dir: d,
      veh: Math.round(i.veh * (i.split[k] || 0)),
      wait: Math.round(i.wait * (.5 + (i.split[k] || 0) * 1.5))
    }));
    return i;
  }

  /* ---------- Cámaras (Únicamente las 2 ESP32-CAM del Nodo Físico) ---------- */
  const cameras = [
    { id: 'CAM-01', int: 'INT-01', name: 'ESP32-CAM 01 · Poste Norte (Av. Ejército)', status: 'Sin señal', carril: 'Av. Ejército (N–S)', ip: '192.168.1.51' },
    { id: 'CAM-02', int: 'INT-01', name: 'ESP32-CAM 02 · Poste Este (Calle Los Arces)', status: 'Sin señal', carril: 'Calle Los Arces (E–O)', ip: '192.168.1.52' }
  ];

  /* ---------- Incidencias del Nodo Único ---------- */
  const incidentTypes = ['Dispositivos IoT Desconectados', 'Vehículo de emergencia detectado', 'Respaldo solar en flotación', 'Cámara sin señal', 'Prioridad de transporte público'];
  const incidents = [
    { id: 'INC-1001', type: 'Dispositivos IoT Desconectados', int: 'INT-01', prio: 'Alta', status: 'Nueva', ago: 2, source: 'ESP32 Autodiagnóstico', desc: 'No se detecta enlace activo con el microcontrolador central ESP32 ni con las cámaras ESP32-CAM. Mostrando estado sin señal.' },
    { id: 'INC-1002', type: 'Respaldo solar en flotación', int: 'INT-01', prio: 'Baja', status: 'Resuelta', ago: 30, source: 'Controlador MPPT', desc: 'Sistema preparado para autonomía híbrida (Solar LiFePO4 + Red) en Av. Ejército.' }
  ];

  /* ---------- Series históricas de la red (vehículos/h y % de congestión por hora) ---------- */
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00');
  const flowBase = [1900, 1300, 950, 820, 1150, 2700, 6500, 10800, 12600, 9400, 8200, 8700, 9800, 10200, 9000, 8800, 9900, 12200, 13400, 11000, 7600, 5400, 3600, 2400];
  const congBase = [18, 14, 10, 9, 12, 28, 52, 71, 78, 62, 52, 55, 60, 63, 56, 54, 62, 76, 82, 70, 50, 38, 28, 22];

  const periods = {
    hoy: { label: 'Hoy', days: 1, k: 1, ck: 1, wk: 1, prev: { label: 'Ayer', k: .94, ck: .96, wk: .95 } },
    ayer: { label: 'Ayer', days: 1, k: .94, ck: .96, wk: .95, prev: { label: 'Anteayer', k: .91, ck: .93, wk: .97 } },
    '7d': { label: 'Últimos 7 días', days: 7, k: .97, ck: .98, wk: .98, prev: { label: '7 días anteriores', k: .93, ck: .95, wk: 1.03 } },
    '30d': { label: 'Últimos 30 días', days: 30, k: .92, ck: .94, wk: .93, prev: { label: '30 días anteriores', k: .9, ck: .92, wk: .96 } }
  };

  function flow(list, all, k, seed) {
    const share = sum(list, i => i.veh) / Math.max(1, sum(all, i => i.veh));
    const s = hash(seed);
    return flowBase.map((v, h) => Math.round(v * share * k * (1 + (rnd(s + h) - .5) * .08)));
  }

  function cong(list, all, ck, seed) {
    const avg = a => sum(a, i => i.cong) / Math.max(1, a.length);
    const d = avg(list) - avg(all), s = hash(seed);
    return congBase.map((v, h) => Math.round(clamp(v * ck + d * .6 + (rnd(s + h + 50) - .5) * 4, 3, 98)));
  }

  function roadShare(list) {
    const m = {};
    list.forEach(i => i.roads.forEach(r => { m[r] = (m[r] || 0) + i.veh / 2; }));
    return Object.entries(m).map(([road, veh]) => ({ road, veh: Math.round(veh) })).sort((a, b) => b.veh - a.veh);
  }

  function recentFlow(i) {
    const base = i.veh * 10 / 15, s = hash(i.id), out = [];
    for (let k = 0; k < 12; k++) out.push(Math.round(base * (.86 + Math.sin((k + s % 5) / 2.2) * .12 + (rnd(s + k) - .5) * .1)));
    out[11] = Math.round(base);
    return out;
  }

  function predict(i, h) {
    const idx = h === 15 ? 0 : h === 30 ? 1 : 2;
    const c = clamp(i.cong + i.trend[idx], 4, 99), m = metrics(i, c);
    const conf = [93, 85, 73][idx] - (i.status === 'Sin datos' ? 12 : 0) - (i.n * 3) % 4;
    return { h, cong: c, veh: m.veh, wait: m.wait, conf, delta: c - i.cong };
  }

  /* ---------- Capa de Servicio Real Conectada a Spring Boot (Hexagonal) ---------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  const service = {
    getIntersections: () => clone(intersections),
    getCameras: () => clone(cameras),
    getIncidents: () => clone(incidents),
    syncFromBackend: async () => {
      try {
        const [nodeRes, interRes, incRes] = await Promise.all([
          fetch('/api/v1/realtime/node').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/v1/intersections').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/v1/incidents').then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (interRes && interRes.length) {
          interRes.forEach(remote => {
            const local = intersections.find(x => x.id === remote.code);
            if (local && local.id !== 'INT-01') {
              local.status = remote.status;
              local.mode = remote.mode;
              local.cong = remote.congestionPercent;
              derive(local);
            }
          });
        }

        if (nodeRes) {
          const int01 = intersections.find(x => x.id === 'INT-01');
          if (int01) {
            int01.iotConnected = nodeRes.iotConnected;
            if (nodeRes.iotConnected) {
              int01.status = 'Operativa';
              int01.mode = 'ESP32 Adaptativo (Local)';
              const c1 = nodeRes.cameras?.[0]?.classification?.totalVehicles || 0;
              const c2 = nodeRes.cameras?.[1]?.classification?.totalVehicles || 0;
              int01.veh = c1 + c2;
              int01.cong = Math.min(95, Math.round(int01.veh * 3.5));
            } else {
              int01.status = 'Sin datos';
              int01.mode = 'ESP32 Desconectado';
              int01.veh = 0;
              int01.cong = 0;
            }
            derive(int01);
          }

          // Sincronizar estado de cámaras físicas CAM-01 y CAM-02
          const cam01 = cameras.find(c => c.id === 'CAM-01');
          if (cam01) {
            cam01.status = nodeRes.cameras?.[0]?.isOnline ? 'En línea' : 'Sin señal';
          }
          const cam02 = cameras.find(c => c.id === 'CAM-02');
          if (cam02) {
            cam02.status = nodeRes.cameras?.[1]?.isOnline ? 'En línea' : 'Sin señal';
          }
        }

        return { node: nodeRes, intersections, cameras, incidents };
      } catch (e) {
        console.warn('Backend sync fallback to local model:', e);
        return null;
      }
    }
  };

  return {
    loginBrand,
    demoUser,
    zones,
    edges,
    incidentTypes,
    hours,
    periods,
    DIRS,
    level,
    metrics,
    derive,
    flow,
    cong,
    roadShare,
    recentFlow,
    predict,
    hash,
    rnd,
    service,
    intersections,
    cameras,
    incidents
  };
})();
