/* =====================================================================
   Tixx – views/dashboard.js
   Logika widoku Dashboard: kafelki statystyczne + ostatnie zgłoszenia.
   Zależności: utils.js, api.js
   ===================================================================== */

// ── Ostatnie zgłoszenia (mini tabela na dashboardzie) ─────────────────
async function loadRecentTickets() {
  const tbody = document.getElementById('recent-tickets-body');
  tbody.innerHTML = _loadingRow(5);

  try {
    const data = await API.getTickets({ limit: 8 });

    const openCount = data.tickets.filter(t => !t.is_closed).length;
    _setText('stat-open-tickets', openCount);
    _setText('badge-tickets', openCount);

    buildStatusStats(data.tickets);

    if (!data.tickets.length) {
      tbody.innerHTML = _emptyRow(5, 'Brak zgłoszeń');
      return;
    }

    tbody.innerHTML = data.tickets.map(t => `
      <tr>
        <td><span class="text-muted font-monospace small">${t.ticket_number}</span></td>
        <td>
          <div class="fw-medium text-truncate" style="max-width:260px;" title="${t.title}">${t.title}</div>
          <div class="text-muted small">${t.category_name}</div>
        </td>
        <td>${priorityBadge(t.priority_code, t.priority_name)}</td>
        <td>${statusBadge(t.status_code, t.status_name)}</td>
        <td><span class="text-muted small">${fmtDate(t.created_at)}</span></td>
      </tr>`).join('');

  } catch (err) {
    tbody.innerHTML = _errorRow(5, err.message);
  }
}

// ── Lista statystyk wg statusu (lewy panel) ───────────────────────────
function buildStatusStats(tickets) {
  const counts = {};
  tickets.forEach(t => {
    const key = t.status_name || t.status_code;
    if (!counts[key]) counts[key] = { count: 0, code: t.status_code };
    counts[key].count++;
  });

  const ul = document.getElementById('status-stats');
  if (!Object.keys(counts).length) {
    ul.innerHTML = `<li class="list-group-item text-muted small py-3">Brak danych</li>`;
    return;
  }

  ul.innerHTML = Object.entries(counts).map(([name, obj]) => `
    <li class="list-group-item d-flex align-items-center py-2 gap-2">
      ${statusBadge(obj.code, name)}
      <span class="ms-auto fw-semibold">${obj.count}</span>
    </li>`).join('');
}

// ── Prywatne helpery HTML ─────────────────────────────────────────────
function _loadingRow(cols) {
  return `<tr><td colspan="${cols}" class="text-center text-muted py-4">
    <span class="spinner-border spinner-border-sm me-2"></span>Ładowanie…</td></tr>`;
}
function _emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="text-center text-muted py-4">
    <i class="ti ti-inbox me-2"></i>${msg}</td></tr>`;
}
function _errorRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="text-center text-danger py-4">
    <i class="ti ti-alert-triangle me-2"></i>${msg}</td></tr>`;
}
function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

