/* =====================================================================
   Tixx – views/tickets.js
   Logika widoku Zgłoszenia: pełna tabela + filtry.
   Zależności: utils.js, api.js, ticket-detail.js
   ===================================================================== */

// ── Załaduj i wyrenderuj tabelę zgłoszeń ─────────────────────────────
async function loadTickets() {
  const tbody = document.getElementById('tickets-body');
  if (!tbody) return;
  tbody.innerHTML = tableLoadingRow(10);

  const status   = document.getElementById('filter-status')?.value || '';
  const priority = document.getElementById('filter-priority')?.value || '';
  const limit    = document.getElementById('filter-limit')?.value || '50';

  try {
    const data = await API.getTickets({ status, priority, limit });
    const countEl = document.getElementById('tickets-count');
    if (countEl) countEl.textContent = data.count;

    if (!data.tickets.length) {
      tbody.innerHTML = tableEmptyRow(10, 'Brak zgłoszeń spełniających kryteria');
      return;
    }

    tbody.innerHTML = data.tickets.map(_ticketRow).join('');

  } catch (err) {
    tbody.innerHTML = tableErrorRow(10, err.message);
  }
}

// ── Reset filtrów ─────────────────────────────────────────────────────
function resetFilters() {
  const statusEl = document.getElementById('filter-status');
  const priEl    = document.getElementById('filter-priority');
  const limEl    = document.getElementById('filter-limit');
  if (statusEl) statusEl.value = '';
  if (priEl) priEl.value = '';
  if (limEl) limEl.value = '50';
  loadTickets();
}

// ── Prywatne helpery ──────────────────────────────────────────────────
function _ticketRow(t) {
  return `
    <tr class="ticket-table-row" onclick="navigateTo('/tickets/${t.id}')">
      <td>
        <a href="/tickets/${t.id}" class="text-decoration-none">
          <code class="small fw-bold">${t.ticket_number}</code>
        </a>
      </td>
      <td>
        <div class="fw-medium ticket-title-link">${escapeHtml(t.title)}</div>
        <div class="text-muted small text-truncate" style="max-width:300px;">${escapeHtml(t.description)}</div>
      </td>
      <td><span class="text-muted small">${escapeHtml(t.category_name)}</span></td>
      <td>${priorityBadge(t.priority_code, t.priority_name)}</td>
      <td>${statusBadge(t.status_code, t.status_name)}</td>
      <td>
        <div class="small fw-medium">${escapeHtml(t.reporter_name)}</div>
        <div class="text-muted" style="font-size:.7rem;">${escapeHtml(t.reporter_department || '')}</div>
      </td>
      <td>
        ${t.assignee_name
          ? `<div class="small">${escapeHtml(t.assignee_name)}</div>`
          : `<span class="text-muted small"><i class="ti ti-user-off me-1"></i>Nieprzypisany</span>`}
      </td>
      <td>
        <span class="badge bg-secondary-lt">
          <i class="ti ti-message me-1"></i>${t.comments_count}
        </span>
      </td>
      <td><span class="text-muted small">${fmtDate(t.created_at)}</span></td>
      <td class="text-end" onclick="event.stopPropagation()">
        <a href="/tickets/${t.id}" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
           title="Otwórz podgląd zgłoszenia">
          <i class="ti ti-eye"></i>
          <span class="d-none d-md-inline">Podgląd</span>
        </a>
      </td>
    </tr>`;
}
