/* =====================================================================
   Tixx – main.js
   Inicjalizacja aplikacji po załadowaniu drzewa DOM.
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Sprawdzenie czy w URL jest hash np. #ticket-123
  const hash = window.location.hash;
  if (hash && hash.startsWith('#ticket-')) {
    const ticketId = hash.replace('#ticket-', '');
    if (typeof viewTicket === 'function') {
      viewTicket(ticketId);
      return;
    }
  }

  // Domyślny widok
  showView('dashboard');
  if (typeof loadRecentTickets === 'function') {
    loadRecentTickets();
  }
});

