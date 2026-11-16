/* Semáforo+ · Inicio de sesión integrado con Spring Security */
(function () {
  'use strict';
  const { $ } = VS, D = VS.D;
  if ($('#brand')) $('#brand').textContent = D.loginBrand || 'Semáforo+';

  const urlParams = new URLSearchParams(window.location.search);
  const errEl = $('#loginErr');
  const msgEl = $('#loginMsg');

  if (urlParams.has('error') && errEl) {
    errEl.textContent = 'Usuario o contraseña incorrectos. Verifica tus credenciales (operador / via2026).';
    errEl.hidden = false;
  }
  if (urlParams.has('logout') && msgEl) {
    try {
      sessionStorage.removeItem('vs_auth');
      sessionStorage.removeItem('vs_t0');
    } catch (e) {}
    msgEl.textContent = 'Sesión cerrada exitosamente.';
    msgEl.hidden = false;
  }

  const set = (id, m) => { const el = $(id); if (el) el.textContent = m; return !m; };

  const toggleBtn = $('#togglePw');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const p = $('#pass'), show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      toggleBtn.setAttribute('aria-pressed', show);
      toggleBtn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      toggleBtn.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
      VS.icons();
    });
  }

  const form = $('#loginForm');
  if (form) {
    form.addEventListener('submit', e => {
      const u = $('#user').value.trim();
      const p = $('#pass').value;
      if (errEl) errEl.hidden = true;

      const ok = [
        set('#userErr', u ? '' : 'Ingresa tu usuario.'),
        set('#passErr', !p ? 'Ingresa tu contraseña.' : p.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : '')
      ].every(Boolean);

      if (!ok) {
        e.preventDefault();
        return;
      }

      try {
        sessionStorage.setItem('vs_auth', '1');
        sessionStorage.setItem('vs_t0', String(Date.now()));
      } catch (x) {}

      const b = $('#loginBtn');
      if (b) {
        b.disabled = true;
        b.textContent = 'Accediendo…';
      }
      // Let standard form submit proceed to POST /login for Spring Security!
    });
  }
})();
