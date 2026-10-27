/* =====================================================================
   Tixx – utils.js
   Helpery współdzielone przez wszystkie widoki.
   ===================================================================== */

// ── Mapy kolorów ─────────────────────────────────────────────────────
const PRIORITY_BADGE = {
  critical : 'bg-red-lt text-red',
  high     : 'bg-orange-lt text-orange',
  medium   : 'bg-yellow-lt text-yellow',
  low      : 'bg-cyan-lt text-cyan',
};

const STATUS_BADGE = {
  new         : 'bg-blue-lt',
  open        : 'bg-green-lt',
  in_progress : 'bg-yellow-lt',
  pending     : 'bg-orange-lt',
  resolved    : 'bg-teal-lt',
  closed      : 'bg-secondary-lt',
};

// ── Generatory badge'y ────────────────────────────────────────────────
function priorityBadge(code, name) {
  const cls = PRIORITY_BADGE[code] || 'bg-secondary-lt';
  return `<span class="badge ${cls}">${name || code}</span>`;
}

function statusBadge(code, name) {
  const cls = STATUS_BADGE[code] || 'bg-secondary-lt';
  return `<span class="badge ${cls}">${name || code}</span>`;
}

// ── Formatowanie daty ─────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL') + ' ' +
         d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

// ── Przełącznik motywu dark / light (domyślnie jasny / biały) ──────
function setTheme(theme) {
  const html = document.documentElement;
  html.setAttribute('data-bs-theme', theme);
  try {
    localStorage.setItem('tixx-theme', theme);
  } catch (e) {
    /* ignore storage errors */
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  let theme = 'light';
  try {
    theme = localStorage.getItem('tixx-theme') || 'light';
  } catch (e) {
    theme = 'light';
  }
  setTheme(theme);
}

// Inicjalizacja motywu
initTheme();

