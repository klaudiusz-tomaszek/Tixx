/* =====================================================================
   Tixx – views/ticket-create.js
   Logika tworzenia nowego zgłoszenia w oknie modalnym (nakładka overlay).
   Zależności: utils.js, api.js, App.js
   ===================================================================== */

let cachedCreateCategories = [];
let cachedCreatePriorities = [];
let cachedCreateUsers = [];

const PRIORITY_DESCRIPTIONS = {
  critical: 'Awaria krytyczna – całkowity brak możliwości pracy lub przestój.',
  high:     'Wysoki priorytet – poważne utrudnienie w pracy.',
  medium:   'Standardowy problem – ograniczenie funkcjonalności z możliwością dalszej pracy.',
  low:      'Niski priorytet – drobna usterka lub prośba o zmianę.',
};

/**
 * Otwiera modal tworzenia nowego zgłoszenia i ładuje słowniki
 */
async function openTicketCreateModal() {
  _clearModalAlert();

  const modalEl = document.getElementById('modal-ticket-create');
  if (!modalEl) {
    console.error('Nie znaleziono modalu #modal-ticket-create w drzewie DOM.');
    return;
  }

  // 1. Otwarcie modalu (Bootstrap API z fallbackiem na natywny DOM)
  let opened = false;
  const bs = window.bootstrap || window.tabler?.bootstrap;
  if (bs && bs.Modal) {
    try {
      const bsModal = bs.Modal.getOrCreateInstance(modalEl);
      bsModal.show();
      opened = true;
    } catch (e) {
      console.warn('Bootstrap Modal błąd:', e);
    }
  }

  if (!opened) {
    _openModalFallback(modalEl);
  }

  // 2. Reset stanu przycisku zatwierdzania
  const submitBtn = document.getElementById('modal-ticket-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="ti ti-check fs-2 me-1"></i><span>Utwórz zgłoszenie</span>';
  }

  // 3. Pobierz słowniki (kategorie, priorytety, użytkownicy)
  try {
    const [catData, priData, usersData] = await Promise.all([
      cachedCreateCategories.length ? Promise.resolve(cachedCreateCategories) : API.getCategories().catch(() => []),
      cachedCreatePriorities.length ? Promise.resolve(cachedCreatePriorities) : API.getPriorities().catch(() => []),
      cachedCreateUsers.length ? Promise.resolve(cachedCreateUsers) : API.getUsers().catch(() => []),
    ]);

    if (Array.isArray(catData)) cachedCreateCategories = catData;
    if (Array.isArray(priData)) cachedCreatePriorities = priData;
    if (Array.isArray(usersData)) cachedCreateUsers = usersData;

    _populateModalCategories(cachedCreateCategories);
    _populateModalPriorities(cachedCreatePriorities);
    _populateModalUsers(cachedCreateUsers);

  } catch (err) {
    _showModalAlert('danger', 'Nie udało się załadować danych słownikowych: ' + err.message);
  }

  // 4. Ustaw focus na polu tematu
  setTimeout(() => {
    document.getElementById('modal-ticket-title')?.focus();
  }, 250);
}

/**
 * Zamyka modal tworzenia zgłoszenia
 */
function closeTicketCreateModal() {
  const modalEl = document.getElementById('modal-ticket-create');
  if (!modalEl) return;

  const bs = window.bootstrap || window.tabler?.bootstrap;
  if (bs && bs.Modal) {
    try {
      const inst = bs.Modal.getInstance(modalEl);
      if (inst) {
        inst.hide();
      }
    } catch (_) {}
  }

  _closeModalFallback(modalEl);
}

// Fallback natywny do wyświetlania modalu
function _openModalFallback(modalEl) {
  modalEl.classList.add('show');
  modalEl.style.display = 'block';
  modalEl.removeAttribute('aria-hidden');
  modalEl.setAttribute('aria-modal', 'true');
  document.body.classList.add('modal-open');

  let backdrop = document.getElementById('modal-ticket-create-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modal-ticket-create-backdrop';
    backdrop.onclick = closeTicketCreateModal;
    document.body.appendChild(backdrop);
  }

  const onEsc = (e) => {
    if (e.key === 'Escape') {
      closeTicketCreateModal();
      document.removeEventListener('keydown', onEsc);
    }
  };
  document.addEventListener('keydown', onEsc);
}

// Fallback natywny do ukrywania modalu
function _closeModalFallback(modalEl) {
  modalEl.classList.remove('show');
  modalEl.style.display = 'none';
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.removeAttribute('aria-modal');
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');

  const backdrop = document.getElementById('modal-ticket-create-backdrop');
  if (backdrop) backdrop.remove();
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
}

// Alias dla kompatybilności wstecznej
function openNewTicketModal() {
  openTicketCreateModal();
}

/**
 * Wypełnienie selecta kategorii w modalu
 */
function _populateModalCategories(categories) {
  const select = document.getElementById('modal-ticket-category');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">— Wybierz kategorię —</option>' +
    categories.map(c => `
      <option value="${c.id}" ${currentVal == c.id ? 'selected' : ''}>
        ${escapeHtml(c.name)}
      </option>
    `).join('');
}

/**
 * Wypełnienie selecta priorytetów w modalu
 */
function _populateModalPriorities(priorities) {
  const select = document.getElementById('modal-ticket-priority');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">— Wybierz priorytet —</option>' +
    priorities.map(p => {
      const isDefault = !currentVal && (p.code === 'MEDIUM' || p.code === 'medium' || p.name.toLowerCase().includes('średni'));
      return `
        <option value="${p.id}" data-code="${escapeHtml(p.code)}" ${currentVal == p.id || isDefault ? 'selected' : ''}>
          ${escapeHtml(p.name)}
        </option>
      `;
    }).join('');

  updateModalPriorityPreview();
}

/**
 * Wypełnienie selecta użytkowników w modalu
 */
function _populateModalUsers(users) {
  const select = document.getElementById('modal-ticket-reporter');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">— Wybierz osobę zgłaszającą —</option>' +
    users.map(u => {
      const dept = u.department ? ` • ${u.department}` : '';
      return `
        <option value="${u.id}" ${currentVal == u.id ? 'selected' : ''}>
          ${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)} (${escapeHtml(u.email)}${escapeHtml(dept)})
        </option>
      `;
    }).join('');

  if (!select.value && users.length > 0) {
    const adminUser = users.find(u => u.id === 1);
    select.value = adminUser ? adminUser.id : users[0].id;
  }

  updateModalReporterPreview();
}

/**
 * Aktualizacja podglądu priorytetu w modalu
 */
function updateModalPriorityPreview() {
  const select = document.getElementById('modal-ticket-priority');
  const previewBadge = document.getElementById('modal-priority-preview-badge');
  const descEl = document.getElementById('modal-priority-preview-desc');
  if (!select || !previewBadge) return;

  const selectedOpt = select.options[select.selectedIndex];
  if (!selectedOpt || !selectedOpt.value) {
    previewBadge.innerHTML = '<span class="badge bg-secondary-lt">Brak</span>';
    if (descEl) descEl.textContent = '';
    return;
  }

  const priCode = (selectedOpt.getAttribute('data-code') || '').toLowerCase();
  const priName = selectedOpt.textContent.trim();

  previewBadge.innerHTML = priorityBadge(priCode, priName);
  if (descEl) {
    descEl.textContent = PRIORITY_DESCRIPTIONS[priCode] || '';
  }
}

/**
 * Aktualizacja podglądu zgłaszającego w modalu
 */
function updateModalReporterPreview() {
  const select = document.getElementById('modal-ticket-reporter');
  const card = document.getElementById('modal-reporter-card');
  if (!select || !card) return;

  const selectedId = parseInt(select.value, 10);
  const user = cachedCreateUsers.find(u => u.id === selectedId);

  if (!user) {
    card.classList.add('d-none');
    return;
  }

  card.classList.remove('d-none');
  const name = `${user.first_name} ${user.last_name}`;
  const initials = getInitials(name);

  document.getElementById('modal-reporter-avatar').textContent = initials;
  document.getElementById('modal-reporter-name').textContent = name;
  document.getElementById('modal-reporter-email').textContent = user.email || 'Brak emaila';
  
  const deptEl = document.getElementById('modal-reporter-dept');
  if (deptEl) {
    deptEl.textContent = user.department ? `${user.department} ${user.office_room ? '• pok. ' + user.office_room : ''}` : (user.role_name || 'Użytkownik');
  }
}

/**
 * Wysłanie formularza w modalu
 */
async function submitTicketCreateModal(event) {
  if (event) event.preventDefault();

  const titleEl   = document.getElementById('modal-ticket-title');
  const descEl    = document.getElementById('modal-ticket-description');
  const catEl     = document.getElementById('modal-ticket-category');
  const priEl     = document.getElementById('modal-ticket-priority');
  const repEl     = document.getElementById('modal-ticket-reporter');
  const submitBtn = document.getElementById('modal-ticket-submit-btn');

  const title       = titleEl?.value.trim();
  const description = descEl?.value.trim();
  const category_id = catEl?.value;
  const priority_id = priEl?.value;
  const reporter_id = repEl?.value;

  _clearModalAlert();

  // Walidacja
  if (!title || title.length < 3) {
    _showModalAlert('danger', 'Temat zgłoszenia musi zawierać co najmniej 3 znaki.');
    titleEl?.focus();
    return;
  }
  if (!category_id) {
    _showModalAlert('danger', 'Proszę wybrać kategorię problemu.');
    catEl?.focus();
    return;
  }
  if (!priority_id) {
    _showModalAlert('danger', 'Proszę wybrać priorytet zgłoszenia.');
    priEl?.focus();
    return;
  }
  if (!reporter_id) {
    _showModalAlert('danger', 'Proszę wybrać osobę zgłaszającą.');
    repEl?.focus();
    return;
  }
  if (!description || description.length < 5) {
    _showModalAlert('danger', 'Opis problemu musi zawierać co najmniej 5 znaków.');
    descEl?.focus();
    return;
  }

  // Blokada przycisku
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
      <span>Tworzenie…</span>
    `;
  }

  try {
    const payload = {
      title,
      description,
      category_id: parseInt(category_id, 10),
      priority_id: parseInt(priority_id, 10),
      reporter_id: parseInt(reporter_id, 10),
    };

    const res = await API.createTicket(payload);

    // Zamknij modal
    closeTicketCreateModal();

    // Wyczyść pola
    _resetModalFields();

    // Przejdź do nowo utworzonego zgłoszenia lub odśwież widok
    if (res && res.ticket && res.ticket.id) {
      navigateTo(`/tickets/${res.ticket.id}`);
    } else {
      if (typeof loadTickets === 'function') loadTickets();
      if (typeof loadRecentTickets === 'function') loadRecentTickets();
    }

  } catch (err) {
    _showModalAlert('danger', err.message || 'Wystąpił błąd podczas tworzenia zgłoszenia.');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ti ti-check fs-2 me-1"></i><span>Utwórz zgłoszenie</span>';
    }
  }
}

function _resetModalFields() {
  ['modal-ticket-title', 'modal-ticket-description'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const catEl = document.getElementById('modal-ticket-category');
  if (catEl) catEl.value = '';
  _clearModalAlert();
}

function _showModalAlert(type, message) {
  const alertEl = document.getElementById('modal-create-ticket-alert');
  if (!alertEl) return;
  alertEl.className = `alert alert-${type} d-flex align-items-center mb-3`;
  const icon = type === 'success' ? 'ti-circle-check' : 'ti-alert-triangle';
  alertEl.innerHTML = `<i class="ti ${icon} fs-3 me-2"></i><div>${escapeHtml(message)}</div>`;
}

function _clearModalAlert() {
  const alertEl = document.getElementById('modal-create-ticket-alert');
  if (!alertEl) return;
  alertEl.className = 'd-none';
  alertEl.innerHTML = '';
}
