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
function _badge(colorMap, code, name) {
  const cls = colorMap[String(code || '').toLowerCase()] || 'bg-secondary-lt';
  return `<span class="badge ${cls}">${escapeHtml(name || code)}</span>`;
}

function priorityBadge(code, name) {
  return _badge(PRIORITY_BADGE, code, name);
}

function statusBadge(code, name) {
  return _badge(STATUS_BADGE, code, name);
}

// ── Bezpieczne formatowanie tekstu (Escape HTML) ──────────────────────
// Przyjmuje dowolną wartość (np. liczbę); null/undefined → pusty tekst
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Użytkownicy ───────────────────────────────────────────────────────
function fullName(user) {
  return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}

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

// ── Przełącznik motywu dark / light (domyślnie jasny) ─────────────────
function setTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
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
    /* ignore storage errors */
  }
  setTheme(theme);
}

// ── Wiersze tabel: ładowanie / brak danych / błąd ─────────────────────
function _tableMessageRow(cols, html, textClass = 'text-muted') {
  return `<tr><td colspan="${cols}" class="text-center ${textClass} py-4">${html}</td></tr>`;
}

function tableLoadingRow(cols) {
  return _tableMessageRow(cols, '<span class="spinner-border spinner-border-sm me-2"></span>Ładowanie…');
}

function tableEmptyRow(cols, msg) {
  return _tableMessageRow(cols, `<i class="ti ti-inbox me-2"></i>${escapeHtml(msg)}`);
}

function tableErrorRow(cols, msg) {
  return _tableMessageRow(cols, `<i class="ti ti-alert-triangle me-2"></i>${escapeHtml(msg)}`, 'text-danger');
}

// ── Drobne operacje na DOM ────────────────────────────────────────────
function setTextById(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/**
 * Pokazuje lub ukrywa element (klasa d-none). Przyjmuje element albo jego id.
 */
function setVisible(elOrId, visible) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (el) el.classList.toggle('d-none', !visible);
}

/**
 * Wypełnia <select> opcjami i zachowuje bieżący wybór, jeśli nadal istnieje.
 * @param {HTMLSelectElement|string} selectOrId
 * @param {Array} items
 * @param {object} opts
 *   placeholder – tekst pustej opcji na początku (pomijana, gdy brak)
 *   value(item) – wartość opcji (domyślnie item.id)
 *   label(item) – tekst opcji (domyślnie item.name)
 *   attrs(item) – dodatkowe atrybuty HTML opcji (np. data-code="…")
 */
function fillSelect(selectOrId, items, { placeholder, value = i => i.id, label = i => i.name, attrs = () => '' } = {}) {
  const select = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
  if (!select || !Array.isArray(items)) return;

  const current = select.value;
  const placeholderHtml = placeholder !== undefined ? `<option value="">${escapeHtml(placeholder)}</option>` : '';
  select.innerHTML = placeholderHtml + items.map(item =>
    `<option value="${escapeHtml(value(item))}" ${attrs(item)}>${escapeHtml(label(item))}</option>`
  ).join('');
  select.value = current;
}

/**
 * Blokuje przycisk i pokazuje spinner z tekstem. Zwraca funkcję przywracającą poprzedni wygląd.
 *   const restore = setButtonBusy(btn, 'Zapisywanie…'); … restore();
 */
function setButtonBusy(button, busyText) {
  if (!button) return () => {};
  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span><span>${escapeHtml(busyText)}</span>`;
  return () => {
    button.disabled = false;
    button.innerHTML = originalHtml;
  };
}

// Inicjalizacja motywu
initTheme();
