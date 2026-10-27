/* =====================================================================
   Tixx – api.js
   Centralne wrappery do komunikacji z REST API.
   Każda funkcja zwraca sparsowany obiekt JSON lub rzuca Error.
   ===================================================================== */

const API = {

  /** GET /api/tickets?status=&priority=&limit= */
  async getTickets({ status = '', priority = '', limit = 50 } = {}) {
    let url = `/api/tickets?limit=${limit}`;
    if (status)   url += `&status=${encodeURIComponent(status)}`;
    if (priority) url += `&priority=${encodeURIComponent(priority)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /** GET /api/tickets/:id */
  async getTicketById(id) {
    const res = await fetch(`/api/tickets/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /** POST /api/tickets */
  async createTicket(payload) {
    const res = await fetch('/api/tickets', {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  /** GET /api/dictionaries/categories */
  async getCategories() {
    const res = await fetch('/api/dictionaries/categories');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /** GET /api/dictionaries/priorities */
  async getPriorities() {
    const res = await fetch('/api/dictionaries/priorities');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /** GET /api/health */
  async getHealth() {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

};

