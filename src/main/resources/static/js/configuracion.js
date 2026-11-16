/* Configuración · preferencias del operador y de la demostración */
(function () {
  'use strict';
  const { $, $$ } = VS, P = VS.prefs;
  const saved = (m = 'Preferencia guardada') => { VS.savePrefs(); VS.toast(m, 'ok'); };
  $('#pfName').value = P.name; $('#pfRole').value = P.role; $('#pfEmail').value = P.email;
  $('#pfForm').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#pfName').value.trim(), r = $('#pfRole').value.trim(), m = $('#pfEmail').value.trim();
    const set = (id, msg) => { $(id).textContent = msg; return !msg; };
    const ok = [set('#pfNameErr', n.length < 3 ? 'Escribe al menos 3 caracteres.' : ''), set('#pfRoleErr', r.length < 3 ? 'Indica un cargo válido.' : ''), set('#pfEmailErr', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m) ? '' : 'Ingresa un correo con formato válido.')].every(Boolean);
    if (!ok) return;
    P.name = n; P.role = r; P.email = m; saved('Perfil guardado'); VS.updateUser();
  });
  [['#nCritical', 'critical'], ['#nIncidents', 'incidents'], ['#nPred', 'predictions'], ['#nToasts', 'toasts']].forEach(([s, k]) => { $(s).checked = P.notif[k]; $(s).addEventListener('change', e => { P.notif[k] = e.target.checked; saved(); }); });
  const note = () => { $('#intervalNote').textContent = Number(P.interval) ? `Sondeo de telemetría cada ${P.interval} s desde la API REST.` : 'La actualización automática está en pausa.'; };
  $('#interval').value = String(P.interval); note();
  $('#interval').addEventListener('change', e => { P.interval = Number(e.target.value); saved('Intervalo actualizado'); VS.restartTimer(); note(); });
  ['theme', 'density'].forEach(n => { $$(`input[name="${n}"]`).forEach(r => { r.checked = r.value === P[n]; r.addEventListener('change', () => { P[n] = r.value; saved(); }); }); });
  $('#collapsed').checked = !!P.collapsed; $('#collapsed').addEventListener('change', e => { P.collapsed = e.target.checked; saved(); });
  $$('[data-w]').forEach(c => { c.checked = P.widgets[c.dataset.w]; c.addEventListener('change', () => { P.widgets[c.dataset.w] = c.checked; saved(); }); });
  $('#resetSession')?.addEventListener('click', () => { VS.resetIncidents(); VS.toast('Incidencias restablecidas', 'ok'); });
  $('#resetPrefs')?.addEventListener('click', () => { VS.resetPrefs(); location.reload(); });
  function info() {
    const d = new Date(VS.lastUpdate), rows = [
      ['Sistema', 'Semáforo+ (TECSUP · ODS 11)'],
      ['Arquitectura', 'Hexagonal (Ports and Adapters · Kotlin / Spring Boot)'],
      ['Hardware IoT', 'ESP32 Dual-Core 240MHz + 2× ESP32-CAM (TinyML On-Edge)'],
      ['Nodo Piloto Real', 'INT-01 (Av. Ejército × Calle Los Arces)'],
      ['Intersección Monitoreada', '1 Intersección (2 semáforos físicos + 2 cámaras ESP32-CAM)'],
      ['Base de Datos', 'H2 Database (In-Memory) · JPA Hibernate'],
      ['Última actualización', d.toLocaleTimeString('es-PE')]
    ];
    $('#sysInfo').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  VS.onTick(info); info();
})();
