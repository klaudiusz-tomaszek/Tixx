const db = require('../config/db');
const { suggestTriage } = require('../services/triage.service');
const { parsePositiveInt } = require('../middleware/validators');
const { withAsyncHandlers } = require('../middleware/async-handler');

// Limity liczby zwracanych zgłoszeń na liście
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

// Pierwsza reakcja (SLA czasu podjęcia): zapisywana raz, przy pierwszym podjęciu zgłoszenia
const SET_FIRST_RESPONSE = 'first_response_at = COALESCE(first_response_at, CURRENT_TIMESTAMP)';

const TICKET_NOT_FOUND = 'Zgłoszenie nie zostało odnalezione';

/**
 * Wykonuje UPDATE ... RETURNING * na zgłoszeniu i odsyła wynik albo 404, gdy zgłoszenia nie ma
 */
async function updateTicketAndRespond(res, sql, params, successMessage) {
  const { rows } = await db.query(sql, params);
  if (rows.length === 0) {
    return res.status(404).json({ error: TICKET_NOT_FOUND });
  }
  res.json({ message: successMessage, ticket: rows[0] });
}

// Lista zgłoszeń (opcjonalne filtry: status, priorytet)
async function getTickets(req, res) {
  const { status, priority } = req.query;
  const limit = Math.min(parsePositiveInt(req.query.limit) || DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  const conditions = [];
  const params = [];

  // Kody w słownikach są zapisane wielkimi literami (np. NEW, HIGH)
  if (typeof status === 'string' && status) {
    params.push(status.toUpperCase());
    conditions.push(`status_code = $${params.length}`);
  }
  if (typeof priority === 'string' && priority) {
    params.push(priority.toUpperCase());
    conditions.push(`priority_code = $${params.length}`);
  }
  params.push(limit);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT * FROM v_tickets_overview ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ count: rows.length, tickets: rows });
}

// Statystyki: liczba otwartych zgłoszeń i rozkład wg statusów (całość, bez limitu)
async function getTicketStats(req, res) {
  const { rows } = await db.query(
    `SELECT s.code AS status_code, s.name AS status_name, s.is_final,
            COUNT(t.id)::int AS count
     FROM ticket_statuses s
     LEFT JOIN tickets t ON t.status_id = s.id
     GROUP BY s.id
     ORDER BY s.sort_order ASC`
  );
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const open = rows.filter((r) => !r.is_final).reduce((sum, r) => sum + r.count, 0);
  res.json({ total, open, by_status: rows });
}

// Szczegóły pojedynczego zgłoszenia wraz z komentarzami
async function getTicketById(req, res) {
  const ticketId = req.validatedId;

  const ticketResult = await db.query('SELECT * FROM v_tickets_overview WHERE id = $1', [ticketId]);
  if (ticketResult.rows.length === 0) {
    return res.status(404).json({ error: TICKET_NOT_FOUND });
  }

  const commentsResult = await db.query(
    `SELECT c.id, c.message, c.is_internal, c.created_at,
            u.id AS author_id,
            u.first_name || ' ' || u.last_name AS author_name,
            u.email AS author_email
     FROM ticket_comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.ticket_id = $1
     ORDER BY c.created_at ASC`,
    [ticketId]
  );

  res.json({ ticket: ticketResult.rows[0], comments: commentsResult.rows });
}

// Utworzenie nowego zgłoszenia
async function createTicket(req, res) {
  const { title, description } = req.body;
  const category_id = parsePositiveInt(req.body.category_id);
  const priority_id = parsePositiveInt(req.body.priority_id);
  const reporter_id = parsePositiveInt(req.body.reporter_id);

  if (typeof title !== 'string' || typeof description !== 'string' ||
      !title.trim() || !description.trim() || !category_id || !priority_id || !reporter_id) {
    return res.status(400).json({
      error: 'Pola title, description, category_id, priority_id i reporter_id są wymagane.',
    });
  }

  // Domyślny status: 1 (Nowe)
  const status_id = parsePositiveInt(req.body.status_id) || 1;

  // Zgłoszenie utworzone od razu w statusie innym niż NEW jest już podjęte (first_response_at)
  const { rows } = await db.query(
    `INSERT INTO tickets (ticket_number, title, description, category_id, priority_id, status_id, reporter_id, first_response_at)
     VALUES (
       '#' || nextval('ticket_number_seq'),
       $1, $2, $3, $4, $5, $6,
       CASE WHEN (SELECT code FROM ticket_statuses WHERE id = $5) <> 'NEW' THEN CURRENT_TIMESTAMP END
     )
     RETURNING *`,
    [title.trim(), description.trim(), category_id, priority_id, status_id, reporter_id]
  );

  res.status(201).json({ message: 'Zgłoszenie zostało pomyślnie utworzone', ticket: rows[0] });
}

// Propozycja kategorii i priorytetu przez AI (triage) – nic nie zapisuje w bazie.
// Błędy usługi AI (TriageError) mają bezpieczne komunikaty i trafiają do globalnego handlera.
async function triageTicket(req, res) {
  const { title, description } = req.body;

  if (typeof title !== 'string' || typeof description !== 'string' ||
      title.trim().length < 3 || description.trim().length < 5) {
    return res.status(400).json({
      error: 'Do analizy AI potrzebny jest temat (min. 3 znaki) i opis (min. 5 znaków).',
    });
  }

  const suggestion = await suggestTriage({ title: title.trim(), description: description.trim() });
  res.json({ suggestion });
}

// Zmiana statusu (z automatycznym ustawianiem resolved_at / closed_at / first_response_at)
async function updateTicketStatus(req, res) {
  const status_id = parsePositiveInt(req.body.status_id);
  if (!status_id) {
    return res.status(400).json({ error: 'Pole status_id jest wymagane' });
  }

  const { rows } = await db.query('SELECT code, is_final FROM ticket_statuses WHERE id = $1', [status_id]);
  const status = rows[0];
  if (!status) {
    return res.status(400).json({ error: 'Wybrany status nie istnieje' });
  }

  // Daty zależą wyłącznie od kodu statusu / flagi is_final (bez magicznych id):
  // - RESOLVED: ustaw resolved_at, wyczyść closed_at (np. powrót z CLOSED)
  // - status końcowy (CLOSED, REJECTED): ustaw closed_at i resolved_at
  // - pozostałe (reopen): wyczyść oba znaczniki
  const assignments = ['status_id = $1'];
  if (status.code === 'RESOLVED') {
    assignments.push('resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)', 'closed_at = NULL');
  } else if (status.is_final) {
    assignments.push('closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP)', 'resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)');
  } else {
    assignments.push('resolved_at = NULL', 'closed_at = NULL');
  }
  // Każdy status inny niż NEW oznacza, że zgłoszenie zostało podjęte
  if (status.code !== 'NEW') {
    assignments.push(SET_FIRST_RESPONSE);
  }

  await updateTicketAndRespond(
    res,
    `UPDATE tickets SET ${assignments.join(', ')} WHERE id = $2 RETURNING *`,
    [status_id, req.validatedId],
    'Status zgłoszenia został zaktualizowany'
  );
}

// Zmiana priorytetu
async function updateTicketPriority(req, res) {
  const priority_id = parsePositiveInt(req.body.priority_id);
  if (!priority_id) {
    return res.status(400).json({ error: 'Pole priority_id jest wymagane' });
  }

  const { rows } = await db.query('SELECT 1 FROM ticket_priorities WHERE id = $1', [priority_id]);
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Wybrany priorytet nie istnieje' });
  }

  await updateTicketAndRespond(
    res,
    'UPDATE tickets SET priority_id = $1 WHERE id = $2 RETURNING *',
    [priority_id, req.validatedId],
    'Priorytet zgłoszenia został zaktualizowany'
  );
}

// Zmiana opiekuna; brak wartości (null / "" / 0) = usunięcie przypisania
async function updateTicketAssignee(req, res) {
  let assigneeId = null;

  if (req.body.assignee_id) {
    assigneeId = parsePositiveInt(req.body.assignee_id);
    if (!assigneeId) {
      return res.status(400).json({ error: 'Nieprawidłowy identyfikator opiekuna (assignee_id)' });
    }
    const { rows } = await db.query('SELECT 1 FROM users WHERE id = $1 AND is_active = TRUE', [assigneeId]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Wybrany opiekun nie istnieje lub jest nieaktywny' });
    }
  }

  // Przypisanie opiekuna oznacza podjęcie zgłoszenia (SLA czasu podjęcia)
  const firstResponse = assigneeId ? `, ${SET_FIRST_RESPONSE}` : '';
  await updateTicketAndRespond(
    res,
    `UPDATE tickets SET assignee_id = $1${firstResponse} WHERE id = $2 RETURNING *`,
    [assigneeId, req.validatedId],
    'Przypisana osoba została zaktualizowana'
  );
}

module.exports = withAsyncHandlers({
  getTickets,
  getTicketStats,
  getTicketById,
  createTicket,
  triageTicket,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketAssignee,
});
