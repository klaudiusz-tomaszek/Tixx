/* =====================================================================
   Tixx – utils.js
   Helpery współdzielone przez wszystkie widoki.
   ===================================================================== */

// ── Mapy kolorów ─────────────────────────────────────────────────────
const PRIORITY_BADGE = {
  critical : 'bg-red-lt text-red border-red-subtle',
  high     : 'bg-orange-lt text-orange border-orange-subtle',
  medium   : 'bg-azure-lt text-azure border-azure-subtle',
  low      : 'bg-green-lt text-green border-green-subtle',
};

const STATUS_BADGE = {
  new             : 'bg-blue-lt text-blue',
  open            : 'bg-green-lt text-green',
  in_progress     : 'bg-yellow-lt text-yellow',
  pending         : 'bg-orange-lt text-orange',
  waiting_on_user : 'bg-purple-lt text-purple',
  resolved        : 'bg-teal-lt text-teal',
  closed          : 'bg-secondary-lt text-secondary',
  rejected        : 'bg-danger-lt text-danger',
};

// ── Generatory badge'y ────────────────────────────────────────────────
function priorityBadge(code, name) {
  const key = (code || '').toString().toLowerCase();
  const cls = PRIORITY_BADGE[key] || 'bg-secondary-lt';
  return `<span class="badge ${cls}">${name || code}</span>`;
}

function statusBadge(code, name) {
  const key = (code || '').toString().toLowerCase();
  const cls = STATUS_BADGE[key] || 'bg-secondary-lt';
  return `<span class="badge ${cls}">${name || code}</span>`;
}

// ── Bezpieczne formatowanie tekstu (Escape HTML) ──────────────────────
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Inicjały dla awatarów ─────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

// ── Formatowanie daty ─────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '–';
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

// ── Wspólne helpery do generowania wierszy tabel ──────────────────────
function tableLoadingRow(cols) {
  return `<tr><td colspan="${cols}" class="text-center text-muted py-4">
    <span class="spinner-border spinner-border-sm me-2"></span>Ładowanie…</td></tr>`;
}

function tableEmptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="text-center text-muted py-4">
    <i class="ti ti-inbox me-2"></i>${msg}</td></tr>`;
}

function tableErrorRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="text-center text-danger py-4">
    <i class="ti ti-alert-triangle me-2"></i>${msg}</td></tr>`;
}

function setTextById(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// Inicjalizacja motywu
initTheme();
