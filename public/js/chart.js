/**
 * chart.js — BitcoinCycle.io
 * Interactive Cycle Pulse Chart using Chart.js
 */

(function() {
  function initChart() {
    const canvas = document.getElementById('pulseChart');
    if (!canvas || typeof Chart === 'undefined' || !window.btcEvents) return;

    const now    = new Date();
    const events = window.btcEvents;

    const slice = events.filter(e => {
      const t = e.date.getTime();
      return t >= new Date('2022-01-01').getTime() && t <= new Date('2038-12-31').getTime();
    });

    const labels   = slice.map(e => window.fmtShort ? window.fmtShort(e.date) : e.date.toLocaleDateString());
    const values   = slice.map(e => e.type === 'ATH' ? 100 : 0);

    // 🟠 ATH = orange, 🔵 ATL = blue
    const ptColors = slice.map(e => e.type === 'ATH' ? '#F7931A' : '#4FC3F7');
    const ptRadius = slice.map(e => {
      if (window.btcNextEvt && e.id === window.btcNextEvt.id) return 9;
      return e.date < now ? 4 : 6;
    });

    const nowIdx = slice.findIndex(e => e.date > now);

    const ctx = canvas.getContext('2d');

    // Fill gradient: green top → orange mid → blue bottom
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0,   'rgba(34,197,94,0.18)');
    grad.addColorStop(0.5, 'rgba(247,147,26,0.06)');
    grad.addColorStop(1,   'rgba(79,195,247,0.08)');

    // "NOW" vertical line plugin — label in the MIDDLE
    const nowLinePlugin = {
      id: 'nowLine',
      afterDraw(chart) {
        if (nowIdx < 0) return;
        const { ctx: c, chartArea: { top, bottom }, scales: { x } } = chart;
        const x0   = x.getPixelForValue(nowIdx - 1);
        const x1   = x.getPixelForValue(nowIdx);
        const prev = slice[nowIdx - 1];
        const next = slice[nowIdx];
        const frac = prev && next
          ? (now - prev.date) / (next.date - prev.date)
          : 0.5;
        const xPos = x0 + (x1 - x0) * frac;

        c.save();

        // Dashed vertical line
        c.beginPath();
        c.setLineDash([4, 3]);
        c.moveTo(xPos, top);
        c.lineTo(xPos, bottom);
        c.strokeStyle = '#38BDF8';
        c.lineWidth   = 1.5;
        c.stroke();

        // Label at vertical MIDDLE
        c.setLineDash([]);
        const midY = top + (bottom - top) / 2;
        c.font          = 'bold 11px "Space Mono", monospace';
        c.textAlign     = 'center';
        c.textBaseline  = 'middle';
        const tw        = c.measureText('NOW').width;

        c.fillStyle   = 'rgba(10,10,10,0.85)';
        c.fillRect(xPos - tw / 2 - 8, midY - 11, tw + 16, 22);
        c.strokeStyle = '#F7931A';
        c.lineWidth   = 1;
        c.strokeRect(xPos - tw / 2 - 8, midY - 11, tw + 16, 22);
        c.fillStyle   = '#F7931A';
        c.fillText('NOW', xPos, midY);

        c.restore();
      }
    };

    new Chart(ctx, {
      type: 'line',
      plugins: [nowLinePlugin],
      data: {
        labels,
        datasets: [{
          data:                    values,
          borderWidth:             2.5,
          tension:                 0.42,
          fill:                    true,
          backgroundColor:         grad,
          borderColor:             '#22C55E',   // fallback
          segment: {
            // 🟢 going UP = green | 🔴 going DOWN = red
            borderColor: ctx =>
              ctx.p1.parsed.y >= ctx.p0.parsed.y ? '#22C55E' : '#F43F5E'
          },
          pointBackgroundColor:    ptColors,
          pointBorderColor:        '#0A0A0A',
          pointBorderWidth:        2,
          pointRadius:             ptRadius,
          pointHoverRadius:        10,
          pointHoverBorderWidth:   2,
          pointHoverBackgroundColor: ptColors,
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           { duration: 900, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor:  '#11151F',
            borderColor:      '#1E2A3A',
            borderWidth:      1,
            titleColor:       '#E0E0E0',
            bodyColor:        '#9AA5B4',
            padding:          12,
            cornerRadius:     8,
            titleFont:        { family: "'Space Mono', monospace", size: 11 },
            bodyFont:         { family: "'DM Sans', sans-serif", size: 12 },
            callbacks: {
              title:  items  => slice[items[0].dataIndex]?.label || '',
              label:  item   => {
                const e = slice[item.dataIndex];
                if (!e) return '';
                return window.fmtDate ? window.fmtDate(e.date) : e.date.toLocaleDateString();
              },
              labelColor: item => ({
                backgroundColor: slice[item.dataIndex]?.type === 'ATH' ? '#F7931A' : '#4FC3F7',
                borderColor:     'transparent',
                borderRadius:    3,
              })
            }
          }
        },
        scales: {
          x: {
            grid:  { color: 'rgba(30,42,58,0.6)', drawBorder: false },
            ticks: {
              color: '#5A6A7A',
              font:  { family: "'Space Mono', monospace", size: 10 },
              maxRotation: 0, autoSkip: true, maxTicksLimit: 8,
            },
            border: { color: '#1E2A3A' }
          },
          y: {
            min: -10, max: 115,
            grid:  { color: 'rgba(30,42,58,0.6)', drawBorder: false },
            ticks: {
              color:    '#5A6A7A',
              font:     { family: "'Space Mono', monospace", size: 10 },
              callback: v => v === 100 ? 'ATH' : v === 0 ? 'ATL' : '',
              stepSize: 50,
            },
            border: { color: '#1E2A3A' }
          }
        }
      }
    });
  }

  initChart();
})();
