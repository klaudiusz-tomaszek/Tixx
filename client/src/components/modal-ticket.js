/* =====================================================================
   Tixx – views/modal-ticket.js
   Kompatybilność wsteczna: przekierowanie do głównego modalu tworzenia zgłoszenia.
   Zależności: ticket-create.js
   ===================================================================== */

function openNewTicketModal() {
  if (typeof openTicketCreateModal === 'function') {
    openTicketCreateModal();
  }
}
