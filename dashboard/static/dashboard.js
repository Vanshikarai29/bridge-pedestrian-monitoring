const API_BASE = "/api";
const POLL_MS = 3000;

const els = {
  bridgeId: document.getElementById("bridgeId"),
  connStatus: document.getElementById("connStatus"),
  occNumber: document.getElementById("occNumber"),
  occThreshold: document.getElementById("occThreshold"),
  occBarFill: document.getElementById("occBarFill"),
  alertPill: document.getElementById("alertPill"),
  thresholdForm: document.getElementById("thresholdForm"),
  thresholdInput: document.getElementById("thresholdInput"),
  alertList: document.getElementById("alertList"),
  trendHint: document.getElementById("trendHint"),
};

let chart = null;

function initChart() {
  const ctx = document.getElementById("footfallChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "In",
          data: [],
          backgroundColor: "rgba(47, 212, 192, 0.75)",
          borderRadius: 3,
        },
        {
          label: "Out",
          data: [],
          backgroundColor: "rgba(132, 150, 171, 0.55)",
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 250 },
      scales: {
        x: {
          ticks: { color: "#8496ab", font: { family: "Inconsolata", size: 10 } },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#8496ab", precision: 0 },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
      plugins: {
        legend: { labels: { color: "#e7edf5", boxWidth: 12, font: { size: 11 } } },
      },
    },
  });
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

async function fetchJSON(url, options) {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function pollOccupancy(bridgeId) {
  const data = await fetchJSON(`${API_BASE}/occupancy/${encodeURIComponent(bridgeId)}`);
  els.occNumber.textContent = data.occupancy;
  els.occThreshold.textContent = data.threshold;
  els.thresholdInput.placeholder = String(data.threshold);

  const pct = Math.min(100, (data.occupancy / Math.max(1, data.threshold)) * 100);
  els.occBarFill.style.width = `${pct}%`;

  if (data.alert_active) {
    els.alertPill.textContent = "overcrowded";
    els.alertPill.classList.add("alert");
    els.occBarFill.classList.add("alert");
  } else {
    els.alertPill.textContent = "nominal";
    els.alertPill.classList.remove("alert");
    els.occBarFill.classList.remove("alert");
  }
}

async function pollFootfall(bridgeId) {
  if (!chart) return; 
  const data = await fetchJSON(
    `${API_BASE}/footfall/${encodeURIComponent(bridgeId)}?bucket_minutes=5&hours=1`
  );
  const labels = data.buckets.map((b) => fmtTime(b.bucket_start));
  const inSeries = data.buckets.map((b) => b.in);
  const outSeries = data.buckets.map((b) => b.out);

  chart.data.labels = labels;
  chart.data.datasets[0].data = inSeries;
  chart.data.datasets[1].data = outSeries;
  chart.update();

  els.trendHint.textContent = data.buckets.length
    ? `last hour, ${data.bucket_minutes}-min buckets`
    : "no crossings recorded yet";
}

async function pollAlerts(bridgeId) {
  const alerts = await fetchJSON(`${API_BASE}/alerts/${encodeURIComponent(bridgeId)}`);
  if (!alerts.length) {
    els.alertList.innerHTML = '<li class="empty-state">No alerts recorded yet.</li>';
    return;
  }
  els.alertList.innerHTML = alerts
    .slice(0, 8)
    .map((a) => {
      const statusLabel = a.active ? "ACTIVE" : "cleared";
      return `<li class="alert-item ${a.active ? "" : "cleared"}">
        <span>Occupancy hit ${a.occupancy_at_alert} (threshold ${a.threshold_at_alert})</span>
        <span class="a-meta">${statusLabel} &middot; ${fmtTime(a.started_at)}</span>
      </li>`;
    })
    .join("");
}

async function pollAll() {
  const bridgeId = els.bridgeId.value.trim() || "bridge-1";
  try {
    await Promise.all([pollOccupancy(bridgeId), pollFootfall(bridgeId), pollAlerts(bridgeId)]);
    els.connStatus.classList.remove("err");
    els.connStatus.classList.add("ok");
  } catch (err) {
    els.connStatus.classList.remove("ok");
    els.connStatus.classList.add("err");
    console.error("Dashboard poll failed:", err.message);
  }
}

els.thresholdForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const bridgeId = els.bridgeId.value.trim() || "bridge-1";
  const value = parseInt(els.thresholdInput.value, 10);
  if (!value || value <= 0) return;
  try {
    await fetchJSON(`${API_BASE}/threshold/${encodeURIComponent(bridgeId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: value }),
    });
    els.thresholdInput.value = "";
    pollAll();
  } catch (err) {
    alert(`Could not update threshold: ${err.message}`);
  }
});

els.bridgeId.addEventListener("change", pollAll);

try {
  initChart();
} catch (err) {
  console.error(
    "Chart.js failed to load — footfall chart disabled, rest of dashboard still works.",
    err,
  );
}
pollAll();
setInterval(pollAll, POLL_MS);
// initChart();
// pollAll();
// setInterval(pollAll, POLL_MS);
