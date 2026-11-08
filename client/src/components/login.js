/* =====================================================================
   Tixx – components/login.js
   Logika strony logowania (/login).
   Zależności: utils.js, api.js
   ===================================================================== */

/**
 * Adres powrotu po zalogowaniu – tylko ścieżki w obrębie aplikacji (ochrona przed open redirect)
 */
function _loginNextUrl() {
  const next = new URLSearchParams(window.location.search).get('next') || '/';
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/login')) {
    return '/';
  }
  return next;
}

function _showLoginError(message) {
  const alertEl = document.getElementById('login-alert');
  if (!alertEl) return;
  alertEl.innerHTML = `<div class="d-flex align-items-center"><i class="ti ti-alert-circle fs-3 me-2"></i><div>${escapeHtml(message)}</div></div>`;
  alertEl.classList.remove('d-none');
}

function _clearLoginError() {
  setVisible('login-alert', false);
}

async function submitLogin(event) {
  event.preventDefault();
  _clearLoginError();

  const emailEl    = document.getElementById('login-email');
  const passwordEl = document.getElementById('login-password');
  const rememberEl = document.getElementById('login-remember');
  const submitBtn  = document.getElementById('login-submit');

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email) {
    _showLoginError('Podaj adres e-mail.');
    emailEl.focus();
    return;
  }
  if (!password) {
    _showLoginError('Podaj hasło.');
    passwordEl.focus();
    return;
  }

  const restoreButton = setButtonBusy(submitBtn, 'Logowanie…');

  try {
    await API.login({ email, password, remember: rememberEl.checked });
    window.location.replace(_loginNextUrl());
  } catch (err) {
    _showLoginError(err.message || 'Nie udało się zalogować.');
    passwordEl.value = '';
    passwordEl.focus();
    restoreButton();
  }
}

function togglePasswordVisibility(event) {
  event.preventDefault();
  const input = document.getElementById('login-password');
  const toggle = document.getElementById('login-password-toggle');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  toggle.innerHTML = `<i class="ti ${show ? 'ti-eye-off' : 'ti-eye'} fs-3"></i>`;
  const label = show ? 'Ukryj hasło' : 'Pokaż hasło';
  toggle.setAttribute('title', label);
  toggle.setAttribute('aria-label', label);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('login-form')?.addEventListener('submit', submitLogin);
  document.getElementById('login-password-toggle')?.addEventListener('click', togglePasswordVisibility);

  // Użytkownik z ważną sesją nie musi logować się ponownie
  try {
    await API.getCurrentUser();
    window.location.replace(_loginNextUrl());
  } catch (_) {
    /* brak sesji – zostajemy na stronie logowania */
  }
});
