/**
 * countdown.js — BitcoinCycle.io
 * Live countdown with skeleton → live transition
 */

(function() {
  function removeSkeletons() {
    ['cd-d','cd-h','cd-m','cd-s'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('skeleton-val');
    });
    const dateEl = document.getElementById('cd-date');
    if (dateEl) dateEl.classList.remove('skeleton-text');
  }

  function pad(n, len) {
    return String(n).padStart(len || 2, '0');
  }

  function tick() {
    const nextEvent = window.btcNextEvt;
    if (!nextEvent) return;

    const diff = nextEvent.date - new Date();

    if (diff <= 0) {
      // Event passed — refresh the page or reload state
      ['cd-d','cd-h','cd-m','cd-s'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      const dateEl = document.getElementById('cd-date');
      if (dateEl) dateEl.innerHTML = '<strong>Event reached!</strong> — Refresh for next cycle.';
      return;
    }

    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const dEl = document.getElementById('cd-d');
    const hEl = document.getElementById('cd-h');
    const mEl = document.getElementById('cd-m');
    const sEl = document.getElementById('cd-s');
    if (dEl) dEl.textContent = pad(days, 3);
    if (hEl) hEl.textContent = pad(hours);
    if (mEl) mEl.textContent = pad(minutes);
    if (sEl) sEl.textContent = pad(seconds);

    const dateEl = document.getElementById('cd-date');
    if (dateEl && window.fmtDate) {
      dateEl.innerHTML = `Predicted for <strong>${window.fmtDate(nextEvent.date)}</strong> &nbsp;·&nbsp; Cycle <strong>${nextEvent.cycle}</strong>`;
    }
  }

  function initCountdown() {
    const nextEvent = window.btcNextEvt;
    if (!nextEvent) return;

    // Set badge
    const badge = document.getElementById('evt-badge');
    if (badge) {
      badge.textContent = (nextEvent.type === 'ATH' ? '↑ ATH — ' : '↓ ATL — ') + nextEvent.label;
      badge.className   = 'evt-badge ' + (nextEvent.type === 'ATH' ? 'evt-ath' : 'evt-atl');
    }
    // Set wrapper accent
    const wrap = document.getElementById('cd-wrap');
    if (wrap && nextEvent.type === 'ATL') wrap.classList.add('atl-next');

    // Remove skeletons immediately, then start ticking
    removeSkeletons();
    tick();
    setInterval(tick, 1000);
  }

  // Scripts run after body — DOM and window.btcNextEvt are both ready
  initCountdown();
})();
