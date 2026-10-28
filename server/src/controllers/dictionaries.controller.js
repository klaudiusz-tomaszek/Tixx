const db = require('../config/db');

async function getCategories(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM ticket_categories WHERE is_active = TRUE ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getPriorities(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM ticket_priorities ORDER BY sort_order ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getStatuses(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM ticket_statuses ORDER BY sort_order ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.department, u.phone_number, u.office_room, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.is_active = TRUE
       ORDER BY u.id ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  getPriorities,
  getStatuses,
  getUsers,
};

