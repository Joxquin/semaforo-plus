/* Inicio de sesión · Semáforo+ (Spring Security + SessionStorage) */
(function () {
  'use strict';
  const { $ } = VS, D = VS.D;
  const brandEl = $('#brand');
  if (brandEl) brandEl.textContent = 'Semáforo+';

  // Mostrar error si viene de ?error=true
  const params = new URLSearchParams(location.search);
  const errBox = $('#loginErr');
  if (params.get('error') === 'true' && errBox) {
    errBox.textContent = 'Usuario o contraseña incorrectos. Usa operador / via2026';
    errBox.hidden = false;
  }

  const set = (id, m) => { $(id).textContent = m; return !m; };

  $('#togglePw').addEventListener('click', () => {
    const p = $('#pass'), show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    const b = $('#togglePw');
    b.setAttribute('aria-pressed', show);
    b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    b.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
    VS.icons();
  });

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const u = $('#user').value.trim();
    const p = $('#pass').value;

    const ok = [
      set('#userErr', u ? '' : 'Ingresa tu usuario.'),
      set('#passErr', !p ? 'Ingresa tu contraseña.' : p.length < 4 ? 'La contraseña debe tener al menos 4 caracteres.' : '')
    ].every(Boolean);

    if (!ok) return;

    const b = $('#loginBtn');
    b.disabled = true;
    b.textContent = 'Accediendo…';

    try {
      const body = new URLSearchParams();
      body.append('username', u);
      body.append('password', p);

      const resp = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        redirect: 'follow'
      });

      if (resp.redirected && resp.url.includes('error=true')) {
        const errBox = $('#loginErr');
        if (errBox) {
          errBox.textContent = 'Usuario o contraseña incorrectos. Usa operador / via2026';
          errBox.hidden = false;
        }
        b.disabled = false;
        b.textContent = 'Acceder';
        return;
      }

      try {
        sessionStorage.setItem('vs_auth', '1');
        sessionStorage.setItem('vs_t0', String(Date.now()));
      } catch (x) {}

      window.location.href = '/index.html';
    } catch (err) {
      console.warn('Fetch fallback to form submit:', err);
      // Fallback native submission
      b.disabled = false;
      e.target.submit();
    }
  });
})();
