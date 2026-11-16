/* ==========================================================================
   VIA SMART · Datos de demostración
   TODO el contenido es FICTICIO. Las referencias a Arequipa son ilustrativas.
   `service` (al final) es el único punto de entrada a los datos: en una fase
   posterior bastará con sustituirlo por llamadas a una API real, sin tocar
   la lógica de presentación de las páginas.
   ========================================================================== */
window.VS_DATA = (function () {
  'use strict';

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

  const loginBrand = 'Semáforo+';
  const demoUser = { user: 'operador', pass: 'via2026' };

  const zones = ['Centro', 'Yanahuara', 'Cayma', 'Paucarpata', 'Miraflores', 'J. L. Bustamante'];

  /* ---------- Intersecciones ----------
     cong: congestión base (%). split: reparto del flujo [Norte, Sur, Este, Oeste].
     trend: variación prevista de la congestión a 15/30/60 min. plan: segundos de verde. */
  const intersections = [
    { id: 'INT-01', name: 'Av. Ejército × Av. Salaverry', zone: 'Yanahuara', roads: ['Av. Ejército', 'Av. Salaverry'], cong: 34, mode: 'Automático', status: 'Operativa', x: 130, y: 90, plan: { ns: 38, eo: 30 }, split: [.30, .26, .24, .20], trend: [2, 3, 5] },
    { id: 'INT-02', name: 'Av. Goyeneche × Av. Parra', zone: 'Centro', roads: ['Av. Goyeneche', 'Av. Parra'], cong: 78, mode: 'Adaptativo', status: 'Atención', x: 250, y: 200, plan: { ns: 45, eo: 32 }, split: [.32, .28, .22, .18], trend: [4, 7, 10] },
    { id: 'INT-03', name: 'Av. Dolores × Av. Mariscal Castilla', zone: 'Paucarpata', roads: ['Av. Dolores', 'Av. Mariscal Castilla'], cong: 52, mode: 'Automático', status: 'Operativa', x: 640, y: 150, plan: { ns: 36, eo: 34 }, split: [.27, .25, .26, .22], trend: [3, 2, -2] },
    { id: 'INT-04', name: 'Av. Venezuela × Av. Jesús', zone: 'Miraflores', roads: ['Av. Venezuela', 'Av. Jesús'], cong: 27, mode: 'Automático', status: 'Operativa', x: 150, y: 340, plan: { ns: 32, eo: 32 }, split: [.26, .24, .27, .23], trend: [1, 0, -3] },
    { id: 'INT-05', name: 'Av. Kennedy × Av. Ejército', zone: 'Cayma', roads: ['Av. Kennedy', 'Av. Ejército'], cong: 44, mode: 'Adaptativo', status: 'Operativa', x: 330, y: 70, plan: { ns: 34, eo: 36 }, split: [.24, .26, .28, .22], trend: [3, 5, 7] },
    { id: 'INT-06', name: 'Puente Bolognesi × Av. Independencia', zone: 'Centro', roads: ['Puente Bolognesi', 'Av. Independencia'], cong: 86, mode: 'Manual', status: 'Atención', x: 430, y: 210, plan: { ns: 48, eo: 30 }, split: [.34, .30, .20, .16], trend: [3, 4, 6] },
    { id: 'INT-07', name: 'Av. Aviación × Av. Alcides Carrión', zone: 'Miraflores', roads: ['Av. Aviación', 'Av. Alcides Carrión'], cong: 61, mode: 'Automático', status: 'Operativa', x: 400, y: 370, plan: { ns: 40, eo: 30 }, split: [.28, .27, .24, .21], trend: [5, 8, 9] },
    { id: 'INT-08', name: 'Av. La Marina × Av. Metropolitana', zone: 'J. L. Bustamante', roads: ['Av. La Marina', 'Av. Metropolitana'], cong: 39, mode: 'Automático', status: 'Sin datos', x: 650, y: 330, plan: { ns: 34, eo: 34 }, split: [.25, .25, .27, .23], trend: [0, 2, 3] }
  ];
  intersections.forEach((i, k) => { i.n = k + 1; });

  /* Tramos viales entre intersecciones (para colorear el mapa). */
  const edges = [
    ['INT-01', 'INT-05'], ['INT-01', 'INT-02'], ['INT-05', 'INT-02'], ['INT-05', 'INT-06'], ['INT-02', 'INT-06'],
    ['INT-02', 'INT-04'], ['INT-06', 'INT-03'], ['INT-06', 'INT-07'], ['INT-03', 'INT-08'], ['INT-07', 'INT-08'], ['INT-04', 'INT-07']
  ];

  /* ---------- Reglas de coherencia ----------
     Más congestión ⇒ más vehículos y más espera. */
  function level(c) {
    return c >= 70 ? { key: 'alto', label: 'Alto', cls: 'bad', color: 'var(--red)' }
      : c >= 40 ? { key: 'moderado', label: 'Moderado', cls: 'warn', color: 'var(--yellow)' }
        : { key: 'fluido', label: 'Fluido', cls: 'ok', color: 'var(--green)' };
  }
  function metrics(i, cong) {
    const j = (i.n * 7) % 13 - 6;
    return { veh: Math.round(60 + cong * 3.6 + j), wait: Math.round(14 + cong * 1.05 + (i.n % 3)) };
  }
  const DIRS = ['N', 'S', 'E', 'O'];
  function derive(i) {
    const m = metrics(i, i.cong);
    i.veh = m.veh; i.wait = m.wait;                      // vehículos detectados en 15 min · espera en s
    i.approach = DIRS.map((d, k) => ({ dir: d, veh: Math.round(i.veh * i.split[k]), wait: Math.round(i.wait * (.4 + i.split[k] * 2.4)) }));
    return i;
  }

  /* ---------- Cámaras ---------- */
  const cameras = [
    { id: 'CAM-01', int: 'INT-01', name: 'Salaverry · acceso norte', status: 'En línea' },
    { id: 'CAM-02', int: 'INT-02', name: 'Goyeneche · cruce principal', status: 'En línea' },
    { id: 'CAM-03', int: 'INT-02', name: 'Parra · acceso este', status: 'Degradada' },
    { id: 'CAM-04', int: 'INT-03', name: 'Dolores · Mariscal Castilla', status: 'En línea' },
    { id: 'CAM-05', int: 'INT-05', name: 'Kennedy · Ejército', status: 'En línea' },
    { id: 'CAM-06', int: 'INT-06', name: 'Puente Bolognesi · sentido sur', status: 'En línea' },
    { id: 'CAM-07', int: 'INT-07', name: 'Aviación · Alcides Carrión', status: 'En línea' },
    { id: 'CAM-08', int: 'INT-08', name: 'La Marina · Metropolitana', status: 'Sin señal' }
  ];

  /* ---------- Incidencias (ago = minutos desde el inicio de la sesión) ---------- */
  const incidentTypes = ['Congestión elevada', 'Posible incidente vial', 'Incremento repentino de vehículos', 'Pérdida de datos de sensor', 'Cámara degradada', 'Semáforo en modo manual', 'Vehículo detenido', 'Desfase de ciclo'];
  const incidents = [
    { id: 'INC-1041', type: 'Congestión elevada', int: 'INT-06', prio: 'Alta', status: 'Nueva', ago: 6, source: 'Sistema (simulado)', desc: 'Congestión sostenida por encima del 85 % en Puente Bolognesi; cola estimada de 14 vehículos hacia Av. Independencia.' },
    { id: 'INC-1040', type: 'Posible incidente vial', int: 'INT-06', prio: 'Alta', status: 'Revisada', ago: 22, source: 'Sistema (simulado)', desc: 'Se detectan vehículos detenidos en el carril central; posible colisión leve. Pendiente de confirmación visual.' },
    { id: 'INC-1039', type: 'Incremento repentino de vehículos', int: 'INT-02', prio: 'Media', status: 'Nueva', ago: 14, source: 'Sistema (simulado)', desc: 'Aumento del 22 % en el conteo de vehículos en 5 minutos en el acceso norte de Av. Goyeneche.' },
    { id: 'INC-1038', type: 'Pérdida de datos de sensor', int: 'INT-08', prio: 'Media', status: 'Nueva', ago: 38, source: 'Sistema (simulado)', desc: 'El sensor ultrasónico del acceso norte no envía lecturas desde hace 12 minutos. Se muestran los últimos valores registrados.' },
    { id: 'INC-1037', type: 'Congestión elevada', int: 'INT-02', prio: 'Alta', status: 'Nueva', ago: 31, source: 'Sistema (simulado)', desc: 'Tiempo de espera medio superior a 90 s en Av. Goyeneche × Av. Parra durante más de 10 minutos.' },
    { id: 'INC-1036', type: 'Semáforo en modo manual', int: 'INT-06', prio: 'Baja', status: 'Revisada', ago: 47, source: 'Operador (demo)', desc: 'El operador de turno cambió la intersección a modo manual para gestionar el evento en curso.' },
    { id: 'INC-1032', type: 'Cámara degradada', int: 'INT-02', prio: 'Baja', status: 'Nueva', ago: 55, source: 'Sistema (simulado)', desc: 'CAM-03 reporta calidad de imagen reducida y pérdida intermitente de cuadros.' },
    { id: 'INC-1035', type: 'Vehículo detenido', int: 'INT-07', prio: 'Media', status: 'Resuelta', ago: 92, source: 'Sistema (simulado)', desc: 'Vehículo detenido en el carril derecho de Av. Aviación; retirado por el personal de apoyo.' },
    { id: 'INC-1034', type: 'Desfase de ciclo', int: 'INT-05', prio: 'Baja', status: 'Resuelta', ago: 140, source: 'Sistema (simulado)', desc: 'Desfase de 3 s entre el ciclo programado y el medido. Corregido tras resincronizar el controlador.' },
    { id: 'INC-1033', type: 'Incremento repentino de vehículos', int: 'INT-03', prio: 'Media', status: 'Resuelta', ago: 185, source: 'Sistema (simulado)', desc: 'Pico de vehículos por evento en la zona; el flujo volvió a valores normales sin intervención.' },
    { id: 'INC-1031', type: 'Congestión elevada', int: 'INT-07', prio: 'Media', status: 'Resuelta', ago: 260, source: 'Sistema (simulado)', desc: 'Congestión del 72 % en hora punta; se resolvió al ampliar el verde N–S en el plan adaptativo.' }
  ];

  /* ---------- Series históricas de la red (vehículos/h y % de congestión por hora) ---------- */
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00');
  const flowBase = [1900, 1300, 950, 820, 1150, 2700, 6500, 10800, 12600, 9400, 8200, 8700, 9800, 10200, 9000, 8800, 9900, 12200, 13400, 11000, 7600, 5400, 3600, 2400];
  const congBase = [18, 14, 10, 9, 12, 28, 52, 71, 78, 62, 52, 55, 60, 63, 56, 54, 62, 76, 82, 70, 50, 38, 28, 22];

  /* k: factor de flujo · ck: factor de congestión · wk: factor de espera. `prev` = periodo anterior comparable. */
  const periods = {
    hoy: { label: 'Hoy', days: 1, k: 1, ck: 1, wk: 1, prev: { label: 'Ayer', k: .94, ck: .96, wk: .95 } },
    ayer: { label: 'Ayer', days: 1, k: .94, ck: .96, wk: .95, prev: { label: 'Anteayer', k: .91, ck: .93, wk: .97 } },
    '7d': { label: 'Últimos 7 días', days: 7, k: .97, ck: .98, wk: .98, prev: { label: '7 días anteriores', k: .93, ck: .95, wk: 1.03 } },
    '30d': { label: 'Últimos 30 días', days: 30, k: .92, ck: .94, wk: .93, prev: { label: '30 días anteriores', k: .9, ck: .92, wk: .96 } }
  };

  /* Flujo (veh/h) de un subconjunto de intersecciones: proporcional a sus vehículos. */
  function flow(list, all, k, seed) {
    const share = sum(list, i => i.veh) / Math.max(1, sum(all, i => i.veh));
    const s = hash(seed);
    return flowBase.map((v, h) => Math.round(v * share * k * (1 + (rnd(s + h) - .5) * .08)));
  }
  /* Congestión (%) por hora: la curva de la red desplazada según la congestión del subconjunto. */
  function cong(list, all, ck, seed) {
    const avg = a => sum(a, i => i.cong) / Math.max(1, a.length);
    const d = avg(list) - avg(all), s = hash(seed);
    return congBase.map((v, h) => Math.round(clamp(v * ck + d * .6 + (rnd(s + h + 50) - .5) * 4, 3, 98)));
  }
  /* Vehículos por vía: cada intersección reparte su flujo entre sus dos vías. */
  function roadShare(list) {
    const m = {};
    list.forEach(i => i.roads.forEach(r => { m[r] = (m[r] || 0) + i.veh / 2; }));
    return Object.entries(m).map(([road, veh]) => ({ road, veh: Math.round(veh) })).sort((a, b) => b.veh - a.veh);
  }
  /* Flujo reciente de una intersección: 12 puntos de 10 min (el último coincide con el valor actual). */
  function recentFlow(i) {
    const base = i.veh * 10 / 15, s = hash(i.id), out = [];
    for (let k = 0; k < 12; k++) out.push(Math.round(base * (.86 + Math.sin((k + s % 5) / 2.2) * .12 + (rnd(s + k) - .5) * .1)));
    out[11] = Math.round(base);
    return out;
  }
  /* Predicción simulada a h minutos (15, 30 o 60). No es un modelo real. */
  function predict(i, h) {
    const idx = h === 15 ? 0 : h === 30 ? 1 : 2;
    const c = clamp(i.cong + i.trend[idx], 4, 99), m = metrics(i, c);
    const conf = [93, 85, 73][idx] - (i.status === 'Sin datos' ? 12 : 0) - (i.n * 3) % 4;
    return { h, cong: c, veh: m.veh, wait: m.wait, conf, delta: c - i.cong };
  }

  /* ---------- Capa de servicio (sustituible por una API) ---------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  const service = {
    getIntersections: () => clone(intersections),
    getCameras: () => clone(cameras),
    getIncidents: () => clone(incidents)
  };

  return { loginBrand, demoUser, zones, edges, incidentTypes, hours, periods, DIRS, level, metrics, derive, flow, cong, roadShare, recentFlow, predict, hash, rnd, service };
})();
