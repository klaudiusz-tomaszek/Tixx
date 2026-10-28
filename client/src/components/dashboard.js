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
    const data = await API.getTickets({ limit: 8 });

    const openCount = data.tickets.filter(t => !t.is_closed).length;
    setTextById('stat-open-tickets', openCount);
    setTextById('badge-tickets', openCount);

    buildStatusStats(data.tickets);

    if (!data.tickets.length) {
      tbody.innerHTML = tableEmptyRow(5, 'Brak zgłoszeń');
      return;
    }

    tbody.innerHTML = data.tickets.map(t => `
      <tr class="ticket-table-row" onclick="viewTicket(${t.id})">
        <td>
          <a href="#ticket-${t.id}" onclick="event.preventDefault(); event.stopPropagation(); viewTicket(${t.id});" class="text-decoration-none">
            <span class="font-monospace small fw-bold">${t.ticket_number}</span>
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
function buildStatusStats(tickets) {
  const counts = {};
  tickets.forEach(t => {
    const key = t.status_name || t.status_code;
    if (!counts[key]) counts[key] = { count: 0, code: t.status_code };
    counts[key].count++;
  });

  const ul = document.getElementById('status-stats');
  if (!ul) return;
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
