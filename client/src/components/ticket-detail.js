/* =====================================================================
   Tixx – views/ticket-detail.js
   Logika widoku podglądu szczegółów pojedynczego zgłoszenia (Ticket Detail).
   Zależności: utils.js, api.js, App.js
   ===================================================================== */

let currentTicketId = null;
let currentAssigneeId = null;

const ROLE_LABELS = { admin: 'Administrator', support: 'Wsparcie IT' };

/**
 * Otwiera podgląd zgłoszenia (wywoływane przez router dla /tickets/:id)
 */
async function viewTicket(id) {
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) return;
  currentTicketId = ticketId;

  setVisible('td-loading', true);
  setVisible('td-error', false);
  setVisible('td-content', false);

  try {
    await _fetchAndRenderTicket(ticketId);
    setVisible('td-content', true);
  } catch (err) {
    setVisible('td-error', true);
    setTextById('td-error-msg', err.message || 'Wystąpił błąd podczas ładowania zgłoszenia.');
  } finally {
    setVisible('td-loading', false);
  }
}

/**
 * Odświeżenie aktualnie otwartego zgłoszenia (przycisk „Odśwież”)
 */
async function refreshTicketDetail() {
  if (currentTicketId) {
    await viewTicket(currentTicketId);
  }
}

/**
 * Pobiera zgłoszenie oraz słowniki statusów i priorytetów (do dropdownów) i renderuje widok.
 * Brak słowników nie blokuje podglądu – dropdowny pokażą wtedy komunikat.
 */
async function _fetchAndRenderTicket(ticketId) {
  const [data, statuses, priorities] = await Promise.all([
    API.getTicketById(ticketId),
    API.getStatuses().catch(() => []),
    API.getPriorities().catch(() => []),
  ]);
  renderTicketDetail(data.ticket, data.comments || [], { statuses, priorities });
}

/**
 * Wspólna ścieżka dla zmian zgłoszenia (status, priorytet, opiekun, komentarz):
 * po zapisie przeładowuje widok i liczniki na dashboardzie.
 */
async function _reloadCurrentTicket() {
  await _fetchAndRenderTicket(currentTicketId);
  if (typeof loadRecentTickets === 'function') loadRecentTickets();
}

async function _applyTicketChange(saveChange, errorPrefix) {
  if (!currentTicketId) return;
  try {
    await saveChange();
    await _reloadCurrentTicket();
  } catch (err) {
    alert(`${errorPrefix}: ${err.message}`);
  }
}

/**
 * Wyrenderowanie danych zgłoszenia i komentarzy w widoku
 */
function renderTicketDetail(ticket, comments, { statuses, priorities }) {
  // Breadcrumb i nagłówek karty
  const breadcrumbLabel = document.getElementById('breadcrumb-current-label');
  if (breadcrumbLabel) {
    breadcrumbLabel.innerHTML = `<span class="font-monospace fw-bold">${escapeHtml(ticket.ticket_number)}</span>`;
  }
  setTextById('td-card-number', ticket.ticket_number);
  setTextById('td-body-title', ticket.title);
  setTextById('td-description', ticket.description);

  // Zgłaszający i data utworzenia
  setTextById('td-reporter-avatar', getInitials(ticket.reporter_name));
  setTextById('td-reporter-header-name', ticket.reporter_name);
  setTextById('td-reporter-dept-header', ticket.reporter_department || '');
  setVisible('td-reporter-dept-header', Boolean(ticket.reporter_department));
  setTextById('td-created-at-header', fmtDate(ticket.created_at));

  const reporterEmailEl = document.getElementById('td-reporter-email-header');
  if (reporterEmailEl) {
    reporterEmailEl.innerHTML = ticket.reporter_email
      ? `<i class="ti ti-mail me-1"></i><a href="mailto:${escapeHtml(ticket.reporter_email)}" class="text-reset text-decoration-none">${escapeHtml(ticket.reporter_email)}</a>`
      : '';
  }

  // SLA, status i priorytet
  renderSLAProgress(ticket);
  document.getElementById('td-status-badge').innerHTML = statusBadge(ticket.status_code, ticket.status_name);
  document.getElementById('td-priority-badge').innerHTML = priorityBadge(ticket.priority_code, ticket.priority_name);

  _renderChangeDropdown('td-status-dropdown', statuses, ticket.status_code, {
    emptyText: 'Brak dostępnych statusów',
    onSelect: 'changeTicketStatus',
    label: s => `<span>${escapeHtml(s.name)}</span>`,
  });
  _renderChangeDropdown('td-priority-dropdown', priorities, ticket.priority_code, {
    emptyText: 'Brak dostępnych priorytetów',
    onSelect: 'changeTicketPriority',
    label: p => priorityBadge(p.code, p.name),
  });

  _renderAssignee(ticket);
  renderCommentsList(comments);
}

/**
 * Lista opcji zmiany (statusu / priorytetu) z zaznaczeniem bieżącej wartości
 * @param {string} onSelect – nazwa globalnej funkcji wywoływanej z id wybranej pozycji
 */
function _renderChangeDropdown(dropdownId, items, currentCode, { emptyText, onSelect, label }) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  if (!items.length) {
    dropdown.innerHTML = `<li><span class="dropdown-item text-muted small">${escapeHtml(emptyText)}</span></li>`;
    return;
  }

  const current = String(currentCode || '').toLowerCase();
  dropdown.innerHTML = items.map(item => {
    const isCurrent = String(item.code || '').toLowerCase() === current;
    return `
      <li>
        <a class="dropdown-item d-flex align-items-center justify-content-between ${isCurrent ? 'active' : ''}"
           href="#" onclick="event.preventDefault(); ${onSelect}(${item.id});">
          ${label(item)}
          ${isCurrent ? '<i class="ti ti-check ms-2"></i>' : ''}
        </a>
      </li>`;
  }).join('');
}

/**
 * Karta opiekuna zgłoszenia (przypisany / nieprzypisany)
 */
function _renderAssignee(ticket) {
  currentAssigneeId = ticket.assignee_id || null;
  toggleAssigneeEdit(false);

  const avatar = document.getElementById('td-assignee-avatar');
  const nameEl = document.getElementById('td-assignee-name');
  const emailEl = document.getElementById('td-assignee-email');
  const deptEl = document.getElementById('td-assignee-dept');
  const assigned = Boolean(ticket.assignee_name);

  if (avatar) {
    avatar.className = assigned
      ? 'avatar avatar-md rounded-circle bg-purple-lt text-purple fw-bold fs-3'
      : 'avatar avatar-md rounded-circle bg-secondary-lt text-secondary';
    avatar.innerHTML = assigned ? escapeHtml(getInitials(ticket.assignee_name)) : '<i class="ti ti-user-off fs-3"></i>';
  }
  if (nameEl) {
    nameEl.innerHTML = assigned ? escapeHtml(ticket.assignee_name) : '<span class="text-muted">Nieprzypisany</span>';
  }
  if (emailEl) {
    if (!assigned) {
      emailEl.textContent = 'Oczekuje na przypisanie';
    } else if (ticket.assignee_email) {
      emailEl.innerHTML = `<a href="mailto:${escapeHtml(ticket.assignee_email)}" class="text-reset">${escapeHtml(ticket.assignee_email)}</a>`;
    } else {
      emailEl.textContent = 'Brak adresu e-mail';
    }
  }
  if (deptEl) {
    deptEl.textContent = assigned ? 'Dedykowany opiekun' : 'Brak opiekuna';
    deptEl.className = `badge ${assigned ? 'bg-purple-lt' : 'bg-secondary-lt'} mt-1 small`;
  }
}

/**
 * Renderowanie komentarzy w osi czasu
 */
function renderCommentsList(comments) {
  const container = document.getElementById('td-comments-list');
  setTextById('td-comments-badge', comments.length);
  setVisible('td-no-comments', comments.length === 0);

  container.innerHTML = comments.map(c => {
    const isInternal = Boolean(c.is_internal);
    const authorName = c.author_name || 'Użytkownik';

    return `
      <div class="ticket-comment-card ${isInternal ? 'is-internal' : ''}">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="d-flex align-items-center gap-2">
            <span class="avatar avatar-xs rounded-circle ${isInternal ? 'bg-warning-lt text-warning' : 'bg-primary-lt text-primary'}">
              ${escapeHtml(getInitials(authorName))}
            </span>
            <div>
              <span class="fw-semibold text-reset small">${escapeHtml(authorName)}</span>
              ${c.author_email ? `<span class="text-muted small ms-1">&lt;${escapeHtml(c.author_email)}&gt;</span>` : ''}
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            ${isInternal ? '<span class="badge bg-warning-lt text-warning" title="Widoczne tylko dla pracowników wsparcia"><i class="ti ti-lock me-1"></i>Notatka wewnętrzna</span>' : ''}
            <span class="text-muted small"><i class="ti ti-clock me-1"></i>${fmtDate(c.created_at)}</span>
          </div>
        </div>
        <div class="ticket-comment-text text-secondary" style="white-space: pre-wrap; font-size: .9125rem; line-height: 1.55;">${escapeHtml(c.message)}</div>
      </div>`;
  }).join('');
}

/**
 * Wysłanie nowego komentarza (autora ustala serwer na podstawie sesji)
 */
async function submitTicketComment() {
  const textInput = document.getElementById('td-new-comment-text');
  const internalInput = document.getElementById('td-is-internal');
  const alertEl = document.getElementById('td-comment-alert');

  const message = textInput.value.trim();
  if (!message) {
    alertEl.textContent = 'Wprowadź treść wiadomości przed wysłaniem.';
    setVisible(alertEl, true);
    return;
  }

  setVisible(alertEl, false);
  const restoreButton = setButtonBusy(document.getElementById('td-comment-submit-btn'), 'Wysyłanie…');

  try {
    await API.addComment(currentTicketId, { message, is_internal: internalInput.checked });
    textInput.value = '';
    internalInput.checked = false;
    await _reloadCurrentTicket();
  } catch (err) {
    alertEl.textContent = err.message || 'Nie udało się dodać komentarza.';
    setVisible(alertEl, true);
  } finally {
    restoreButton();
  }
}

function changeTicketStatus(statusId) {
  return _applyTicketChange(() => API.updateTicketStatus(currentTicketId, statusId), 'Błąd podczas zmiany statusu');
}

function changeTicketPriority(priorityId) {
  return _applyTicketChange(() => API.updateTicketPriority(currentTicketId, priorityId), 'Błąd podczas zmiany priorytetu');
}

/* ---------------------------------------------------------------------
   Opiekun zgłoszenia
   --------------------------------------------------------------------- */

async function populateAssigneeSelect(selectedId) {
  const select = document.getElementById('td-assignee-select');
  if (!select) return;

  const users = await API.getUsers().catch(err => {
    console.error('Błąd pobierania użytkowników:', err);
    return [];
  });

  fillSelect(select, users, {
    placeholder: '— Brak przypisania (usuń) —',
    label: u => {
      const role = ROLE_LABELS[u.role_name] ? ` [${ROLE_LABELS[u.role_name]}]` : '';
      const dept = u.department ? ` (${u.department})` : '';
      return fullName(u) + role + dept;
    },
  });
  select.value = selectedId ? String(selectedId) : '';
}

/**
 * Przełączanie trybu edycji opiekuna (bez argumentu – przełącza; true/false – wymusza stan)
 */
function toggleAssigneeEdit(forceState) {
  const formEl = document.getElementById('td-assignee-form');
  if (!formEl) return;

  const showForm = typeof forceState === 'boolean' ? forceState : formEl.classList.contains('d-none');
  setVisible(formEl, showForm);
  setVisible('td-assignee-display', !showForm);
  setVisible('td-btn-toggle-assignee', !showForm);
  if (showForm) populateAssigneeSelect(currentAssigneeId);
}

async function saveAssigneeChange() {
  const selectedVal = document.getElementById('td-assignee-select')?.value || '';
  const newAssigneeId = selectedVal ? parseInt(selectedVal, 10) : null;
  const restoreButton = setButtonBusy(document.getElementById('td-btn-save-assignee'), 'Zapisywanie…');

  await _applyTicketChange(() => API.updateTicketAssignee(currentTicketId, newAssigneeId), 'Błąd podczas zmiany opiekuna');
  restoreButton();
  toggleAssigneeEdit(false);
}

/**
 * Szybkie przypisanie zgłoszenia do zalogowanego użytkownika
 */
async function assignToMe() {
  const select = document.getElementById('td-assignee-select');
  if (!select || !currentUser) return;
  // Opcja może nie istnieć, jeśli zalogowany użytkownik nie jest technikiem IT
  if (![...select.options].some(o => o.value === String(currentUser.id))) {
    alert('Tylko członkowie zespołu IT mogą przypisywać zgłoszenia do siebie.');
    return;
  }
  select.value = String(currentUser.id);
  await saveAssigneeChange();
}

/* ---------------------------------------------------------------------
   SLA – czas podjęcia i czas rozwiązania
   --------------------------------------------------------------------- */

/**
 * Formatowanie czasu trwania (np. 45 min, 2h, 2h 15 min)
 */
function formatSlaDuration(ms) {
  if (ms <= 0) return '0 min';
  const totalMinutes = Math.max(1, Math.round(ms / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes} min`;
}

/**
 * Renderuje jeden licznik SLA (pasek, badge, opis) i zwraca jego stan:
 * 'met' | 'breached' (zakończony), 'running' | 'warning' | 'overdue' (w toku).
 *
 * @param {string} kind – 'response' albo 'resolution' (część id elementów td-sla-<kind>-…)
 * @param {object} cfg
 *   limitHours    – limit SLA w godzinach
 *   startMs       – początek odliczania (utworzenie zgłoszenia)
 *   doneAtMs      – moment zakończenia albo null, gdy nadal trwa
 *   doneLabel     – opis czasu dla zakończonego licznika (np. „Podjęto po”)
 *   warnAtPercent – od ilu procent limitu pokazujemy ostrzeżenie
 *   warning       – { icon, label } dla stanu ostrzeżenia
 *   runningIcon   – ikona stanu „W toku”
 */
function _renderSlaTimer(kind, { limitHours, startMs, doneAtMs, doneLabel, warnAtPercent, warning, runningIcon }) {
  const limitMs = limitHours * 3600 * 1000;
  let state, barPercent, elapsedText;

  if (doneAtMs !== null) {
    const duration = Math.max(0, doneAtMs - startMs);
    state = duration <= limitMs ? 'met' : 'breached';
    barPercent = 100;
    elapsedText = `${doneLabel}: ${formatSlaDuration(duration)}`;
  } else {
    const elapsed = Math.max(0, Date.now() - startMs);
    const percent = Math.min(100, Math.round((elapsed / limitMs) * 100));
    if (elapsed > limitMs) {
      state = 'overdue';
      barPercent = 100;
      elapsedText = `Po terminie o: ${formatSlaDuration(elapsed - limitMs)}`;
    } else {
      state = percent >= warnAtPercent ? 'warning' : 'running';
      barPercent = state === 'warning' ? percent : Math.max(5, percent); // min. 5%, żeby pasek był widoczny
      elapsedText = `Pozostało: ${formatSlaDuration(limitMs - elapsed)}`;
    }
  }

  const look = {
    met:      { color: 'success', icon: 'ti-check',          label: 'Dotrzymane' },
    breached: { color: 'danger',  icon: 'ti-alert-triangle', label: 'Przekroczone' },
    overdue:  { color: 'danger',  icon: 'ti-alert-circle',   label: 'Przekroczone' },
    warning:  { color: 'warning', ...warning },
    running:  { color: 'primary', icon: runningIcon,         label: 'W toku' },
  }[state];

  const barEl = document.getElementById(`td-sla-${kind}-bar`);
  if (barEl) {
    barEl.style.width = `${barPercent}%`;
    barEl.className = `progress-bar bg-${look.color}`;
  }
  const statusEl = document.getElementById(`td-sla-${kind}-status`);
  if (statusEl) {
    statusEl.className = `badge bg-${look.color}-lt text-${look.color}`;
    statusEl.innerHTML = `<i class="ti ${look.icon} me-1"></i>${look.label}`;
  }
  setTextById(`td-sla-${kind}-elapsed`, elapsedText);
  setTextById(`td-sla-${kind}-limit`, `Limit: ${limitHours}h`);

  return state;
}

/**
 * Paski SLA i zbiorczy badge w nagłówku.
 * Limity (w godzinach) pochodzą ze słownika priorytetów w bazie (v_tickets_overview).
 */
function renderSLAProgress(ticket) {
  const startMs = new Date(ticket.created_at).getTime();

  // Podjęcie = moment pierwszej reakcji zapisany przez serwer
  // (pierwsza zmiana statusu z NEW lub pierwsze przypisanie opiekuna)
  const responseState = _renderSlaTimer('response', {
    limitHours: Number(ticket.sla_response_hours),
    startMs,
    doneAtMs: ticket.first_response_at ? new Date(ticket.first_response_at).getTime() : null,
    doneLabel: 'Podjęto po',
    warnAtPercent: 75,
    warning: { icon: 'ti-clock-pause', label: 'Kończy się czas' },
    runningIcon: 'ti-clock-play',
  });

  const isResolved = Boolean(ticket.is_closed || ticket.resolved_at ||
    ['RESOLVED', 'CLOSED', 'REJECTED'].includes(String(ticket.status_code || '').toUpperCase()));
  const resolvedAt = ticket.resolved_at || ticket.closed_at || ticket.updated_at || ticket.created_at;

  const resolutionState = _renderSlaTimer('resolution', {
    limitHours: Number(ticket.sla_resolution_hours),
    startMs,
    doneAtMs: isResolved ? new Date(resolvedAt).getTime() : null,
    doneLabel: 'Rozwiązano w',
    warnAtPercent: 80,
    warning: { icon: 'ti-alert-triangle', label: 'Zagrożone' },
    runningIcon: 'ti-clock',
  });

  const states = [responseState, resolutionState];
  let header;
  if (states.some(s => s === 'breached' || s === 'overdue')) {
    header = { color: 'danger', icon: 'ti-alert-triangle', label: 'SLA Przekroczone' };
  } else if (states.every(s => s === 'met')) {
    header = { color: 'success', icon: 'ti-check', label: 'SLA Dotrzymane' };
  } else if (states.includes('warning')) {
    header = { color: 'warning', icon: 'ti-clock-pause', label: 'SLA Zagrożone' };
  } else {
    header = { color: 'blue', icon: 'ti-activity', label: 'SLA Aktywne' };
  }

  const headerBadgeEl = document.getElementById('td-sla-badge');
  if (headerBadgeEl) {
    headerBadgeEl.className = `badge bg-${header.color}-lt text-${header.color}`;
    headerBadgeEl.innerHTML = `<i class="ti ${header.icon} me-1"></i>${header.label}`;
  }
}
