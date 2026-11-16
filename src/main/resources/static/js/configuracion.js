/* Semáforo+ · Configuración y Parámetros del Nodo Físico ESP32 */
(function () {
  'use strict';
  const { $, $$ } = VS, P = VS.prefs;
  const saved = (m = 'Configuración guardada') => { VS.savePrefs(); VS.toast(m, 'ok'); };

  $('#pfName').value = P.name; $('#pfRole').value = P.role; $('#pfEmail').value = P.email;
  $('#pfForm').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#pfName').value.trim(), r = $('#pfRole').value.trim(), m = $('#pfEmail').value.trim();
    const set = (id, msg) => { $(id).textContent = msg; return !msg; };
    const ok = [set('#pfNameErr', n.length < 3 ? 'Escribe al menos 3 caracteres.' : ''), set('#pfRoleErr', r.length < 3 ? 'Indica un cargo válido.' : ''), set('#pfEmailErr', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m) ? '' : 'Ingresa un correo con formato válido.')].every(Boolean);
    if (!ok) return;
    P.name = n; P.role = r; P.email = m; saved('Perfil guardado'); VS.updateUser();
  });

  [['#nCritical', 'critical'], ['#nIncidents', 'incidents'], ['#nPred', 'predictions'], ['#nToasts', 'toasts']].forEach(([s, k]) => {
    if ($(s)) {
      $(s).checked = P.notif[k];
      $(s).addEventListener('change', e => { P.notif[k] = e.target.checked; saved(); });
    }
  });

  ['theme', 'density'].forEach(n => {
    $$(`input[name="${n}"]`).forEach(r => {
      r.checked = r.value === P[n];
      r.addEventListener('change', () => { P[n] = r.value; saved(); });
    });
  });

  function info() {
    const d = new Date();
    const rows = [
      ['Proyecto', 'Semáforo+ (TECSUP Arequipa · ODS 11)'],
      ['Cruce Real', 'Av. Ejército × Calle Los Arces'],
      ['Cerebro Central', 'ESP32 Dual-Core 240MHz (IP 192.168.1.50)'],
      ['Semáforos Físicos', '2 Unidades: SEM-01 (Av. Ejército) y SEM-02 (Los Arces)'],
      ['Cámaras On-Edge', '2 Unidades: ESP32-CAM 01 (Poste Norte) y ESP32-CAM 02 (Poste Este)'],
      ['Modo de Operación', '100% Local Autónomo (Toma de decisiones en el poste sin internet)'],
      ['Límites de Seguridad', 'Tiempo Verde: Mínimo 15s · Máximo 60s · Amarillo 3s'],
      ['Respaldo Energético', 'Batería LiFePO4 13.6V (96%) + Panel Solar 50W'],
      ['Servidor Backend', 'Spring Boot (Kotlin) · Arquitectura Hexagonal · H2 Database'],
      ['Última Sincronización', d.toLocaleTimeString('es-PE')]
    ];
    $('#sysInfo').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  info();
  setInterval(info, 10000);
})();
