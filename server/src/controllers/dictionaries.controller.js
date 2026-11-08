const db = require('../config/db');
const { withAsyncHandlers } = require('../middleware/async-handler');

/**
 * Tworzy handler, który zwraca wszystkie wiersze zapytania słownikowego jako tablicę JSON
 */
function listHandler(sql) {
  return async (req, res) => {
    const { rows } = await db.query(sql);
    res.json(rows);
  };
}

module.exports = withAsyncHandlers({
  getCategories: listHandler('SELECT * FROM ticket_categories WHERE is_active = TRUE ORDER BY id ASC'),
  getPriorities: listHandler('SELECT * FROM ticket_priorities ORDER BY sort_order ASC'),
  getStatuses:   listHandler('SELECT * FROM ticket_statuses ORDER BY sort_order ASC'),
  getUsers:      listHandler(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.department, u.phone_number, u.office_room,
            r.name AS role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.is_active = TRUE
     ORDER BY u.id ASC`
  ),
});
