/* =====================================================================
   Tixx – App.js
   Główny router SPA: przełączanie widoków, breadcrumb.
   ===================================================================== */

const VIEWS = ['dashboard', 'tickets', 'ticket-detail', 'health'];

// Struktura: widok → { sekcja, etykieta }
const VIEW_META = {
  dashboard     : { section: 'Panel',          label: 'Dashboard'          },
  tickets       : { section: 'Panel',          label: 'Zgłoszenia'         },
  'ticket-detail': { section: 'Panel',         label: 'Szczegóły zgłoszenia'},
  health        : { section: 'Administracja',  label: 'Diagnostyka API'    },
};

// ── Przełącz aktywny widok ────────────────────────────────────────────
function showView(name) {
  VIEWS.forEach(v => {
    document.getElementById('view-' + v)?.classList.toggle('d-none', v !== name);
    document.getElementById('nav-' + v)?.classList.toggle('active', v === name);
  });

  // Breadcrumb: 🏠 → Sekcja → Widok
  const meta = VIEW_META[name] ?? { section: '', label: name };
  const breadcrumbEl = document.getElementById('breadcrumb');
  if (breadcrumbEl) {
    breadcrumbEl.innerHTML =
      `<li class="breadcrumb-item">
         <a href="#" onclick="showView('dashboard')" title="Strona główna">
           <i class="ti ti-home"></i>
         </a>
       </li>
       <li class="breadcrumb-item text-muted">${meta.section}</li>
       <li class="breadcrumb-item active">${meta.label}</li>`;
  }

  // Lazy-load danych przy wejściu do widoku
  if (name === 'health' && typeof checkHealth === 'function')   checkHealth();
  if (name === 'tickets' && typeof loadTickets === 'function')  loadTickets();
}

