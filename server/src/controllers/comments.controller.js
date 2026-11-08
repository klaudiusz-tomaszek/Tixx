const db = require('../config/db');
const { withAsyncHandlers } = require('../middleware/async-handler');

// Dodanie nowego komentarza do zgłoszenia.
// Autorem jest zawsze zalogowany użytkownik – author_id z treści żądania jest ignorowane.
async function addComment(req, res) {
  const { message, is_internal = false } = req.body;

  if (typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Treść komentarza (message) jest wymagana' });
  }

  const { rows } = await db.query(
    `INSERT INTO ticket_comments (ticket_id, author_id, message, is_internal)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [req.validatedId, req.user.id, message.trim(), Boolean(is_internal)]
  );

  res.status(201).json({ message: 'Komentarz został pomyślnie dodany', comment: rows[0] });
}

module.exports = withAsyncHandlers({ addComment });
