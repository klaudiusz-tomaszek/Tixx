/* =====================================================================
   Tixx – App.js
   Główny router SPA oparty na HTML5 History API:
   - Czyste adresy URL w przeglądarce (/dashboard, /tickets, /tickets/:id, /health)
   - Zero przeładowania okna i zero mignięć paska bocznego
   - Pełna obsługa przycisków Wstecz / Dalej (popstate)
   - Obsługa odświeżania strony (F5) i bezpośrednich linków
   ===================================================================== */

const VIEWS = ['dashboard', 'tickets', 'ticket-detail', 'health'];

const VIEW_META = {
  dashboard      : { section: 'Panel',          label: 'Dashboard' },
  tickets        : { section: 'Panel',          label: 'Zgłoszenia' },
  'ticket-detail': { section: 'Panel',          label: '<span id="breadcrumb-current-label">Szczegóły zgłoszenia</span>' },
  health         : { section: 'Administracja',  label: 'Diagnostyka API' },
};

/**
 * Przejście do wskazanego adresu URL bez przeładowania okna
 * @param {string} url - Ścieżka docelowa (np. '/tickets', '/tickets/5')
 */
function navigateTo(url) {
  if (window.location.pathname !== url) {
    history.pushState(null, '', url);
  }
  handleRoute();
}

/**
 * Rozpoznanie bieżącej ścieżki i przełączenie widoku
 */
function handleRoute() {
  const path = window.location.pathname;

  if (path === '/' || path === '/dashboard') {
    showView('dashboard');
  } else if (path === '/tickets') {
    showView('tickets');
  } else if (path === '/tickets/new' || path === '/tickets/create') {
    showView('tickets');
    if (typeof openTicketCreateModal === 'function') {
      openTicketCreateModal();
    }
  } else if (path.startsWith('/tickets/')) {
    const parts = path.split('/').filter(Boolean);
    const ticketId = parts[1];
    showView('ticket-detail');
    if (ticketId && typeof viewTicket === 'function') {
      viewTicket(ticketId);
    }
  } else if (path === '/health') {
    showView('health');
  } else {
    showView('dashboard');
  }
}

/**
 * Przełączenie widoczności widoku
 * @param {string} name - Nazwa widoku ('dashboard' | 'tickets' | 'ticket-detail' | 'health')
 */
function showView(name) {
  VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('d-none', v !== name);
  });

  // Ustawienie aktywnych zakładek w lewym menu
  const isDashboard = name === 'dashboard';
  const isTickets   = name === 'tickets' || name === 'ticket-detail';
  const isHealth    = name === 'health';

  document.getElementById('nav-dashboard')?.classList.toggle('active', isDashboard);
  document.getElementById('nav-tickets')?.classList.toggle('active', isTickets);
  document.getElementById('nav-health')?.classList.toggle('active', isHealth);

  // Aktualizacja breadcrumb w topbarze
  _updateBreadcrumb(name);

  // Lazy-load danych przy wejściu do danego widoku
  if (name === 'dashboard' && typeof loadRecentTickets === 'function') {
    loadRecentTickets();
  }
  if (name === 'tickets' && typeof loadTickets === 'function') {
    loadTickets();
  }
  if (name === 'health' && typeof checkHealth === 'function') {
    checkHealth();
  }
}

/**
 * Aktualizacja paska okruszków (Breadcrumb)
 */
function _updateBreadcrumb(viewName) {
  const meta = VIEW_META[viewName] || { section: 'Panel', label: viewName };
  const breadcrumbEl = document.getElementById('breadcrumb');
  if (breadcrumbEl) {
    breadcrumbEl.innerHTML = `
      <li class="breadcrumb-item">
        <a href="/" title="Strona główna">
          <i class="ti ti-home"></i>
        </a>
      </li>
      <li class="breadcrumb-item text-muted">${meta.section}</li>
      <li class="breadcrumb-item active">${meta.label}</li>
    `;
  }
}

// ── Przechwytywanie kliknięć w odnośniki <a> ──────────────────────────
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');

  // Ignoruj linki zewnętrzne, puste, z target='_blank' oraz skróty klawiaturowe
  if (!href || !href.startsWith('/') || link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) {
    return;
  }

  e.preventDefault();
  navigateTo(href);
});

// ── Obsługa przycisków Wstecz / Dalej w przeglądarce ──────────────────
window.addEventListener('popstate', handleRoute);

// ── Inicjalizacja routingu po załadowaniu drzewa DOM ───────────────────
document.addEventListener('DOMContentLoaded', () => {
  handleRoute();
});
