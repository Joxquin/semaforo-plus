/* ==========================================================================
   VIA SMART · utilidades y componentes compartidos
   Construye la barra lateral y la superior, gestiona preferencias, el reloj,
   la simulación moderada de datos y helpers (insignias, gráficos, modales).
   ========================================================================== */
(function () {
  'use strict';
  const D = window.VS_DATA;
  const VS = window.VS = { D };
  const $ = VS.$ = (s, el = document) => el.querySelector(s);
  const $$ = VS.$$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = VS.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = VS.pad = n => String(n).padStart(2, '0');
  VS.fmt = n => Number(n).toLocaleString('es-PE');
  const clamp = VS.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  VS.param = n => new URLSearchParams(location.search).get(n);
  VS.icons = () => { if (window.lucide && lucide.createIcons) lucide.createIcons(); };
  VS.render = (el, html) => { el.innerHTML = html; VS.icons(); };
  VS.options = arr => arr.map(o => typeof o === 'string' ? `<option>${esc(o)}</option>` : `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('');

  const page = document.body.dataset.page;
  const isLogin = page === 'login';
  const ss = { get(k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }, del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* noop */ } } };

  /* ---------- Acceso ficticio ---------- */
  VS.requireLogin = true;     // ponlo en false para abrir las páginas sin pasar por login.html
  if (!isLogin && VS.requireLogin && !ss.get('vs_auth')) { location.replace('login.html'); return; }
  VS.logout = () => { ss.del('vs_auth'); ss.del('vs_inc'); ss.del('vs_t0'); location.href = 'login.html'; };
  if (!ss.get('vs_t0')) ss.set('vs_t0', String(Date.now()));
  VS.t0 = Number(ss.get('vs_t0'));

  /* ---------- Preferencias (localStorage) ---------- */
  const PKEY = 'vs_prefs';
  const DEF = { name: 'Operador Demo', role: 'Operador de turno', email: 'operador@viasmart.demo', theme: 'dark', density: 'normal', collapsed: false, interval: 5, scenario: 'normal', notif: { critical: true, incidents: true, predictions: false, toasts: true }, widgets: { map: true, flow: true, dist: true, pred: true, inc: true, lights: true } };
  function loadPrefs() {
    let s = {}; try { s = JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { /* noop */ }
    return Object.assign({}, DEF, s, { notif: Object.assign({}, DEF.notif, s.notif), widgets: Object.assign({}, DEF.widgets, s.widgets) });
  }
  VS.prefs = loadPrefs();
  VS.applyPrefs = () => { const r = document.documentElement; r.dataset.theme = VS.prefs.theme; r.dataset.density = VS.prefs.density; document.body.classList.toggle('collapsed', !!VS.prefs.collapsed); };
  VS.savePrefs = () => { try { localStorage.setItem(PKEY, JSON.stringify(VS.prefs)); } catch (e) { /* noop */ } VS.applyPrefs(); };
  VS.resetPrefs = () => { try { localStorage.removeItem(PKEY); } catch (e) { /* noop */ } VS.prefs = loadPrefs(); VS.applyPrefs(); };

  /* ---------- Insignias y pequeños componentes ---------- */
  VS.level = D.level;
  VS.badge = (t, c = '', dot = true) => `<span class="badge ${c}">${dot ? '<i class="dot"></i>' : ''}${esc(t)}</span>`;
  VS.levelBadge = c => { const l = D.level(c); return VS.badge(`${l.label} · ${c}%`, l.cls); };
  VS.statusBadge = s => VS.badge(s, { 'Operativa': 'ok', 'Atención': 'warn', 'Sin datos': 'bad' }[s] || '');
  VS.prioBadge = p => VS.badge(p, { Alta: 'bad', Media: 'warn', Baja: 'info' }[p] || '');
  VS.incBadge = s => VS.badge(s, { Nueva: 'warn', Revisada: 'info', Resuelta: 'ok' }[s] || '');
  VS.camBadge = s => VS.badge(s, { 'En línea': 'ok', 'Degradada': 'warn', 'Sin señal': 'bad' }[s] || '');
  VS.modeBadge = m => VS.badge(m, m === 'Manual' ? 'warn' : 'info', false);
  VS.meter = c => `<span class="meter" role="img" aria-label="Congestión ${c}%"><i style="width:${clamp(c, 0, 100)}%;background:${D.level(c).color}"></i></span>`;
  VS.tl = s => `<span class="tl" data-s="${s}" role="img" aria-label="Semáforo en ${{ red: 'rojo', yellow: 'ámbar', green: 'verde' }[s]}"><i></i><i></i><i></i></span>`;
  VS.ago = ts => { const m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `hace ${Math.floor(m / 1440)} d`; };
  VS.dt = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------- Estado simulado de las intersecciones ---------- */
  const OFFS = { normal: 0, punta: 14, nocturno: -26 };
  VS.intersections = D.service.getIntersections();
  VS.byId = id => VS.intersections.find(i => i.id === id);
  const LABELS = ['N–S verde', 'N–S ámbar', 'E–O verde', 'E–O ámbar'];
  const durs = VS.durs = i => [i.plan.ns, 4, i.plan.eo, 4];
  VS.phaseLabels = LABELS;
  VS.applyScenario = () => { const off = OFFS[VS.prefs.scenario] || 0; VS.intersections.forEach(i => { i.cong = clamp(i.base + off, 5, 98); D.derive(i); i.alerted = i.cong >= 85; }); };
  VS.intersections.forEach((i, k) => { i.base = i.cong; i.pi = k % 4; i.pr = Math.max(3, Math.round(durs(i)[i.pi] * (.3 + ((k * 37) % 60) / 100))); });
  VS.applyScenario();

  VS.phaseInner = i => `<i class="dot" style="color:${i.pi % 2 ? 'var(--yellow)' : 'var(--green)'}"></i>${LABELS[i.pi]} · ${i.pr} s`;
  VS.phaseHTML = i => `<span class="phase" data-phase-id="${i.id}">${VS.phaseInner(i)}</span>`;
  VS.lightState = (i, d) => { const g = (d === 'N' || d === 'S') ? 0 : 2; return i.pi === g ? 'green' : i.pi === g + 1 ? 'yellow' : 'red'; };
  function advancePhases() { VS.intersections.forEach(i => { i.pr--; if (i.pr <= 0) { i.pi = (i.pi + 1) % 4; i.pr = durs(i)[i.pi]; } }); }
  function updatePhaseLabels() { $$('[data-phase-id]').forEach(el => { const i = VS.byId(el.dataset.phaseId); if (i) el.innerHTML = VS.phaseInner(i); }); }

  /* ---------- Incidencias (la sesión conserva los cambios) ---------- */
  const IKEY = 'vs_inc';
  const incState = () => { try { return JSON.parse(ss.get(IKEY, '{}')); } catch (e) { return {}; } };
  VS.incidents = () => {
    const st = incState(), base = D.service.getIncidents().map(x => Object.assign(x, { ts: VS.t0 - x.ago * 60000 }));
    const all = base.concat(st.custom || []);
    all.forEach(x => { if (st.status && st.status[x.id]) x.status = st.status[x.id]; });
    return all.sort((a, b) => b.ts - a.ts);
  };
  VS.activeIncidents = () => VS.incidents().filter(x => x.status !== 'Resuelta');
  VS.setIncStatus = (id, s) => { const st = incState(); st.status = st.status || {}; st.status[id] = s; ss.set(IKEY, JSON.stringify(st)); };
  VS.addIncident = o => { const st = incState(); st.custom = st.custom || []; const x = Object.assign({ id: 'INC-' + (1042 + st.custom.length), status: 'Nueva', ts: Date.now(), source: 'Operador (demo)' }, o); st.custom.push(x); ss.set(IKEY, JSON.stringify(st)); return x; };
  VS.resetIncidents = () => ss.del(IKEY);

  /* ---------- Toasts y modales ---------- */
  VS.toast = (msg, type = 'info') => {
    let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3800);
  };
  VS.dialog = ({ title, body, actions = [], wide = false }) => {
    const d = document.createElement('dialog'); d.className = 'modal' + (wide ? ' wide' : ''); d.setAttribute('aria-labelledby', 'dlgTitle');
    d.innerHTML = `<div class="modal-head"><h2 id="dlgTitle">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div><div class="modal-body"></div><div class="modal-foot"></div>`;
    const b = $('.modal-body', d); if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
    const f = $('.modal-foot', d);
    actions.forEach(a => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ' + (a.cls || ''); btn.textContent = a.label; btn.addEventListener('click', () => { const r = a.onClick ? a.onClick(d) : undefined; if (r !== false && a.close !== false) d.close(); }); f.appendChild(btn); });
    if (!actions.length) f.remove();
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', () => d.remove());
    document.body.appendChild(d); VS.icons();
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    return d;
  };

  /* ---------- Gráficos (Chart.js por CDN) ---------- */
  const merge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; };
  VS.pal = light => {
    if (light) return { text: '#4B5563', grid: '#E5E7EB', green: '#16A34A', yellow: '#CA8A04', red: '#DC2626', blue: '#4B6A94', muted: '#9CA3AF' };
    const s = getComputedStyle(document.documentElement), g = n => s.getPropertyValue(n).trim();
    return { text: g('--muted'), grid: g('--border'), green: g('--green'), yellow: g('--yellow'), red: g('--red'), blue: g('--blue'), muted: g('--muted') };
  };
  VS.opts = (extra = {}, o = {}) => {
    const p = VS.pal(o.light);
    const base = {
      responsive: true, maintainAspectRatio: false, animation: { duration: o.light ? 0 : 400 }, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: p.text, usePointStyle: true, boxWidth: 8, font: { family: 'Inter, system-ui, sans-serif', size: 12 } } }, tooltip: { padding: 10 } },
      scales: { x: { grid: { display: false }, ticks: { color: p.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, border: { color: p.grid } }, y: { beginAtZero: true, grid: { color: p.grid }, ticks: { color: p.text }, border: { display: false } } }
    };
    if (o.noScales) delete base.scales;
    return merge(base, extra);
  };
  const charts = {};
  VS.chart = (id, cfg) => {
    const el = typeof id === 'string' ? document.getElementById(id) : id; if (!el) return null;
    if (!window.Chart) { if (!el.dataset.failed) { el.dataset.failed = 1; el.parentElement.innerHTML = '<p class="empty">No se pudo cargar Chart.js. Se necesita conexión a Internet para el CDN de los gráficos.</p>'; } return null; }
    if (charts[el.id]) charts[el.id].destroy();
    return (charts[el.id] = new Chart(el, cfg));
  };

  /* ---------- Reloj, ticks y simulación moderada ---------- */
  const tickFns = [], secFns = [];
  VS.onTick = f => tickFns.push(f);
  VS.onSecond = f => secFns.push(f);
  VS.lastUpdate = Date.now();
  VS.tick = () => {
    const off = OFFS[VS.prefs.scenario] || 0;
    VS.intersections.forEach(i => {
      if (i.status === 'Sin datos') return;       // sin lecturas: se mantiene el último valor
      const target = clamp(i.base + off, 5, 98);
      const d = Math.round((target - i.cong) * .2 + (Math.random() - .5) * 5);
      i.cong = clamp(i.cong + clamp(d, -3, 3), 5, 98); D.derive(i);
      if (i.cong >= 85 && !i.alerted && VS.prefs.notif.critical && VS.prefs.notif.toasts) { i.alerted = true; VS.toast(`${i.id}: la congestión supera el 85 %. Revisa la intersección.`, 'warn'); }
      if (i.cong < 80) i.alerted = false;
    });
    VS.lastUpdate = Date.now();
    tickFns.forEach(f => f()); updateTopbar();
  };
  let tickTimer = null;
  VS.restartTimer = () => { clearInterval(tickTimer); const s = Number(VS.prefs.interval); if (s > 0) tickTimer = setInterval(VS.tick, s * 1000); };
  const NAV = [
    { id: 'dashboard', href: 'index.html', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'intersecciones', href: 'intersecciones.html', label: 'Intersecciones', icon: 'map-pin' },
    { id: 'camaras', href: 'camaras.html', label: 'Cámaras', icon: 'video' },
    { id: 'analisis', href: 'analisis.html', label: 'Análisis', icon: 'chart-column' },
    { id: 'predicciones', href: 'predicciones.html', label: 'Predicciones', icon: 'sparkles' },
    { id: 'incidencias', href: 'incidencias.html', label: 'Incidencias', icon: 'triangle-alert' },
    { id: 'reportes', href: 'reportes.html', label: 'Reportes', icon: 'file-text' },
    { id: 'configuracion', href: 'configuracion.html', label: 'Configuración', icon: 'settings' }
  ];
  const LOGO = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--surface)" stroke="var(--border)"/><circle cx="16" cy="8.5" r="3.2" fill="#F87171"/><circle cx="16" cy="16" r="3.2" fill="#FACC15"/><circle cx="16" cy="23.5" r="3.2" fill="#4ADE80"/></svg>';
  const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  function updateClock() {
    const d = new Date(), t = $('#clockTime'); if (!t) return;
    t.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    $('#clockDate').textContent = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function bellList() {
    const n = VS.prefs.notif, list = VS.incidents().filter(x => x.status === 'Nueva' && (n.incidents || (n.critical && x.prio === 'Alta'))).slice(0, 5);
    const pred = n.predictions ? '<a class="pop-item" href="predicciones.html"><i data-lucide="sparkles"></i><div><strong>Riesgo previsto en la red</strong><span>Revisa la predicción simulada a 30 min</span></div></a>' : '';
    const items = list.map(x => `<a class="pop-item" href="incidencias.html"><i data-lucide="${x.prio === 'Alta' ? 'triangle-alert' : 'info'}" style="color:${x.prio === 'Alta' ? 'var(--red)' : 'var(--yellow)'}"></i><div><strong>${esc(x.type)}</strong><span>${esc(x.int)} · ${VS.ago(x.ts)}</span></div></a>`).join('');
    return { html: (items + pred) || '<div class="pop-empty">No hay notificaciones nuevas.</div>', count: list.length + (n.predictions ? 1 : 0) };
  }
  function updateTopbar() {
    const ok = VS.intersections.filter(i => i.status !== 'Sin datos').length, pill = $('#sensorPill');
    if (pill) { pill.innerHTML = `<i class="dot" style="color:${ok < VS.intersections.length ? 'var(--yellow)' : 'var(--green)'}"></i>Sensores ${ok}/${VS.intersections.length}`; }
    const u = $('#updTxt'); if (u) { const d = new Date(VS.lastUpdate); u.textContent = `Actualizado ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
    const b = bellList(), m = $('#bellMenuList'); if (m) { m.innerHTML = b.html; VS.icons(); }
    const c = $('#bellCount'); if (c) { c.textContent = b.count; c.hidden = !b.count; }
  }
  VS.updateUser = () => { const n = $('#uName'), r = $('#uRole'), a = $('#uAvatar'); if (n) { n.textContent = VS.prefs.name; r.textContent = VS.prefs.role; a.textContent = initials(VS.prefs.name); } };

  function closePops() { $$('.popover').forEach(p => { p.hidden = true; }); $$('[aria-haspopup]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
  function togglePop(btn, menu) { const open = menu.hidden; closePops(); if (open) { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); } }

  function buildShell() {
    const b = document.body, cur = b.dataset.nav || b.dataset.page;
    $('#sidebar').innerHTML = `<a class="brand" href="index.html" aria-label="Semáforo+, ir al dashboard">${LOGO}<span class="brand-text"><strong>Semáforo+</strong><small>Movilidad Inteligente · TECSUP</small></span></a>
      <nav class="nav" aria-label="Módulos">${NAV.map(n => `<a href="${n.href}" title="${n.label}"${n.id === cur ? ' aria-current="page"' : ''}><i data-lucide="${n.icon}"></i><span class="nav-label">${n.label}</span></a>`).join('')}</nav>
      <div class="side-foot"><div class="side-note"><i class="dot" style="color:var(--green)"></i>ODS 11 · TECSUP Arequipa<small>Retrofit ESP32 / ESP32-CAM · Av. Ejército</small></div></div>`;
    $('#topbar').innerHTML = `<button type="button" class="icon-btn" id="menuBtn" aria-label="Alternar menú lateral" aria-expanded="false"><i data-lucide="menu"></i></button>
      <div class="page-title"><h1>${esc(b.dataset.title)}</h1><p>${esc(b.dataset.subtitle || '')}</p></div>
      <div class="top-right">
        <span class="pill hide-m"><i class="dot" style="color:var(--green)"></i>ESP32 Adaptativo</span>
        <span class="pill hide-m" id="sensorPill"></span>
        <div class="clock hide-m"><strong id="clockTime">--:--:--</strong><small id="clockDate"></small></div>
        <div class="menu-wrap"><button type="button" class="icon-btn" id="bellBtn" aria-label="Notificaciones" aria-haspopup="true" aria-expanded="false"><i data-lucide="bell"></i><span class="badge-dot" id="bellCount" hidden></span></button>
          <div class="popover" id="bellMenu" hidden><div class="pop-title">Notificaciones<small class="muted" id="updTxt"></small></div><div id="bellMenuList"></div><a class="pop-item" href="incidencias.html"><i data-lucide="list"></i><div><strong>Ver todas las incidencias</strong></div></a></div></div>
        <div class="menu-wrap"><button type="button" class="user-btn" id="userBtn" aria-haspopup="true" aria-expanded="false" aria-label="Menú del operador"><span class="avatar" id="uAvatar"></span><span class="hide-m"><span class="u-name" id="uName"></span><span class="u-role" id="uRole"></span></span></button>
          <div class="popover narrow" id="userMenu" hidden><a class="pop-item" href="configuracion.html"><i data-lucide="settings"></i><div><strong>Configuración</strong></div></a><button type="button" class="pop-item" id="logoutBtn"><i data-lucide="log-out"></i><div><strong>Cerrar sesión</strong></div></button></div></div>
      </div>`;
    $('#menuBtn').addEventListener('click', () => {
      if (window.innerWidth <= 960) { const o = b.classList.toggle('nav-open'); $('#menuBtn').setAttribute('aria-expanded', o); }
      else { VS.prefs.collapsed = !b.classList.contains('collapsed'); VS.savePrefs(); $('#menuBtn').setAttribute('aria-expanded', !VS.prefs.collapsed); }
    });
    $('#menuBtn').setAttribute('aria-expanded', window.innerWidth <= 960 ? 'false' : String(!VS.prefs.collapsed));
    $('#scrim').addEventListener('click', () => { b.classList.remove('nav-open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); });
    $('#bellBtn').addEventListener('click', e => { e.stopPropagation(); togglePop($('#bellBtn'), $('#bellMenu')); });
    $('#userBtn').addEventListener('click', e => { e.stopPropagation(); togglePop($('#userBtn'), $('#userMenu')); });
    $('#logoutBtn').addEventListener('click', VS.logout);
    document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) closePops(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePops(); if (b.classList.contains('nav-open')) { b.classList.remove('nav-open'); $('#menuBtn').focus(); } } });
    VS.updateUser();
  }

  /* ---------- Arranque ---------- */
  VS.applyPrefs();
  if (!isLogin) {
    buildShell(); updateTopbar(); updateClock();
    setInterval(() => { advancePhases(); updateClock(); updatePhaseLabels(); secFns.forEach(f => f()); }, 1000);
    VS.restartTimer();
  }
  VS.icons();
})();
