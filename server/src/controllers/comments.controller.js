const db = require('../config/db');

// Dodanie nowego komentarza do zgłoszenia
async function addComment(req, res, next) {
  try {
    const ticketId = req.validatedId || parseInt(req.params.id, 10);
    const { message, is_internal = false } = req.body;
    // Autorem jest zawsze zalogowany użytkownik – author_id z treści żądania jest ignorowane
    const author_id = req.user.id;

    if (typeof message !== 'string' || message.trim() === '') {
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

