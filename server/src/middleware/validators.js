/* =====================================================================
   Tixx – middleware/validators.js
   Współdzielone middleware do walidacji parametrów żądań.
   ===================================================================== */

/**
 * Middleware walidujące parametr :id z URL.
 * Parsuje do int i dopisuje req.validatedId.
 */
function validateId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Nieprawidłowy identyfikator zgłoszenia' });
  }
  req.validatedId = id;
  next();
}

module.exports = {
  validateId,
};

