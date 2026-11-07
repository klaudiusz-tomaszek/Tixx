/* =====================================================================
   Tixx – middleware/validators.js
   Współdzielone middleware i helpery do walidacji parametrów żądań.
   ===================================================================== */

// Maksymalna wartość kolumny INT/SERIAL w PostgreSQL
const PG_INT_MAX = 2147483647;

/**
 * Parsuje dodatnią liczbę całkowitą mieszczącą się w kolumnie INT.
 * Zwraca liczbę lub null, gdy wartość jest nieprawidłowa (np. "abc", "5x", -1, 0).
 */
function parsePositiveInt(value) {
  if (typeof value === 'number') value = String(value);
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const n = Number(value.trim());
  return n >= 1 && n <= PG_INT_MAX ? n : null;
}

/**
 * Middleware walidujące parametr :id z URL.
 * Parsuje do int i dopisuje req.validatedId.
 */
function validateId(req, res, next) {
  const id = parsePositiveInt(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Nieprawidłowy identyfikator zgłoszenia' });
  }
  req.validatedId = id;
  next();
}

module.exports = {
  validateId,
  parsePositiveInt,
};
