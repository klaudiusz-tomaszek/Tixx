/* =====================================================================
   Tixx – views/health.js
   Logika widoku Diagnostyka API: odpytuje /api/health i renderuje wyniki.
   Zależności: api.js
   ===================================================================== */

async function checkHealth() {
  const loading      = document.getElementById('loading-spinner');
  const healthCard   = document.getElementById('health-card');
  const rawContainer = document.getElementById('raw-json-container');
  const output       = document.getElementById('output');
  const details      = document.getElementById('health-details');

  loading.classList.remove('d-none');
  healthCard.classList.add('d-none');
  rawContainer.classList.add('d-none');

  try {
    const data = await API.getHealth();

    details.innerHTML = `
      <div class="col-sm-6 col-md-3">
        <div class="p-3 bg-body-tertiary rounded border">
          <div class="text-muted small">Status</div>
          <div class="fs-3 fw-bold text-success">${data.status.toUpperCase()}</div>
        </div>
      </div>
      <div class="col-sm-6 col-md-3">
        <div class="p-3 bg-body-tertiary rounded border">
          <div class="text-muted small">Uptime serwera</div>
          <div class="fs-3 fw-bold">${Math.round(data.uptime)} s</div>
        </div>
      </div>
      <div class="col-sm-6 col-md-3">
        <div class="p-3 bg-body-tertiary rounded border">
          <div class="text-muted small">Czas serwera</div>
          <div class="fs-4 fw-bold">${data.serverTime || '–'}</div>
        </div>
      </div>
      <div class="col-sm-6 col-md-3">
        <div class="p-3 bg-body-tertiary rounded border">
          <div class="text-muted small">Strefa czasowa</div>
          <div class="fs-4 fw-bold">${data.timezone || 'UTC'}</div>
        </div>
      </div>`;

    healthCard.classList.remove('d-none');
    output.textContent = JSON.stringify(data, null, 2);
    rawContainer.classList.remove('d-none');

  } catch (err) {
    details.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">
          <i class="ti ti-alert-triangle me-2"></i>Błąd pobierania danych: ${err.message}
        </div>
      </div>`;
    healthCard.classList.remove('d-none');

  } finally {
    loading.classList.add('d-none');
  }
}

