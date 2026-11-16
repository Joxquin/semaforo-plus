/* Inicio de sesión · acceso ficticio (sin autenticación real) */
(function () {
  'use strict';
  const { $ } = VS, D = VS.D;
  $('#brand').textContent = D.loginBrand;
  const set = (id, m) => { $(id).textContent = m; return !m; };
  $('#togglePw').addEventListener('click', () => {
    const p = $('#pass'), show = p.type === 'password'; p.type = show ? 'text' : 'password';
    const b = $('#togglePw'); b.setAttribute('aria-pressed', show); b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    b.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`; VS.icons();
  });
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const u = $('#user').value.trim(), p = $('#pass').value, err = $('#loginErr'); err.hidden = true;
    const ok = [set('#userErr', u ? '' : 'Ingresa tu usuario.'), set('#passErr', !p ? 'Ingresa tu contraseña.' : p.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : '')].every(Boolean);
    if (!ok) return;
    if (u.toLowerCase() !== D.demoUser.user || p !== D.demoUser.pass) { err.textContent = 'Usuario o contraseña incorrectos. Usa los datos de demostración indicados abajo.'; err.hidden = false; return; }
    try { sessionStorage.setItem('vs_auth', '1'); sessionStorage.setItem('vs_t0', String(Date.now())); } catch (x) { /* noop */ }
    const b = $('#loginBtn'); b.disabled = true; b.textContent = 'Accediendo…';
    setTimeout(() => { location.href = 'index.html'; }, 450);
  });
})();
