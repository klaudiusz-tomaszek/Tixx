/* =====================================================================
   Tixx – middleware/async-handler.js
   Express 4 nie przekazuje błędów z funkcji async do handlera błędów.
   Opakowanie robi to za nas, więc kontrolery nie potrzebują try/catch.
   ===================================================================== */

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/**
 * Opakowuje wszystkie funkcje kontrolera naraz: module.exports = withAsyncHandlers({ a, b })
 */
function withAsyncHandlers(handlers) {
  return Object.fromEntries(
    Object.entries(handlers).map(([name, handler]) => [name, asyncHandler(handler)])
  );
}

module.exports = { asyncHandler, withAsyncHandlers };
