/* =====================================================================
   Tixx – views/ticket-create.js
   Logika tworzenia nowego zgłoszenia w oknie modalnym.
   Zależności: utils.js, api.js, App.js
   ===================================================================== */

const PRIORITY_DESCRIPTIONS = {
  critical: 'Awaria krytyczna – całkowity brak możliwości pracy lub przestój.',
  high:     'Wysoki priorytet – poważne utrudnienie w pracy.',
  medium:   'Standardowy problem – ograniczenie funkcjonalności z możliwością dalszej pracy.',
  low:      'Niski priorytet – drobna usterka lub prośba o zmianę.',
};

const DEFAULT_PRIORITY_CODE = 'MEDIUM';

// Użytkownicy z listy „Osoba zgłaszająca” – potrzebni do podglądu wybranej osoby
let reporterOptions = [];

function _createModal() {
  const modalEl = document.getElementById('modal-ticket-create');
  return modalEl ? window.tabler.bootstrap.Modal.getOrCreateInstance(modalEl) : null;
}

/**
 * Otwiera modal tworzenia nowego zgłoszenia i ładuje słowniki
 */
async function openTicketCreateModal() {
  _clearModalAlert();
  _createModal()?.show();

  try {
    const [categories, priorities, users] = await Promise.all([
      API.getCategories(),
      API.getPriorities(),
      API.getUsers(),
    ]);
    reporterOptions = users;
    _populateModalSelects(categories, priorities, users);
  } catch (err) {
    _showModalAlert('danger', 'Nie udało się załadować danych słownikowych: ' + err.message);
  }

  setTimeout(() => document.getElementById('modal-ticket-title')?.focus(), 250);
}

function closeTicketCreateModal() {
  _createModal()?.hide();
}

/**
 * Wypełnienie list wyboru w modalu. Bieżący wybór jest zachowywany;
 * domyślnie priorytet „Średni” i zalogowany użytkownik jako zgłaszający.
 */
function _populateModalSelects(categories, priorities, users) {
  fillSelect('modal-ticket-category', categories, { placeholder: '— Wybierz kategorię —' });

  const priorityEl = document.getElementById('modal-ticket-priority');
  fillSelect(priorityEl, priorities, {
    placeholder: '— Wybierz priorytet —',
    attrs: p => `data-code="${escapeHtml(p.code)}"`,
  });
  if (priorityEl && !priorityEl.value) {
    priorityEl.value = String(priorities.find(p => p.code === DEFAULT_PRIORITY_CODE)?.id || '');
  }
  updateModalPriorityPreview();

  const reporterEl = document.getElementById('modal-ticket-reporter');
  fillSelect(reporterEl, users, {
    placeholder: '— Wybierz osobę zgłaszającą —',
    label: u => `${fullName(u)} (${u.email}${u.department ? ` • ${u.department}` : ''})`,
  });
  if (reporterEl && !reporterEl.value && users.length) {
    const defaultReporter = users.find(u => u.id === currentUser?.id) || users[0];
    reporterEl.value = String(defaultReporter.id);
  }
  updateModalReporterPreview();
}

/**
 * Opis wybranego priorytetu pod polem wyboru
 */
function updateModalPriorityPreview() {
  const select = document.getElementById('modal-ticket-priority');
  const selectedOpt = select?.options[select.selectedIndex];
  const priCode = (selectedOpt?.value && selectedOpt.getAttribute('data-code') || '').toLowerCase();
  setTextById('modal-priority-preview-desc', PRIORITY_DESCRIPTIONS[priCode] || '');
}

/**
 * Podgląd wybranej osoby zgłaszającej (inicjały, e-mail, dział i pokój)
 */
function updateModalReporterPreview() {
  const selectedId = parseInt(document.getElementById('modal-ticket-reporter')?.value, 10);
  const user = reporterOptions.find(u => u.id === selectedId);

  setVisible('modal-reporter-card', Boolean(user));
  if (!user) return;

  const name = fullName(user);
  setTextById('modal-reporter-avatar', getInitials(name));
  setTextById('modal-reporter-name', name);
  setTextById('modal-reporter-email', user.email || 'Brak emaila');
  setTextById('modal-reporter-dept', user.department
    ? `${user.department}${user.office_room ? ` • pok. ${user.office_room}` : ''}`
    : (user.role_name || 'Użytkownik'));
}

/**
 * Wysłanie formularza w modalu
 */
async function submitTicketCreateModal(event) {
  if (event) event.preventDefault();
  _clearModalAlert();

  // Krok 1: zgłaszający, temat, opis
  if (!_validateTicketStep1()) return;

  // Bez weryfikacji AI nie można utworzyć zgłoszenia (np. Enter w polu tematu) – uruchom weryfikację
  if (!_ticketReview.done) {
    verifyTicketWithAi();
    return;
  }

  // Krok 2: kategoria i priorytet
  const catEl = document.getElementById('modal-ticket-category');
  const priEl = document.getElementById('modal-ticket-priority');
  if (!catEl.value) {
    _showModalAlert('danger', 'Proszę wybrać kategorię problemu.');
    catEl.focus();
    return;
  }
  if (!priEl.value) {
    _showModalAlert('danger', 'Proszę wybrać priorytet zgłoszenia.');
    priEl.focus();
    return;
  }

  const restoreButton = setButtonBusy(document.getElementById('modal-ticket-submit-btn'), 'Tworzenie…');

  try {
    const { ticket } = await API.createTicket({
      title:       document.getElementById('modal-ticket-title').value.trim(),
      description: document.getElementById('modal-ticket-description').value.trim(),
      category_id: parseInt(catEl.value, 10),
      priority_id: parseInt(priEl.value, 10),
      reporter_id: parseInt(document.getElementById('modal-ticket-reporter').value, 10),
    });

    restoreButton();
    closeTicketCreateModal();
    _resetModalFields();
    navigateTo(`/tickets/${ticket.id}`);
  } catch (err) {
    _showModalAlert('danger', err.message || 'Wystąpił błąd podczas tworzenia zgłoszenia.');
    restoreButton();
  }
}

/* ---------------------------------------------------------------------
   Weryfikacja AI (krok 2) – obowiązkowa przed utworzeniem zgłoszenia.
   Wynik pojawia się w prawym panelu modalu: kategoria i priorytet do ewentualnej
   poprawy. Zmiana tematu lub opisu po weryfikacji oznacza wynik jako nieaktualny
   i wymaga ponownej weryfikacji.
   --------------------------------------------------------------------- */

// Stan weryfikacji: dla jakiej treści została wykonana
// done – można utworzyć zgłoszenie; hasResult – panel ma wynik (aktualny lub nie); pending – trwa zapytanie
const _ticketReview = { done: false, hasResult: false, pending: false, title: '', description: '' };

function _validateTicketStep1() {
  const repEl   = document.getElementById('modal-ticket-reporter');
  const titleEl = document.getElementById('modal-ticket-title');
  const descEl  = document.getElementById('modal-ticket-description');

  if (!repEl?.value) {
    _showModalAlert('danger', 'Proszę wybrać osobę zgłaszającą.');
    repEl?.focus();
    return false;
  }
  if (!titleEl?.value.trim() || titleEl.value.trim().length < 3) {
    _showModalAlert('danger', 'Temat zgłoszenia musi zawierać co najmniej 3 znaki.');
    titleEl?.focus();
    return false;
  }
  if (!descEl?.value.trim() || descEl.value.trim().length < 5) {
    _showModalAlert('danger', 'Opis problemu musi zawierać co najmniej 5 znaków.');
    descEl?.focus();
    return false;
  }
  return true;
}

/**
 * Wysyła temat i opis do weryfikacji AI i pokazuje sekcję z kategorią i priorytetem
 */
async function verifyTicketWithAi() {
  _clearModalAlert();
  if (!_validateTicketStep1()) return;

  const title       = document.getElementById('modal-ticket-title').value.trim();
  const description = document.getElementById('modal-ticket-description').value.trim();

  _ticketReview.done = false;
  _ticketReview.pending = true;
  _setAiPanelState('loading');

  try {
    const { suggestion } = await API.triageTicket({ title, description });

    // Użytkownik mógł zmienić treść w trakcie oczekiwania – wynik byłby nieaktualny
    if (_currentTicketContentDiffers(title, description)) return _abortStaleVerification();

    const catEl = document.getElementById('modal-ticket-category');
    const priEl = document.getElementById('modal-ticket-priority');
    if (catEl) catEl.value = String(suggestion.category_id);
    if (priEl) priEl.value = String(suggestion.priority_id);
    updateModalPriorityPreview();
    _renderSelfHelpSteps(suggestion.self_help_steps);

    const confidenceLabel = { low: 'niska', medium: 'średnia', high: 'wysoka' }[suggestion.confidence] || suggestion.confidence;
    _showReviewStep({ title, description }, 'info', `
      <div class="fw-semibold mb-1">
        Propozycja AI: ${escapeHtml(suggestion.category_name)} • ${escapeHtml(suggestion.priority_name)}
        <span class="text-muted fw-normal">(pewność: ${escapeHtml(confidenceLabel)})</span>
      </div>
      <div class="small">${escapeHtml(suggestion.reasoning)}</div>
      <div class="small text-muted mt-1">Sprawdź propozycję – w razie potrzeby popraw kategorię lub priorytet i utwórz zgłoszenie.</div>
    `);
  } catch (err) {
    if (_currentTicketContentDiffers(title, description)) return _abortStaleVerification();

    // AI niedostępne – nie blokujemy zgłoszeń, użytkownik wybiera kategorię i priorytet ręcznie
    const catEl = document.getElementById('modal-ticket-category');
    if (catEl) catEl.value = '';
    _renderSelfHelpSteps([]);
    _showReviewStep({ title, description }, 'warning', `
      <div class="fw-semibold mb-1">Weryfikacja AI nie powiodła się</div>
      <div class="small">${escapeHtml(err.message || 'Nieznany błąd')}</div>
      <div class="small mt-1">
        Wybierz kategorię i priorytet ręcznie albo
        <a href="#" onclick="event.preventDefault(); verifyTicketWithAi();">spróbuj ponownie</a>.
      </div>
    `);
  }
}

/**
 * Lista prostych czynności do samodzielnego wykonania – sekcja ukryta, gdy AI nic nie zaproponowało
 */
function _renderSelfHelpSteps(steps) {
  const section = document.getElementById('modal-ai-selfhelp');
  const list = document.getElementById('modal-ai-selfhelp-list');
  if (!section || !list) return;

  const items = Array.isArray(steps) ? steps.filter(s => typeof s === 'string' && s.trim()) : [];
  list.innerHTML = items.map(s => `<li class="mb-1">${escapeHtml(s)}</li>`).join('');
  section.classList.toggle('d-none', items.length === 0);
}

function _currentTicketContentDiffers(title, description) {
  return document.getElementById('modal-ticket-title')?.value.trim() !== title ||
         document.getElementById('modal-ticket-description')?.value.trim() !== description;
}

/**
 * Przełącza stan prawego panelu weryfikacji AI:
 *  - empty   – brak weryfikacji, zachęta + przycisk „Weryfikuj z AI”
 *  - loading – trwa zapytanie do AI
 *  - review  – wynik AI + kategoria i priorytet do ewentualnej poprawy
 *  - stale   – wynik AI widoczny, ale treść zgłoszenia zmieniła się od weryfikacji
 */
function _setAiPanelState(state) {
  const toggle = (id, show, flex = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('d-none', !show);
    if (flex) el.classList.toggle('d-flex', show);
  };

  toggle('modal-ai-empty',   state === 'empty',   true);
  toggle('modal-ai-loading', state === 'loading', true);
  toggle('modal-ai-stale',   state === 'stale',   true);
  toggle('modal-ticket-review', state === 'review' || state === 'stale');

  // Nieaktualny wynik jest wyszarzony i nieedytowalny do czasu ponownej weryfikacji
  const reviewEl = document.getElementById('modal-ticket-review');
  if (reviewEl) {
    reviewEl.classList.toggle('opacity-50', state === 'stale');
    reviewEl.querySelectorAll('select').forEach(el => { el.disabled = state === 'stale'; });
  }

  const submitBtn = document.getElementById('modal-ticket-submit-btn');
  if (submitBtn) submitBtn.disabled = state !== 'review';
}

function _showReviewStep({ title, description }, alertType, resultHtml) {
  _ticketReview.done = true;
  _ticketReview.pending = false;
  _ticketReview.hasResult = true;
  _ticketReview.title = title;
  _ticketReview.description = description;

  const resultEl = document.getElementById('modal-ticket-ai-result');
  if (resultEl) {
    resultEl.className = `alert alert-${alertType} mb-3`;
    resultEl.innerHTML = resultHtml;
  }
  _setAiPanelState('review');
}

/**
 * Treść zmieniła się w trakcie weryfikacji – odrzuć wynik i wróć do poprzedniego stanu panelu
 */
function _abortStaleVerification() {
  _ticketReview.pending = false;
  _setAiPanelState(_ticketReview.hasResult ? 'stale' : 'empty');
}

/**
 * Pełny reset weryfikacji – panel wraca do stanu początkowego
 */
function _hideReviewStep() {
  _ticketReview.done = false;
  _ticketReview.pending = false;
  _ticketReview.hasResult = false;
  _ticketReview.title = '';
  _ticketReview.description = '';
  _renderSelfHelpSteps([]);
  _setAiPanelState('empty');
}

/**
 * Wywoływane przy edycji tematu lub opisu – zmiana treści unieważnia weryfikację.
 * Powrót do zweryfikowanej treści przywraca wynik bez ponownego zapytania.
 */
function onTicketContentChanged() {
  if (!_ticketReview.hasResult || _ticketReview.pending) return;
  const differs = _currentTicketContentDiffers(_ticketReview.title, _ticketReview.description);
  _ticketReview.done = !differs;
  _setAiPanelState(differs ? 'stale' : 'review');
}

function _resetModalFields() {
  _hideReviewStep();
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
