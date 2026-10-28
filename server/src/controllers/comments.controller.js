const db = require('../config/db');

// Dodanie nowego komentarza do zgłoszenia
async function addComment(req, res, next) {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { message, is_internal = false, author_id = 1 } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Nieprawidłowy identyfikator zgłoszenia' });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Treść komentarza (message) jest wymagana' });
    }

    const insertQuery = `
      INSERT INTO ticket_comments (ticket_id, author_id, message, is_internal)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const { rows } = await db.query(insertQuery, [
      ticketId,
      author_id,
      message.trim(),
      Boolean(is_internal),
    ]);

    res.status(201).json({
      message: 'Komentarz został pomyślnie dodany',
      comment: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addComment,
};

