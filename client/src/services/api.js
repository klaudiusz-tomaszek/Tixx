/* =====================================================================
   Tixx – api.js
   Centralne wrappery do komunikacji z REST API.
   Każda funkcja zwraca sparsowany obiekt JSON lub rzuca Error.
   ===================================================================== */

/**
 * Wspólny helper żądań HTTP.
 * - body (obiekt) jest serializowane do JSON,
 * - odpowiedź jest parsowana bezpiecznie (np. strona HTML przy 502 nie wywraca kodu),
 * - przy błędzie rzuca Error z komunikatem z serwera (pole "error") lub kodem HTTP.
 */
async function apiRequest(url, { method = 'GET', body } = {}) {
  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));

  // Brak lub wygaśnięcie sesji – przejście na stronę logowania z powrotem do bieżącego adresu
  if (res.status === 401 && !url.startsWith('/api/auth/login') && window.location.pathname !== '/login') {
    redirectToLogin();
    return new Promise(() => {}); // strona i tak się przeładowuje – nie pokazujemy błędu
  }

  if (!res.ok) {
    throw new Error(data.error || `Błąd serwera (HTTP ${res.status})`);
  }
  return data;
}

function redirectToLogin() {
  const next = window.location.pathname + window.location.search;
  window.location.replace(next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login');
}

const API = {

  /** POST /api/auth/login */
  login({ email, password, remember }) {
    return apiRequest('/api/auth/login', { method: 'POST', body: { email, password, remember } });
  },

  /** POST /api/auth/logout */
  logout() {
    return apiRequest('/api/auth/logout', { method: 'POST' });
  },

  /** GET /api/auth/me – zalogowany użytkownik */
  getCurrentUser() {
    return apiRequest('/api/auth/me');
  },

  /** GET /api/tickets?status=&priority=&limit= */
  getTickets({ status = '', priority = '', limit = 50 } = {}) {
    const params = new URLSearchParams({ limit });
    if (status)   params.set('status', status);
    if (priority) params.set('priority', priority);
    return apiRequest(`/api/tickets?${params}`);
  },

  /** GET /api/tickets/stats */
  getTicketStats() {
    return apiRequest('/api/tickets/stats');
  },

  /** GET /api/tickets/:id */
  getTicketById(id) {
    return apiRequest(`/api/tickets/${id}`);
  },

  /** POST /api/tickets */
  createTicket(payload) {
    return apiRequest('/api/tickets', { method: 'POST', body: payload });
  },

  /** POST /api/tickets/triage – propozycja kategorii i priorytetu od AI */
  triageTicket({ title, description }) {
    return apiRequest('/api/tickets/triage', { method: 'POST', body: { title, description } });
  },

  /** POST /api/tickets/:id/comments */
  addComment(ticketId, payload) {
    return apiRequest(`/api/tickets/${ticketId}/comments`, { method: 'POST', body: payload });
  },

  /** PATCH /api/tickets/:id/status */
  updateTicketStatus(ticketId, status_id) {
    return apiRequest(`/api/tickets/${ticketId}/status`, { method: 'PATCH', body: { status_id } });
  },

  /** PATCH /api/tickets/:id/assignee */
  updateTicketAssignee(ticketId, assignee_id) {
    return apiRequest(`/api/tickets/${ticketId}/assignee`, { method: 'PATCH', body: { assignee_id } });
  },

  /** PATCH /api/tickets/:id/priority */
  updateTicketPriority(ticketId, priority_id) {
    return apiRequest(`/api/tickets/${ticketId}/priority`, { method: 'PATCH', body: { priority_id } });
  },

  /** GET /api/dictionaries/categories */
  getCategories() {
    return apiRequest('/api/dictionaries/categories');
  },

  /** GET /api/dictionaries/priorities */
  getPriorities() {
    return apiRequest('/api/dictionaries/priorities');
  },

  /** GET /api/dictionaries/statuses */
  getStatuses() {
    return apiRequest('/api/dictionaries/statuses');
  },

  /** GET /api/dictionaries/users */
  getUsers() {
    return apiRequest('/api/dictionaries/users');
  },

  /** GET /api/health */
  getHealth() {
    return apiRequest('/api/health');
  },

};
