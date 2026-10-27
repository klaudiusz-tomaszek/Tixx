/* =====================================================================
   Tixx – views/tickets.js
   Logika widoku Zgłoszenia: pełna tabela + filtry.
   Zależności: utils.js, api.js
   ===================================================================== */

// ── Załaduj i wyrenderuj tabelę zgłoszeń ─────────────────────────────
async function loadTickets() {
  const tbody = document.getElementById('tickets-body');
  tbody.innerHTML = _ticketsLoadingRow();

  const status   = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const limit    = document.getElementById('filter-limit').value;

  try {
    const data = await API.getTickets({ status, priority, limit });
    document.getElementById('tickets-count').textContent = data.count;

    if (!data.tickets.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5">
        <i class="ti ti-inbox me-2"></i>Brak zgłoszeń spełniających kryteria</td></tr>`;
      return;
    }

    tbody.innerHTML = data.tickets.map(_ticketRow).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-5">
      <i class="ti ti-alert-triangle me-2"></i>${err.message}</td></tr>`;
  }
}

// ── Reset filtrów ─────────────────────────────────────────────────────
function resetFilters() {
  document.getElementById('filter-status').value   = '';
  document.getElementById('filter-priority').value = '';
  document.getElementById('filter-limit').value    = '50';
  loadTickets();
}

// ── Prywatne helpery ──────────────────────────────────────────────────
function _ticketRow(t) {
  return `
    <tr>
      <td><code class="small">${t.ticket_number}</code></td>
      <td>
        <div class="fw-medium">${t.title}</div>
        <div class="text-muted small text-truncate" style="max-width:320px;">${t.description}</div>
      </td>
      <td><span class="text-muted small">${t.category_name}</span></td>
      <td>${priorityBadge(t.priority_code, t.priority_name)}</td>
      <td>${statusBadge(t.status_code, t.status_name)}</td>
      <td>
        <div class="small">${t.reporter_name}</div>
        <div class="text-muted" style="font-size:.7rem;">${t.reporter_department || ''}</div>
      </td>
      <td>
        ${t.assignee_name
          ? `<div class="small">${t.assignee_name}</div>`
          : `<span class="text-muted small"><i class="ti ti-user-off me-1"></i>Nieprzypisany</span>`}
      </td>
      <td>
        <span class="badge bg-secondary-lt">
          <i class="ti ti-message me-1"></i>${t.comments_count}
        </span>
      </td>
      <td><span class="text-muted small">${fmtDate(t.created_at)}</span></td>
    </tr>`;
}

function _ticketsLoadingRow() {
  return `<tr><td colspan="9" class="text-center text-muted py-5">
    <span class="spinner-border spinner-border-sm me-2"></span>Ładowanie zgłoszeń…</td></tr>`;
}

