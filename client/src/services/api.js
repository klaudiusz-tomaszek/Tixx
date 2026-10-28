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
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Błąd serwera (HTTP ${res.status})`);
    }
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

  /** POST /api/tickets/:id/comments */
  async addComment(ticketId, payload) {
    const res = await fetch(`/api/tickets/${ticketId}/comments`, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  /** PATCH /api/tickets/:id/status */
  async updateTicketStatus(ticketId, status_id) {
    const res = await fetch(`/api/tickets/${ticketId}/status`, {
      method  : 'PATCH',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({ status_id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  /** PATCH /api/tickets/:id/assignee */
  async updateTicketAssignee(ticketId, assignee_id) {
    const res = await fetch(`/api/tickets/${ticketId}/assignee`, {
      method  : 'PATCH',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({ assignee_id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  /** PATCH /api/tickets/:id/priority */
  async updateTicketPriority(ticketId, priority_id) {
    const res = await fetch(`/api/tickets/${ticketId}/priority`, {
      method  : 'PATCH',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({ priority_id }),
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

  /** GET /api/dictionaries/statuses */
  async getStatuses() {
    const res = await fetch('/api/dictionaries/statuses');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /** GET /api/dictionaries/users */
  async getUsers() {
    const res = await fetch('/api/dictionaries/users');
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
