/* =====================================================================
   Tixx – views/modal-ticket.js
   Logika modala tworzenia nowego zgłoszenia.
   Zależności: api.js, app.js (showView, loadTickets, loadRecentTickets)
   ===================================================================== */

// ── Otwórz modal i załaduj słowniki ──────────────────────────────────
async function openNewTicketModal() {
  _clearModalAlert();

  try {
    const [catData, priData] = await Promise.all([
      API.getCategories(),
      API.getPriorities(),
    ]);

    document.getElementById('new-category').innerHTML =
      '<option value="">— wybierz —</option>' +
      (catData.categories || []).map(c =>
        `<option value="${c.id}">${c.name}</option>`).join('');

    document.getElementById('new-priority').innerHTML =
      '<option value="">— wybierz —</option>' +
      (priData.priorities || []).map(p =>
        `<option value="${p.id}">${p.name}</option>`).join('');

  } catch (_) {
    // Słowniki opcjonalne – modal otwiera się nawet przy błędzie
  }

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById('modal-new-ticket')
  ).show();
}

// ── Wyślij formularz ─────────────────────────────────────────────────
async function submitNewTicket() {
  const title       = document.getElementById('new-title').value.trim();
  const description = document.getElementById('new-description').value.trim();
  const category_id = document.getElementById('new-category').value;
  const priority_id = document.getElementById('new-priority').value;
  const reporter_id = document.getElementById('new-reporter').value;

  if (!title || !description || !category_id || !priority_id || !reporter_id) {
    _showModalAlert('danger', 'Uzupełnij wszystkie wymagane pola.');
    return;
  }

  try {
    await API.createTicket({ title, description, category_id, priority_id, reporter_id });

    bootstrap.Modal.getInstance(
      document.getElementById('modal-new-ticket')
    ).hide();

    // Odśwież dane po obu widokach
    showView('tickets');
    loadTickets();
    loadRecentTickets();

  } catch (err) {
    _showModalAlert('danger', err.message);
  }
}

// ── Prywatne helpery ──────────────────────────────────────────────────
function _showModalAlert(type, message) {
  const el = document.getElementById('modal-alert');
  el.className = `alert alert-${type}`;
  el.innerHTML = `<i class="ti ti-alert-triangle me-2"></i>${message}`;
}

function _clearModalAlert() {
  const el = document.getElementById('modal-alert');
  el.className = 'd-none';
  el.innerHTML = '';

  // Wyczyść pola formularza
  ['new-title', 'new-description', 'new-reporter'].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = id === 'new-reporter' ? '1' : '';
  });
}

