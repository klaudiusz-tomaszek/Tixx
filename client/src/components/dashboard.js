/* =====================================================================
   Tixx – views/dashboard.js
   Logika widoku Dashboard: kafelki statystyczne + ostatnie zgłoszenia.
   Zależności: utils.js, api.js, ticket-detail.js
   ===================================================================== */

// ── Ostatnie zgłoszenia (mini tabela na dashboardzie) ─────────────────
async function loadRecentTickets() {
  const tbody = document.getElementById('recent-tickets-body');
  if (!tbody) return;
  tbody.innerHTML = tableLoadingRow(5);

  try {
    const [data, stats] = await Promise.all([
      API.getTickets({ limit: 8 }),
      API.getTicketStats(),
    ]);

    setTextById('stat-open-tickets', stats.open);
    buildStatusStats(stats.by_status);

    if (!data.tickets.length) {
      tbody.innerHTML = tableEmptyRow(5, 'Brak zgłoszeń');
      return;
    }

    tbody.innerHTML = data.tickets.map(t => `
      <tr class="ticket-table-row" onclick="navigateTo('/tickets/${t.id}')">
        <td>
          <a href="/tickets/${t.id}" class="text-decoration-none">
            <span class="font-monospace small fw-bold">${escapeHtml(t.ticket_number)}</span>
          </a>
        </td>
        <td>
          <div class="fw-medium text-truncate ticket-title-link" style="max-width:260px;" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>
          <div class="text-muted small">${escapeHtml(t.category_name)}</div>
        </td>
        <td>${priorityBadge(t.priority_code, t.priority_name)}</td>
        <td>${statusBadge(t.status_code, t.status_name)}</td>
        <td><span class="text-muted small">${fmtDate(t.created_at)}</span></td>
      </tr>`).join('');

  } catch (err) {
    tbody.innerHTML = tableErrorRow(5, err.message);
  }
}

// ── Lista statystyk wg statusu (lewy panel) ───────────────────────────
function buildStatusStats(byStatus) {
  const ul = document.getElementById('status-stats');
  if (!ul) return;

  const rows = byStatus.filter(s => s.count > 0);
  if (!rows.length) {
    ul.innerHTML = `<li class="list-group-item text-muted small py-3">Brak danych</li>`;
    return;
  }

  ul.innerHTML = rows.map(s => `
    <li class="list-group-item d-flex align-items-center py-2 gap-2">
      ${statusBadge(s.status_code, s.status_name)}
      <span class="ms-auto fw-semibold">${s.count}</span>
    </li>`).join('');
}
