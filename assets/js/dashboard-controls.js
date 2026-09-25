/*
 * COALMINE-X monitoring controls and per-day history
 * --------------------------------------------------
 * This file is intentionally separate from app.js so Start/Stop and history
 * can be changed without touching the simulation/rendering code.
 *
 * Storage format (localStorage key: coalmineX.dailyHistory.v1):
 * {
 *   "2026-09-25": [
 *     { time, running, displacement, rate, methane, ppv, risk, eta, alerts }
 *   ]
 * }
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'coalmineX.dailyHistory.v1';
  const MAX_DAYS = 30;
  const MAX_SAMPLES_PER_DAY = 500;
  const AUTO_SAVE_MS = 60 * 1000; // Change this to alter auto-save frequency.

  const byId = (id) => document.getElementById(id);
  const startButton = byId('startSystem');
  const stopButton = byId('stopSystem');
  const statusBadge = byId('monitorStatus');
  const dateInput = byId('historyDate');

  /** Return YYYY-MM-DD using the operator's local timezone. */
  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Safely load history. Corrupt browser data is ignored instead of breaking UI. */
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      console.warn('Could not read saved history:', error);
      return {};
    }
  }

  function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  /** Keep storage bounded to the newest 30 calendar days. */
  function trimOldDays(history) {
    const dates = Object.keys(history).sort().reverse();
    dates.slice(MAX_DAYS).forEach((date) => delete history[date]);
    return history;
  }

  /** Read one snapshot from the existing simulation state in app.js. */
  function createSnapshot() {
    const now = new Date();
    return {
      timestamp: now.toISOString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      running: !S.pause,
      displacement: Number(S.Z.A.d.toFixed(2)),
      rate: Number(S.Z.A.r.toFixed(2)),
      methane: Number(S.ch4.toFixed(3)),
      ppv: Number(S.ppv.toFixed(2)),
      risk: Math.round(score('A')),
      eta: Number(eta().toFixed(2)),
      alerts: S.al.filter((item) => item.sev !== 'info').length
    };
  }

  function recordReading(showFeedback = false) {
    if (!S || !S.Z) return;
    const history = loadHistory();
    const day = localDateKey();
    history[day] = history[day] || [];
    history[day].push(createSnapshot());
    history[day] = history[day].slice(-MAX_SAMPLES_PER_DAY);
    saveHistory(trimOldDays(history));
    renderHistory();

    if (showFeedback) {
      const button = byId('saveReadingNow');
      const originalText = button.textContent;
      button.textContent = 'Saved ✓';
      setTimeout(() => { button.textContent = originalText; }, 1200);
    }
  }

  function average(items, key) {
    if (!items.length) return 0;
    return items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length;
  }

  function summarizeDay(date, readings) {
    const displacementValues = readings.map((x) => x.displacement);
    return {
      date,
      samples: readings.length,
      avgDisplacement: average(readings, 'displacement'),
      minDisplacement: Math.min(...displacementValues),
      maxDisplacement: Math.max(...displacementValues),
      avgMethane: average(readings, 'methane'),
      peakMethane: Math.max(...readings.map((x) => x.methane)),
      avgPpv: average(readings, 'ppv'),
      maxRisk: Math.max(...readings.map((x) => x.risk)),
      maxAlerts: Math.max(...readings.map((x) => x.alerts))
    };
  }

  function renderHistory() {
    const history = loadHistory();
    const dates = Object.keys(history).filter((date) => history[date].length).sort().reverse();
    const summaries = dates.map((date) => summarizeDay(date, history[date]));
    const selectedDate = dateInput.value || localDateKey();
    const selected = history[selectedDate] || [];

    byId('dailyHistoryRows').innerHTML = summaries.length
      ? summaries.map((day) => `
        <tr>
          <td><b>${day.date}</b></td><td>${day.samples}</td>
          <td>${day.avgDisplacement.toFixed(2)} mm</td>
          <td>${day.minDisplacement.toFixed(2)} / ${day.maxDisplacement.toFixed(2)} mm</td>
          <td>${day.avgMethane.toFixed(3)}%</td><td>${day.peakMethane.toFixed(3)}%</td>
          <td>${day.avgPpv.toFixed(2)} mm/s</td><td>${day.maxRisk}/100</td><td>${day.maxAlerts}</td>
        </tr>`).join('')
      : '<tr><td colspan="9" class="empty-state">No history yet. Start monitoring or save a reading.</td></tr>';

    byId('selectedDayRows').innerHTML = selected.length
      ? [...selected].reverse().map((item) => `
        <tr>
          <td>${item.time}</td>
          <td><span class="chip ${item.running ? 'ok' : 'cr'}">${item.running ? 'Running' : 'Stopped'}</span></td>
          <td>${item.displacement.toFixed(2)} mm</td><td>${item.rate.toFixed(2)} mm/d</td>
          <td>${item.methane.toFixed(3)}%</td><td>${item.ppv.toFixed(2)} mm/s</td>
          <td>${item.risk}/100</td><td>${item.eta.toFixed(2)} d</td>
        </tr>`).join('')
      : '<tr><td colspan="8" class="empty-state">No readings for the selected date.</td></tr>';

    const totalSamples = summaries.reduce((sum, item) => sum + item.samples, 0);
    const latest = selected[selected.length - 1];
    byId('historyKpis').innerHTML = `
      <div class="k"><small>Stored days</small><div>${dates.length}</div><span>maximum ${MAX_DAYS} days</span></div>
      <div class="k"><small>Total samples</small><div>${totalSamples}</div><span>browser local storage</span></div>
      <div class="k"><small>Selected date</small><div>${selected.length}</div><span>readings</span></div>
      <div class="k"><small>Latest displacement</small><div>${latest ? latest.displacement.toFixed(2) + ' mm' : '—'}</div><span>${latest ? latest.time : 'no reading'}</span></div>`;
  }

  function setMonitoring(running) {
    S.pause = !running;
    statusBadge.textContent = running ? '● Monitoring Running' : '■ Monitoring Stopped';
    statusBadge.className = `monitor-status ${running ? 'running' : 'stopped'}`;
    startButton.classList.toggle('active', running);
    stopButton.classList.toggle('active', !running);
    startButton.disabled = running;
    stopButton.disabled = !running;
    document.body.classList.toggle('monitoring-stopped', !running);

    // Keep the original preview button synchronized with the new controls.
    recordReading(false);
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv() {
    const history = loadHistory();
    const header = ['date','time','status','displacement_mm','rate_mm_per_day','methane_pct','ppv_mm_per_s','risk_score','eta_days','active_alerts'];
    const rows = [header];
    Object.keys(history).sort().forEach((date) => {
      history[date].forEach((item) => rows.push([
        date, item.time, item.running ? 'Running' : 'Stopped', item.displacement,
        item.rate, item.methane, item.ppv, item.risk, item.eta, item.alerts
      ]));
    });
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coalmine-x-history-${localDateKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Event wiring ------------------------------------------------------------
  startButton.addEventListener('click', () => setMonitoring(true));
  stopButton.addEventListener('click', () => setMonitoring(false));
  byId('saveReadingNow').addEventListener('click', () => recordReading(true));
  byId('exportHistory').addEventListener('click', exportCsv);
  dateInput.addEventListener('change', renderHistory);
  byId('clearHistory').addEventListener('click', () => {
    if (window.confirm('Delete all locally saved reading history?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderHistory();
    }
  });

  dateInput.value = localDateKey();
  setMonitoring(true);       // Save an initial reading and show Running state.
  renderHistory();
  setInterval(() => { if (!S.pause) recordReading(false); }, AUTO_SAVE_MS);
})();
