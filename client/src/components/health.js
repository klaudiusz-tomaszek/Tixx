/* =====================================================================
   Tixx – views/health.js
   Logika widoku Diagnostyka API: odpytuje /api/health i renderuje wyniki.
   Zależności: utils.js, api.js
   ===================================================================== */

function _healthTile(label, valueHtml, valueClass = 'fs-4 fw-bold') {
  return `
    <div class="col-sm-6 col-md-3">
      <div class="p-3 bg-body-tertiary rounded border">
        <div class="text-muted small">${label}</div>
        <div class="${valueClass}">${valueHtml}</div>
      </div>
    </div>`;
}

async function checkHealth() {
  const details = document.getElementById('health-details');

  setVisible('loading-spinner', true);
  setVisible('health-card', false);
  setVisible('raw-json-container', false);

  try {
    const data = await API.getHealth();

    details.innerHTML =
      _healthTile('Status', escapeHtml(String(data.status).toUpperCase()), 'fs-3 fw-bold text-success') +
      _healthTile('Uptime serwera', `${Math.round(data.uptime)} s`, 'fs-3 fw-bold') +
      _healthTile('Czas serwera', escapeHtml(data.serverTime || '–')) +
      _healthTile('Strefa czasowa', escapeHtml(data.timezone || 'UTC'));

    document.getElementById('output').textContent = JSON.stringify(data, null, 2);
    setVisible('raw-json-container', true);
  } catch (err) {
    details.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">
          <i class="ti ti-alert-triangle me-2"></i>Błąd pobierania danych: ${escapeHtml(err.message)}
        </div>
      </div>`;
  } finally {
    setVisible('health-card', true);
    setVisible('loading-spinner', false);
  }
}
