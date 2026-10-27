/* =====================================================================
   Tixx – app.js
   Główny router SPA: przełączanie widoków, breadcrumb, inicjalizacja.

   Kolejność ładowania (w index.html):
     utils.js → api.js → views/dashboard.js → views/tickets.js
     → views/health.js → views/modal-ticket.js → app.js
   ===================================================================== */

const VIEWS = ['dashboard', 'tickets', 'health'];

// Struktura: widok → { sekcja, etykieta }
const VIEW_META = {
  dashboard : { section: 'Panel',          label: 'Dashboard'      },
  tickets   : { section: 'Panel',          label: 'Zgłoszenia'     },
  health    : { section: 'Administracja',  label: 'Diagnostyka API'},
};

// ── Przełącz aktywny widok ────────────────────────────────────────────
function showView(name) {
  VIEWS.forEach(v => {
    document.getElementById('view-' + v)?.classList.toggle('d-none', v !== name);
    document.getElementById('nav-' + v)?.classList.toggle('active', v === name);
  });

  // Breadcrumb: 🏠 → Sekcja → Widok
  const meta = VIEW_META[name] ?? { section: '', label: name };
  document.getElementById('breadcrumb').innerHTML =
    `<li class="breadcrumb-item">
       <a href="#" onclick="showView('dashboard')" title="Strona główna">
         <i class="ti ti-home"></i>
       </a>
     </li>
     <li class="breadcrumb-item text-muted">${meta.section}</li>
     <li class="breadcrumb-item active">${meta.label}</li>`;

  // Lazy-load danych przy wejściu do widoku
  if (name === 'health')  checkHealth();
  if (name === 'tickets') loadTickets();
}

// ── Inicjalizacja aplikacji ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showView('dashboard');
  loadRecentTickets();
});

