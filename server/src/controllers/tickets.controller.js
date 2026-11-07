const db = require('../config/db');
const { suggestTriage, TriageError } = require('../services/triage.service');
const { parsePositiveInt } = require('../middleware/validators');

// Limity liczby zwracanych zgłoszeń na liście
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

// Pierwsza reakcja (SLA czasu podjęcia): zapisywana raz, przy pierwszym podjęciu zgłoszenia
const SET_FIRST_RESPONSE = 'first_response_at = COALESCE(first_response_at, CURRENT_TIMESTAMP)';

// Pobranie listy zgłoszeń (z możliwością filtrowania po statusie i priorytecie)
async function getTickets(req, res, next) {
  try {
    const { status, priority } = req.query;
    const limit = Math.min(parsePositiveInt(req.query.limit) || DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
    let query = 'SELECT * FROM v_tickets_overview';
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

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    params.push(limit);
    query += ` LIMIT $${params.length}`;

    const { rows } = await db.query(query, params);
    res.json({
      count: rows.length,
      tickets: rows,
    });
  } catch (err) {
    next(err);
  }
}

// Statystyki: liczba otwartych zgłoszeń i rozkład wg statusów (całość, bez limitu)
async function getTicketStats(req, res, next) {
  try {
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
  } catch (err) {
    next(err);
  }
}

// Pobranie szczegółów pojedynczego zgłoszenia wraz z komentarzami
async function getTicketById(req, res, next) {
  try {
    const ticketId = req.validatedId || parseInt(req.params.id, 10);

    const ticketResult = await db.query('SELECT * FROM v_tickets_overview WHERE id = $1', [ticketId]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zgłoszenie nie zostało odnalezione' });
    }

    const commentsResult = await db.query(
      `SELECT 
         c.id, 
         c.message, 
         c.is_internal, 
         c.created_at,
         u.id as author_id,
         u.first_name || ' ' || u.last_name as author_name,
         u.email as author_email
       FROM ticket_comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [ticketId]
    );

    res.json({
      ticket: ticketResult.rows[0],
      comments: commentsResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

// Utworzenie nowego zgłoszenia
async function createTicket(req, res, next) {
  try {
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
    const insertQuery = `
      INSERT INTO tickets (ticket_number, title, description, category_id, priority_id, status_id, reporter_id, first_response_at)
      VALUES (
        '#' || nextval('ticket_number_seq'),
        $1, $2, $3, $4, $5, $6,
        CASE WHEN (SELECT code FROM ticket_statuses WHERE id = $5) <> 'NEW' THEN CURRENT_TIMESTAMP END
      )
      RETURNING *;
    `;

    const { rows } = await db.query(insertQuery, [
      title.trim(),
      description.trim(),
      category_id,
      priority_id,
      status_id,
      reporter_id,
    ]);

    res.status(201).json({
      message: 'Zgłoszenie zostało pomyślnie utworzone',
      ticket: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Propozycja kategorii i priorytetu przez AI (triage) – nic nie zapisuje w bazie
async function triageTicket(req, res, next) {
  try {
    const { title, description } = req.body;

    if (typeof title !== 'string' || typeof description !== 'string' ||
        title.trim().length < 3 || description.trim().length < 5) {
      return res.status(400).json({
        error: 'Do analizy AI potrzebny jest temat (min. 3 znaki) i opis (min. 5 znaków).',
      });
    }

    const suggestion = await suggestTriage({ title: title.trim(), description: description.trim() });
    res.json({ suggestion });
  } catch (err) {
    if (err instanceof TriageError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

// Zmiana statusu zgłoszenia (z automatycznym ustawianiem resolved_at / closed_at)
async function updateTicketStatus(req, res, next) {
  try {
    const ticketId = req.validatedId || parseInt(req.params.id, 10);
    const status_id = parsePositiveInt(req.body.status_id);

    if (!status_id) {
      return res.status(400).json({ error: 'Pole status_id jest wymagane' });
    }

    // Sprawdzenie czy status istnieje i odczytanie jego kodu / flagi is_final
    const statusQuery = await db.query('SELECT id, code, is_final FROM ticket_statuses WHERE id = $1', [status_id]);
    if (statusQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Wybrany status nie istnieje' });
    }
    const statusObj = statusQuery.rows[0];

    // Daty zależą wyłącznie od kodu statusu / flagi is_final (bez magicznych id):
    // - RESOLVED: ustaw resolved_at, wyczyść closed_at (np. powrót z CLOSED)
    // - status końcowy (CLOSED, REJECTED): ustaw closed_at i resolved_at
    // - pozostałe (reopen): wyczyść oba znaczniki
    let updateSql = 'UPDATE tickets SET status_id = $1';
    if (statusObj.code === 'RESOLVED') {
      updateSql += ', resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP), closed_at = NULL';
    } else if (statusObj.is_final) {
      updateSql += ', closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP), resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)';
    } else {
      updateSql += ', resolved_at = NULL, closed_at = NULL';
    }
    // Każdy status inny niż NEW oznacza, że zgłoszenie zostało podjęte
    if (statusObj.code !== 'NEW') {
      updateSql += `, ${SET_FIRST_RESPONSE}`;
    }
    updateSql += ' WHERE id = $2 RETURNING *';

    const { rows } = await db.query(updateSql, [status_id, ticketId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Zgłoszenie nie zostało odnalezione' });
    }

    res.json({
      message: 'Status zgłoszenia został zaktualizowany',
      ticket: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Zmiana priorytetu zgłoszenia
async function updateTicketPriority(req, res, next) {
  try {
    const ticketId = req.validatedId || parseInt(req.params.id, 10);
    const priority_id = parsePositiveInt(req.body.priority_id);

    if (!priority_id) {
      return res.status(400).json({ error: 'Pole priority_id jest wymagane' });
    }

    const priorityQuery = await db.query('SELECT 1 FROM ticket_priorities WHERE id = $1', [priority_id]);
    if (priorityQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Wybrany priorytet nie istnieje' });
    }

    const { rows } = await db.query(
      'UPDATE tickets SET priority_id = $1 WHERE id = $2 RETURNING *',
      [priority_id, ticketId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Zgłoszenie nie zostało odnalezione' });
    }

    res.json({
      message: 'Priorytet zgłoszenia został zaktualizowany',
      ticket: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Zmiana osoby przypisanej do zgłoszenia
async function updateTicketAssignee(req, res, next) {
  try {
    const ticketId = req.validatedId || parseInt(req.params.id, 10);
    const { assignee_id } = req.body;

    // Brak wartości (null / "" / 0) = usunięcie przypisania
    let cleanAssigneeId = null;
    if (assignee_id) {
      cleanAssigneeId = parsePositiveInt(assignee_id);
      if (!cleanAssigneeId) {
        return res.status(400).json({ error: 'Nieprawidłowy identyfikator opiekuna (assignee_id)' });
      }
      const userQuery = await db.query('SELECT 1 FROM users WHERE id = $1 AND is_active = TRUE', [cleanAssigneeId]);
      if (userQuery.rows.length === 0) {
        return res.status(400).json({ error: 'Wybrany opiekun nie istnieje lub jest nieaktywny' });
      }
    }

    // Przypisanie opiekuna oznacza podjęcie zgłoszenia (SLA czasu podjęcia)
    const updateSql = cleanAssigneeId
      ? `UPDATE tickets SET assignee_id = $1, ${SET_FIRST_RESPONSE} WHERE id = $2 RETURNING *`
      : 'UPDATE tickets SET assignee_id = $1 WHERE id = $2 RETURNING *';

    const { rows } = await db.query(updateSql, [cleanAssigneeId, ticketId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Zgłoszenie nie zostało odnalezione' });
    }

    res.json({
      message: 'Przypisana osoba została zaktualizowana',
      ticket: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTickets,
  getTicketStats,
  getTicketById,
  createTicket,
  triageTicket,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketAssignee,
};
