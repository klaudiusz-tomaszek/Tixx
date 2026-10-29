const db = require('../config/db');

// Pobranie listy zgłoszeń (z możliwością filtrowania po statusie i priorytecie)
async function getTickets(req, res, next) {
  try {
    const { status, priority, limit = 50 } = req.query;
    let query = 'SELECT * FROM v_tickets_overview';
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status_code = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      conditions.push(`priority_code = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    params.push(parseInt(limit, 10));
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
    const { title, description, category_id, priority_id, reporter_id } = req.body;

    if (!title || !description || !category_id || !priority_id || !reporter_id) {
      return res.status(400).json({
        error: 'Pola title, description, category_id, priority_id i reporter_id są wymagane.',
      });
    }

    // Domyślny status: 1 (Nowe)
    const status_id = parseInt(req.body.status_id, 10) || 1;

    const insertQuery = `
      INSERT INTO tickets (ticket_number, title, description, category_id, priority_id, status_id, reporter_id)
      VALUES (
        '#' || nextval('ticket_number_seq'),
        $1, $2, $3, $4, $5, $6
      )
      RETURNING *;
    `;

    const { rows } = await db.query(insertQuery, [
      title.trim(),
      description.trim(),
      parseInt(category_id, 10),
      parseInt(priority_id, 10),
      status_id,
      parseInt(reporter_id, 10),
    ]);

    res.status(201).json({
      message: 'Zgłoszenie zostało pomyślnie utworzone',
      ticket: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Zmiana statusu zgłoszenia (z automatycznym ustawianiem resolved_at / closed_at)
async function updateTicketStatus(req, res, next) {
  try {
    const ticketId = req.validatedId || parseInt(req.params.id, 10);
    const status_id = parseInt(req.body.status_id, 10);

    if (!status_id) {
      return res.status(400).json({ error: 'Pole status_id jest wymagane' });
    }

    // Sprawdzenie czy status istnieje i odczytanie jego kodu / flagi is_final
    const statusQuery = await db.query('SELECT id, code, is_final FROM ticket_statuses WHERE id = $1', [status_id]);
    if (statusQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Wybrany status nie istnieje' });
    }
    const statusObj = statusQuery.rows[0];

    let updateSql = 'UPDATE tickets SET status_id = $1';
    if (statusObj.code === 'RESOLVED' || status_id === 4) {
      updateSql += ', resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)';
    } else if (statusObj.code === 'CLOSED' || status_id === 5 || statusObj.is_final) {
      updateSql += ', closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP), resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)';
    } else {
      // Wycofanie ze statusu zamkniętego (reopen)
      updateSql += ', closed_at = NULL';
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
    const priority_id = parseInt(req.body.priority_id, 10);

    if (!priority_id) {
      return res.status(400).json({ error: 'Pole priority_id jest wymagane' });
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
    const cleanAssigneeId = assignee_id ? parseInt(assignee_id, 10) : null;

    const { rows } = await db.query(
      'UPDATE tickets SET assignee_id = $1 WHERE id = $2 RETURNING *',
      [cleanAssigneeId, ticketId]
    );

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
  getTicketById,
  createTicket,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketAssignee,
};
