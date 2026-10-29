/* =====================================================================
   Tixx – views/ticket-detail.js
   Logika widoku podglądu szczegółów pojedynczego zgłoszenia (Ticket Detail).
   Zależności: utils.js, api.js, app.js
   ===================================================================== */

let currentTicketId = null;
let cachedStatuses = [];
let cachedPriorities = [];
let cachedUsers = [];
let currentAssigneeId = null;

/**
 * Główna funkcja otwierająca widok podglądu zgłoszenia
 * @param {number|string} [id] - Opcjonalny identyfikator zgłoszenia
 */
async function viewTicket(id) {
  let ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    ticketId = parseInt(lastPart, 10);
  }
  if (isNaN(ticketId)) {
    const urlParams = new URLSearchParams(window.location.search);
    ticketId = parseInt(urlParams.get('id'), 10);
  }
  if (isNaN(ticketId)) return;

  currentTicketId = ticketId;
  if (window.location.pathname !== `/tickets/${ticketId}`) {
    history.pushState(null, '', `/tickets/${ticketId}`);
  }
  if (typeof showView === 'function') {
    showView('ticket-detail');
  }

  const loadingEl = document.getElementById('td-loading');
  const errorEl   = document.getElementById('td-error');
  const contentEl = document.getElementById('td-content');

  loadingEl.classList.remove('d-none');
  errorEl.classList.add('d-none');
  contentEl.classList.add('d-none');

  try {
    // Równoległe pobranie szczegółów zgłoszenia i słowników statusów oraz priorytetów
    const [ticketData, statusesData, prioritiesData] = await Promise.all([
      API.getTicketById(ticketId),
      cachedStatuses.length ? Promise.resolve(cachedStatuses) : API.getStatuses().catch(() => []),
      cachedPriorities.length ? Promise.resolve(cachedPriorities) : API.getPriorities().catch(() => []),
    ]);

    if (!cachedStatuses.length && Array.isArray(statusesData)) {
      cachedStatuses = statusesData;
    }
    if (!cachedPriorities.length && Array.isArray(prioritiesData)) {
      cachedPriorities = prioritiesData;
    }

    renderTicketDetail(ticketData.ticket, ticketData.comments || []);
    loadingEl.classList.add('d-none');
    contentEl.classList.remove('d-none');

  } catch (err) {
    loadingEl.classList.add('d-none');
    errorEl.classList.remove('d-none');
    document.getElementById('td-error-msg').textContent =
      err.message || 'Wystąpił błąd podczas ładowania zgłoszenia.';
  }
}

/**
 * Odświeżenie aktualnie otwartego zgłoszenia
 */
async function refreshTicketDetail() {
  if (currentTicketId) {
    await viewTicket(currentTicketId);
  }
}

/**
 * Wyrenderowanie danych zgłoszenia i komentarzy w widoku
 */
function renderTicketDetail(ticket, comments) {
  // Aktualizacja breadcrumb
  const breadcrumbLabel = document.getElementById('breadcrumb-current-label');
  if (breadcrumbLabel) {
    breadcrumbLabel.innerHTML = `<span class="font-monospace fw-bold">${escapeHtml(ticket.ticket_number)}</span>`;
  }

  // Numer zgłoszenia w nagłówku karty (po prawej stronie)
  const cardNumberEl = document.getElementById('td-card-number');
  if (cardNumberEl) cardNumberEl.textContent = ticket.ticket_number;

  // Tytuł i treść zgłoszenia w karcie głównej
  const bodyTitleEl = document.getElementById('td-body-title');
  if (bodyTitleEl) bodyTitleEl.textContent = ticket.title;

  const descEl = document.getElementById('td-description');
  if (descEl) descEl.textContent = ticket.description;

  // Dane zgłaszającego i data w karcie głównej
  const reporterAvatarEl = document.getElementById('td-reporter-avatar');
  if (reporterAvatarEl) reporterAvatarEl.textContent = getInitials(ticket.reporter_name);

  const reporterNameEl = document.getElementById('td-reporter-header-name');
  if (reporterNameEl) reporterNameEl.textContent = ticket.reporter_name;

  const reporterDeptEl = document.getElementById('td-reporter-dept-header');
  if (reporterDeptEl) {
    if (ticket.reporter_department) {
      reporterDeptEl.textContent = ticket.reporter_department;
      reporterDeptEl.classList.remove('d-none');
    } else {
      reporterDeptEl.classList.add('d-none');
    }
  }

  const reporterEmailEl = document.getElementById('td-reporter-email-header');
  if (reporterEmailEl) {
    reporterEmailEl.innerHTML = ticket.reporter_email
      ? `<i class="ti ti-mail me-1"></i><a href="mailto:${escapeHtml(ticket.reporter_email)}" class="text-reset text-decoration-none">${escapeHtml(ticket.reporter_email)}</a>`
      : '';
  }

  const createdAtEl = document.getElementById('td-created-at-header');
  if (createdAtEl) createdAtEl.textContent = fmtDate(ticket.created_at);

  // SLA oraz Pasek boczny: Status, Priorytet
  renderSLAProgress(ticket, comments);

  document.getElementById('td-status-badge').innerHTML =
    statusBadge(ticket.status_code, ticket.status_name);

  document.getElementById('td-priority-badge').innerHTML =
    priorityBadge(ticket.priority_code, ticket.priority_name);

  // Dropdowny zmiany statusu i priorytetu
  renderStatusDropdown(ticket.status_code);
  renderPriorityDropdown(ticket.priority_code);

  // Opiekun zgłoszenia
  const assigneeAvatar = document.getElementById('td-assignee-avatar');
  const assigneeName   = document.getElementById('td-assignee-name');
  const assigneeEmail  = document.getElementById('td-assignee-email');
  const assigneeDept   = document.getElementById('td-assignee-dept');

  currentAssigneeId = ticket.assignee_id || null;
  toggleAssigneeEdit(false);

  if (ticket.assignee_name) {
    if (assigneeAvatar) {
      assigneeAvatar.textContent = getInitials(ticket.assignee_name);
      assigneeAvatar.className = 'avatar avatar-md rounded-circle bg-purple-lt text-purple fw-bold fs-3';
    }
    if (assigneeName) assigneeName.textContent = ticket.assignee_name;
    if (assigneeEmail) {
      assigneeEmail.innerHTML = ticket.assignee_email
        ? `<a href="mailto:${escapeHtml(ticket.assignee_email)}" class="text-reset">${escapeHtml(ticket.assignee_email)}</a>`
        : 'Brak adresu e-mail';
    }
    if (assigneeDept) {
      assigneeDept.textContent = 'Dedykowany opiekun';
      assigneeDept.className = 'badge bg-purple-lt mt-1 small';
    }
  } else {
    if (assigneeAvatar) {
      assigneeAvatar.innerHTML = '<i class="ti ti-user-off fs-3"></i>';
      assigneeAvatar.className = 'avatar avatar-md rounded-circle bg-secondary-lt text-secondary';
    }
    if (assigneeName) assigneeName.innerHTML = '<span class="text-muted">Nieprzypisany</span>';
    if (assigneeEmail) assigneeEmail.textContent = 'Oczekuje na przypisanie';
    if (assigneeDept) {
      assigneeDept.textContent = 'Brak opiekuna';
      assigneeDept.className = 'badge bg-secondary-lt mt-1 small';
    }
  }

  // Komentarze
  renderCommentsList(comments);
}

/**
 * Renderowanie listy opcji zmiany statusu
 */
function renderStatusDropdown(currentStatusCode) {
  const dropdown = document.getElementById('td-status-dropdown');
  if (!dropdown) return;

  if (!cachedStatuses.length) {
    dropdown.innerHTML = '<li><span class="dropdown-item text-muted small">Brak dostępnych statusów</span></li>';
    return;
  }

  dropdown.innerHTML = cachedStatuses.map(s => {
    const isCurrent = s.code.toLowerCase() === (currentStatusCode || '').toLowerCase();
    return `
      <li>
        <a class="dropdown-item d-flex align-items-center justify-content-between ${isCurrent ? 'active' : ''}" 
           href="#" onclick="event.preventDefault(); changeTicketStatus(${s.id});">
          <span>${s.name}</span>
          ${isCurrent ? '<i class="ti ti-check ms-2"></i>' : ''}
        </a>
      </li>`;
  }).join('');
}

/**
 * Renderowanie listy opcji zmiany priorytetu
 */
function renderPriorityDropdown(currentPriorityCode) {
  const dropdown = document.getElementById('td-priority-dropdown');
  if (!dropdown) return;

  if (!cachedPriorities.length) {
    dropdown.innerHTML = '<li><span class="dropdown-item text-muted small">Brak dostępnych priorytetów</span></li>';
    return;
  }

  dropdown.innerHTML = cachedPriorities.map(p => {
    const isCurrent = (p.code || '').toLowerCase() === (currentPriorityCode || '').toLowerCase();
    return `
      <li>
        <a class="dropdown-item d-flex align-items-center justify-content-between ${isCurrent ? 'active' : ''}" 
           href="#" onclick="event.preventDefault(); changeTicketPriority(${p.id});">
          <span class="d-flex align-items-center gap-2">
            ${priorityBadge(p.code, p.name)}
          </span>
          ${isCurrent ? '<i class="ti ti-check ms-2"></i>' : ''}
        </a>
      </li>`;
  }).join('');
}

/**
 * Renderowanie komentarzy w osi czasu
 */
function renderCommentsList(comments) {
  const container = document.getElementById('td-comments-list');
  const emptyEl   = document.getElementById('td-no-comments');
  const badgeEl   = document.getElementById('td-comments-badge');

  badgeEl.textContent = comments.length;

  if (!comments.length) {
    container.innerHTML = '';
    emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl.classList.add('d-none');
  container.innerHTML = comments.map(c => {
    const isInternal = Boolean(c.is_internal);
    const authorName = c.author_name || 'Użytkownik';
    const authorInitials = getInitials(authorName);

    return `
      <div class="ticket-comment-card ${isInternal ? 'is-internal' : ''}">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="d-flex align-items-center gap-2">
            <span class="avatar avatar-xs rounded-circle ${isInternal ? 'bg-warning-lt text-warning' : 'bg-primary-lt text-primary'}">
              ${authorInitials}
            </span>
            <div>
              <span class="fw-semibold text-reset small">${escapeHtml(authorName)}</span>
              ${c.author_email ? `<span class="text-muted small ms-1">&lt;${escapeHtml(c.author_email)}&gt;</span>` : ''}
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            ${isInternal ? '<span class="badge bg-warning-lt text-warning" title="Widoczne tylko dla pracowników wsparcia"><i class="ti ti-lock me-1"></i>Notatka wewnętrzna</span>' : ''}
            <span class="text-muted small" title="${fmtDate(c.created_at)}">
              <i class="ti ti-clock me-1"></i>${fmtDate(c.created_at)}
            </span>
          </div>
        </div>
        <div class="ticket-comment-text text-secondary" style="white-space: pre-wrap; font-size: .9125rem; line-height: 1.55;">${escapeHtml(c.message)}</div>
      </div>`;
  }).join('');
}

/**
 * Wysłanie nowego komentarza
 */
async function submitTicketComment() {
  const textInput = document.getElementById('td-new-comment-text');
  const internalInput = document.getElementById('td-is-internal');
  const alertEl = document.getElementById('td-comment-alert');
  const submitBtn = document.getElementById('td-comment-submit-btn');

  const message = textInput.value.trim();
  const is_internal = internalInput.checked;

  if (!message) {
    alertEl.textContent = 'Wprowadź treść wiadomości przed wysłaniem.';
    alertEl.classList.remove('d-none');
    return;
  }

  alertEl.classList.add('d-none');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Wysyłanie…';

  try {
    await API.addComment(currentTicketId, {
      message,
      is_internal,
      author_id: 1, // Domyślny zalogowany użytkownik (Admin)
    });

    textInput.value = '';
    internalInput.checked = false;

    // Ponowne pobranie szczegółów zgłoszenia
    const data = await API.getTicketById(currentTicketId);
    renderTicketDetail(data.ticket, data.comments || []);

    // Odśwież również liczniki w tabeli zgłoszeń i dashboardzie jeśli obecne
    if (typeof loadRecentTickets === 'function') loadRecentTickets();

  } catch (err) {
    alertEl.textContent = err.message || 'Nie udało się dodać komentarza.';
    alertEl.classList.remove('d-none');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="ti ti-send me-1"></i><span>Wyślij odpowiedź</span>';
  }
}

/**
 * Zmiana statusu zgłoszenia
 */
async function changeTicketStatus(statusId) {
  if (!currentTicketId) return;

  try {
    const res = await API.updateTicketStatus(currentTicketId, statusId);
    if (res.ticket) {
      // Zaktualizuj widok
      const data = await API.getTicketById(currentTicketId);
      renderTicketDetail(data.ticket, data.comments || []);

      // Odśwież dane na liście jeśli funkcja dostępna
      if (typeof loadRecentTickets === 'function') loadRecentTickets();
    }
  } catch (err) {
    alert('Błąd podczas zmiany statusu: ' + err.message);
  }
}

/**
 * Zmiana priorytetu zgłoszenia
 */
async function changeTicketPriority(priorityId) {
  if (!currentTicketId) return;

  try {
    const res = await API.updateTicketPriority(currentTicketId, priorityId);
    if (res.ticket) {
      // Zaktualizuj widok (w tym natychmiastowe przeliczenie SLA dla nowego priorytetu)
      const data = await API.getTicketById(currentTicketId);
      renderTicketDetail(data.ticket, data.comments || []);

      // Odśwież dane na liście jeśli funkcja dostępna
      if (typeof loadRecentTickets === 'function') loadRecentTickets();
    }
  } catch (err) {
    alert('Błąd podczas zmiany priorytetu: ' + err.message);
  }
}

/**
 * Załadowanie użytkowników do selecta przypisania opiekuna
 */
async function populateAssigneeSelect(selectedId) {
  const select = document.getElementById('td-assignee-select');
  if (!select) return;

  if (!cachedUsers.length) {
    try {
      const data = await API.getUsers();
      cachedUsers = Array.isArray(data) ? data : (data.users || []);
    } catch (e) {
      console.error('Błąd pobierania użytkowników:', e);
    }
  }

  let html = '<option value="">— Brak przypisania (usuń) —</option>';
  cachedUsers.forEach(u => {
    const fullName = `${u.first_name} ${u.last_name}`;
    const roleDesc = u.role_name === 'admin' ? ' [Administrator]' : (u.role_name === 'support' ? ' [Wsparcie IT]' : '');
    const deptDesc = u.department ? ` (${u.department})` : '';
    html += `<option value="${u.id}">${escapeHtml(fullName + roleDesc + deptDesc)}</option>`;
  });
  select.innerHTML = html;
  select.value = selectedId ? String(selectedId) : '';
}

/**
 * Przełączanie trybu edycji opiekuna
 */
function toggleAssigneeEdit(forceState) {
  const displayEl = document.getElementById('td-assignee-display');
  const formEl    = document.getElementById('td-assignee-form');
  const toggleBtn = document.getElementById('td-btn-toggle-assignee');
  if (!displayEl || !formEl) return;

  const isFormVisible = !formEl.classList.contains('d-none');
  const willShowForm  = typeof forceState === 'boolean' ? forceState : !isFormVisible;

  if (willShowForm) {
    displayEl.classList.add('d-none');
    formEl.classList.remove('d-none');
    if (toggleBtn) toggleBtn.classList.add('d-none');
    populateAssigneeSelect(currentAssigneeId);
  } else {
    formEl.classList.add('d-none');
    displayEl.classList.remove('d-none');
    if (toggleBtn) toggleBtn.classList.remove('d-none');
  }
}

/**
 * Zapisanie zmiany opiekuna zgłoszenia
 */
async function saveAssigneeChange() {
  if (!currentTicketId) return;
  const select = document.getElementById('td-assignee-select');
  const saveBtn = document.getElementById('td-btn-save-assignee');
  const selectedVal = select ? select.value : '';
  const newAssigneeId = selectedVal ? parseInt(selectedVal, 10) : null;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Zapisywanie…';
  }

  try {
    const res = await API.updateTicketAssignee(currentTicketId, newAssigneeId);
    if (res.ticket) {
      currentAssigneeId = res.ticket.assignee_id || null;
      const data = await API.getTicketById(currentTicketId);
      renderTicketDetail(data.ticket, data.comments || []);
      if (typeof loadRecentTickets === 'function') loadRecentTickets();
    }
  } catch (err) {
    alert('Błąd podczas zmiany opiekuna: ' + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="ti ti-check me-1"></i><span>Zapisz</span>';
    }
    toggleAssigneeEdit(false);
  }
}

/**
 * Szybkie przypisanie zgłoszenia do aktualnego administratora (ID: 1)
 */
async function assignToMe() {
  const select = document.getElementById('td-assignee-select');
  if (select) {
    select.value = '1';
  }
  await saveAssigneeChange();
}

/**
 * Konfiguracja domyślnych czasów SLA (w godzinach) według priorytetu
 */
const DEFAULT_SLA_CONFIG = {
  critical : { response: 1, resolution: 4 },
  high     : { response: 4, resolution: 8 },
  medium   : { response: 8, resolution: 24 },
  low      : { response: 24, resolution: 72 },
  default  : { response: 8, resolution: 24 },
};

/**
 * Formatowanie czasu trwania na czytelną reprezentację (np. 45 min, 2h 15 min)
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
 * Renderowanie pasków postępu SLA i statusów SLA
 */
function renderSLAProgress(ticket, comments) {
  const priorityKey = (ticket.priority_code || '').toLowerCase();
  const fallbackSla = DEFAULT_SLA_CONFIG[priorityKey] || DEFAULT_SLA_CONFIG.default;

  const responseHours = Number(ticket.sla_response_hours) || fallbackSla.response;
  const resolutionHours = Number(ticket.sla_resolution_hours) || fallbackSla.resolution;

  const createdTime = new Date(ticket.created_at).getTime();
  const now = Date.now();

  // Elementy DOM
  const headerBadgeEl = document.getElementById('td-sla-badge');
  const respBarEl = document.getElementById('td-sla-response-bar');
  const respStatusEl = document.getElementById('td-sla-response-status');
  const respElapsedEl = document.getElementById('td-sla-response-elapsed');
  const respLimitEl = document.getElementById('td-sla-response-limit');

  const resBarEl = document.getElementById('td-sla-resolution-bar');
  const resStatusEl = document.getElementById('td-sla-resolution-status');
  const resElapsedEl = document.getElementById('td-sla-resolution-elapsed');
  const resLimitEl = document.getElementById('td-sla-resolution-limit');

  let isResponseBreached = false;
  let isResponseWarning = false;
  let isResolutionBreached = false;
  let isResolutionWarning = false;

  // --- 1. CZAS PODJĘCIA (RESPONSE SLA) ---
  const responseLimitMs = responseHours * 3600 * 1000;
  if (respLimitEl) respLimitEl.textContent = `Limit: ${responseHours}h`;

  // Sprawdzamy czy zgłoszenie zostało już podjęte (status inny niż NOWY lub przypisany opiekun)
  const isPickedUp = (ticket.status_code && ticket.status_code.toUpperCase() !== 'NEW') || Boolean(ticket.assignee_id);

  if (isPickedUp) {
    const pickupTime = new Date(ticket.updated_at || ticket.created_at).getTime();
    const duration = Math.max(0, pickupTime - createdTime);
    const met = duration <= responseLimitMs;

    if (respBarEl) {
      respBarEl.style.width = '100%';
      respBarEl.className = met ? 'progress-bar bg-success' : 'progress-bar bg-danger';
    }
    if (respStatusEl) {
      respStatusEl.className = met ? 'badge bg-success-lt text-success' : 'badge bg-danger-lt text-danger';
      respStatusEl.innerHTML = met ? '<i class="ti ti-check me-1"></i>Dotrzymane' : '<i class="ti ti-alert-triangle me-1"></i>Przekroczone';
    }
    if (respElapsedEl) {
      respElapsedEl.textContent = `Podjęto po: ${formatSlaDuration(duration)}`;
    }
    if (!met) isResponseBreached = true;
  } else {
    // Nadal oczekuje na podjęcie
    const elapsed = Math.max(0, now - createdTime);
    const remaining = responseLimitMs - elapsed;
    const percent = Math.min(100, Math.round((elapsed / responseLimitMs) * 100));

    if (elapsed <= responseLimitMs) {
      if (percent >= 75) {
        isResponseWarning = true;
        if (respBarEl) {
          respBarEl.style.width = `${percent}%`;
          respBarEl.className = 'progress-bar bg-warning';
        }
        if (respStatusEl) {
          respStatusEl.className = 'badge bg-warning-lt text-warning';
          respStatusEl.innerHTML = '<i class="ti ti-clock-pause me-1"></i>Kończy się czas';
        }
      } else {
        if (respBarEl) {
          respBarEl.style.width = `${Math.max(5, percent)}%`;
          respBarEl.className = 'progress-bar bg-primary';
        }
        if (respStatusEl) {
          respStatusEl.className = 'badge bg-primary-lt text-primary';
          respStatusEl.innerHTML = '<i class="ti ti-clock-play me-1"></i>W toku';
        }
      }
      if (respElapsedEl) {
        respElapsedEl.textContent = `Pozostało: ${formatSlaDuration(remaining)}`;
      }
    } else {
      isResponseBreached = true;
      if (respBarEl) {
        respBarEl.style.width = '100%';
        respBarEl.className = 'progress-bar bg-danger';
      }
      if (respStatusEl) {
        respStatusEl.className = 'badge bg-danger-lt text-danger';
        respStatusEl.innerHTML = '<i class="ti ti-alert-circle me-1"></i>Przekroczone';
      }
      if (respElapsedEl) {
        respElapsedEl.textContent = `Po terminie o: ${formatSlaDuration(elapsed - responseLimitMs)}`;
      }
    }
  }

  // --- 2. CZAS ROZWIĄZANIA (RESOLUTION SLA) ---
  const resolutionLimitMs = resolutionHours * 3600 * 1000;
  if (resLimitEl) resLimitEl.textContent = `Limit: ${resolutionHours}h`;

  const isResolved = Boolean(ticket.is_closed || ticket.resolved_at || ['RESOLVED', 'CLOSED', 'REJECTED'].includes((ticket.status_code || '').toUpperCase()));

  if (isResolved) {
    const resolvedTime = new Date(ticket.resolved_at || ticket.closed_at || ticket.updated_at || ticket.created_at).getTime();
    const duration = Math.max(0, resolvedTime - createdTime);
    const met = duration <= resolutionLimitMs;

    if (resBarEl) {
      resBarEl.style.width = '100%';
      resBarEl.className = met ? 'progress-bar bg-success' : 'progress-bar bg-danger';
    }
    if (resStatusEl) {
      resStatusEl.className = met ? 'badge bg-success-lt text-success' : 'badge bg-danger-lt text-danger';
      resStatusEl.innerHTML = met ? '<i class="ti ti-check me-1"></i>Dotrzymane' : '<i class="ti ti-alert-triangle me-1"></i>Przekroczone';
    }
    if (resElapsedEl) {
      resElapsedEl.textContent = `Rozwiązano w: ${formatSlaDuration(duration)}`;
    }
    if (!met) isResolutionBreached = true;
  } else {
    // Nadal otwarte
    const elapsed = Math.max(0, now - createdTime);
    const remaining = resolutionLimitMs - elapsed;
    const percent = Math.min(100, Math.round((elapsed / resolutionLimitMs) * 100));

    if (elapsed <= resolutionLimitMs) {
      if (percent >= 80) {
        isResolutionWarning = true;
        if (resBarEl) {
          resBarEl.style.width = `${percent}%`;
          resBarEl.className = 'progress-bar bg-warning';
        }
        if (resStatusEl) {
          resStatusEl.className = 'badge bg-warning-lt text-warning';
          resStatusEl.innerHTML = '<i class="ti ti-alert-triangle me-1"></i>Zagrożone';
        }
      } else {
        if (resBarEl) {
          resBarEl.style.width = `${Math.max(5, percent)}%`;
          resBarEl.className = 'progress-bar bg-primary';
        }
        if (resStatusEl) {
          resStatusEl.className = 'badge bg-primary-lt text-primary';
          resStatusEl.innerHTML = '<i class="ti ti-clock me-1"></i>W toku';
        }
      }
      if (resElapsedEl) {
        resElapsedEl.textContent = `Pozostało: ${formatSlaDuration(remaining)}`;
      }
    } else {
      isResolutionBreached = true;
      if (resBarEl) {
        resBarEl.style.width = '100%';
        resBarEl.className = 'progress-bar bg-danger';
      }
      if (resStatusEl) {
        resStatusEl.className = 'badge bg-danger-lt text-danger';
        resStatusEl.innerHTML = '<i class="ti ti-alert-circle me-1"></i>Przekroczone';
      }
      if (resElapsedEl) {
        resElapsedEl.textContent = `Po terminie o: ${formatSlaDuration(elapsed - resolutionLimitMs)}`;
      }
    }
  }

  // --- 3. BADGE GŁÓWNY NAGŁÓWKA SLA ---
  if (headerBadgeEl) {
    if (isResponseBreached || isResolutionBreached) {
      headerBadgeEl.className = 'badge bg-danger-lt text-danger';
      headerBadgeEl.innerHTML = '<i class="ti ti-alert-triangle me-1"></i>SLA Przekroczone';
    } else if (isResolved && isPickedUp) {
      headerBadgeEl.className = 'badge bg-success-lt text-success';
      headerBadgeEl.innerHTML = '<i class="ti ti-check me-1"></i>SLA Dotrzymane';
    } else if (isResponseWarning || isResolutionWarning) {
      headerBadgeEl.className = 'badge bg-warning-lt text-warning';
      headerBadgeEl.innerHTML = '<i class="ti ti-clock-pause me-1"></i>SLA Zagrożone';
    } else {
      headerBadgeEl.className = 'badge bg-blue-lt text-blue';
      headerBadgeEl.innerHTML = '<i class="ti ti-activity me-1"></i>SLA Aktywne';
    }
  }
}

