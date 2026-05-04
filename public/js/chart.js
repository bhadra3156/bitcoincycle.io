/**
 * chart.js — BitcoinCycle.io
 * Single clean sine-wave line: green rising, red falling
 * ATH dots = orange | ATL dots = blue | NOW = short dashed cyan line (live)
 */

(function () {

  var chartInstance = null;

  function buildChartData() {
    var now    = new Date();
    var events = window.btcEvents;

    // Filter 2022–2038
    var slice = events.filter(function (e) {
      var t = e.date.getTime();
      return (
        t >= new Date('2022-01-01').getTime() &&
        t <= new Date('2038-12-31').getTime()
      );
    });

    // ── Build a SMOOTH sine-wave path between events ──────────────────────
    // Instead of connecting raw events (which causes multiple overlapping
    // lines), we generate ~400 interpolated points along a sine curve.
    var STEPS = 400;
    var first = slice[0].date.getTime();
    var last  = slice[slice.length - 1].date.getTime();
    var totalMs = last - first;

    var smoothLabels = [];
    var smoothValues = [];
    var smoothColors = []; // per-point segment color metadata (unused directly)

    for (var i = 0; i <= STEPS; i++) {
      var frac = i / STEPS;
      var ms   = first + frac * totalMs;
      var d    = new Date(ms);

      // Find which two events we are between
      var segIdx = 0;
      for (var j = 0; j < slice.length - 1; j++) {
        if (ms >= slice[j].date.getTime() && ms <= slice[j + 1].date.getTime()) {
          segIdx = j;
          break;
        }
      }
      var evA = slice[segIdx];
      var evB = slice[segIdx + 1] || evA;
      var segFrac = (ms - evA.date.getTime()) / (evB.date.getTime() - evA.date.getTime() || 1);

      // Smooth cosine interpolation between 100 (ATH) and 0 (ATL)
      var startVal = evA.type === 'ATH' ? 100 : 0;
      var endVal   = evB.type === 'ATH' ? 100 : 0;
      var ease     = (1 - Math.cos(segFrac * Math.PI)) / 2;
      var val      = startVal + (endVal - startVal) * ease;

      smoothLabels.push(window.fmtShort ? window.fmtShort(d) : d.toLocaleDateString());
      smoothValues.push(val);
    }

    // ── Event dot overlay dataset (ATH=orange, ATL=blue) ──────────────────
    var dotLabels = slice.map(function (e) {
      return window.fmtShort ? window.fmtShort(e.date) : e.date.toLocaleDateString();
    });
    var dotValues = slice.map(function (e) { return e.type === 'ATH' ? 100 : 0; });
    var dotColors = slice.map(function (e) { return e.type === 'ATH' ? '#F7931A' : '#4FC3F7'; });
    var dotRadius = slice.map(function (e) {
      if (window.btcNextEvt && e.id === window.btcNextEvt.id) return 10;
      return e.date < now ? 5 : 7;
    });

    // ── NOW position: fraction index along smooth data ─────────────────────
    var nowFrac   = (now.getTime() - first) / totalMs;
    var nowIndex  = Math.round(nowFrac * STEPS);
    nowIndex      = Math.max(1, Math.min(STEPS - 1, nowIndex));

    return {
      slice:        slice,
      smoothLabels: smoothLabels,
      smoothValues: smoothValues,
      dotLabels:    dotLabels,
      dotValues:    dotValues,
      dotColors:    dotColors,
      dotRadius:    dotRadius,
      nowIndex:     nowIndex,
      now:          now,
      first:        first,
      last:         last
    };
  }

  // ── NOW line plugin — SHORT (only middle 40% of chart height) ───────────
  function makeNowPlugin(getNowIndex) {
    return {
      id: 'nowLine',
      afterDraw: function (chart) {
        var idx = getNowIndex();
        if (idx < 0) return;

        var c    = chart.ctx;
        var area = chart.chartArea;
        var x    = chart.scales.x;

        var xPos    = x.getPixelForValue(idx);
        var midY    = area.top + (area.bottom - area.top) / 2;
        var lineTop = midY - (area.bottom - area.top) * 0.22;   // 22% above mid
        var lineBot = midY + (area.bottom - area.top) * 0.22;   // 22% below mid

        c.save();

        // Dashed vertical cyan line (short, centred)
        c.beginPath();
        c.setLineDash([5, 4]);
        c.moveTo(xPos, lineTop);
        c.lineTo(xPos, lineBot);
        c.strokeStyle = '#38BDF8';
        c.lineWidth   = 1.8;
        c.stroke();
        c.setLineDash([]);

        // "NOW" label — small badge at mid-point
        c.font         = 'bold 10px "Space Mono", monospace';
        c.textAlign    = 'center';
        c.textBaseline = 'middle';
        var tw = c.measureText('NOW').width;
        var bx = xPos - tw / 2 - 7;
        var by = midY - 10;
        var bw = tw + 14;
        var bh = 20;

        // Badge background
        c.fillStyle = 'rgba(10,10,10,0.88)';
        roundRect(c, bx, by, bw, bh, 4);
        c.fill();

        // Badge border
        c.strokeStyle = '#38BDF8';
        c.lineWidth   = 1;
        roundRect(c, bx, by, bw, bh, 4);
        c.stroke();

        // Badge text
        c.fillStyle = '#38BDF8';
        c.fillText('NOW', xPos, midY);

        c.restore();
      }
    };
  }

  // Helper: rounded rectangle path
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function initChart() {
    var canvas = document.getElementById('pulseChart');
    if (!canvas || typeof Chart === 'undefined' || !window.btcEvents) return;

    var data = buildChartData();

    // Live nowIndex reference (mutated by the 1-minute updater)
    var liveNowIndex = { val: data.nowIndex };

    var ctx  = canvas.getContext('2d');

    // Gradient fill under the curve
    var grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0,   'rgba(34,197,94,0.15)');
    grad.addColorStop(0.5, 'rgba(247,147,26,0.05)');
    grad.addColorStop(1,   'rgba(79,195,247,0.07)');

    var nowPlugin = makeNowPlugin(function () { return liveNowIndex.val; });

    // ── Map smooth X indices to event dot X positions ─────────────────────
    // Dot dataset uses sparse data: null everywhere except at event positions
    // We need to find which smooth-label index matches each event date.
    var STEPS        = data.smoothValues.length - 1;
    var first        = data.first;
    var totalMs      = data.last - first;
    var sparseValues = new Array(STEPS + 1).fill(null);
    var sparseColors = new Array(STEPS + 1).fill('transparent');
    var sparseRadius = new Array(STEPS + 1).fill(0);

    data.slice.forEach(function (e, i) {
      var frac = (e.date.getTime() - first) / totalMs;
      var idx  = Math.round(frac * STEPS);
      idx = Math.max(0, Math.min(STEPS, idx));
      sparseValues[idx] = data.dotValues[i];
      sparseColors[idx] = data.dotColors[i];
      sparseRadius[idx] = data.dotRadius[i];
    });

    chartInstance = new Chart(ctx, {
      type: 'line',
      plugins: [nowPlugin],
      data: {
        labels: data.smoothLabels,
        datasets: [
          // ── Dataset 1: Smooth wave line (green up / red down) ────────────
          {
            label:           'Cycle',
            data:            data.smoothValues,
            borderWidth:     2.5,
            tension:         0,          // we already smooth manually
            fill:            true,
            backgroundColor: grad,
            borderColor:     '#22C55E',  // fallback (overridden per segment)
            segment: {
              borderColor: function (ctx) {
                return ctx.p1.parsed.y >= ctx.p0.parsed.y ? '#22C55E' : '#F43F5E';
              }
            },
            // No dots on the line itself
            pointRadius:     0,
            pointHoverRadius: 0,
          },
          // ── Dataset 2: Event dots only (orange ATH, blue ATL) ────────────
          {
            label:                     'Events',
            data:                      sparseValues,
            borderWidth:               0,
            tension:                   0,
            fill:                      false,
            backgroundColor:           'transparent',
            borderColor:               'transparent',
            pointBackgroundColor:      sparseColors,
            pointBorderColor:          '#0A0A0A',
            pointBorderWidth:          2,
            pointRadius:               sparseRadius,
            pointHoverRadius:          sparseRadius.map(function (r) { return r > 0 ? r + 3 : 0; }),
            pointHoverBackgroundColor: sparseColors,
            pointHoverBorderColor:     '#ffffff',
            pointHoverBorderWidth:     2,
            showLine:                  false,  // dots only, no connecting line
          }
        ]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           { duration: 800, easing: 'easeOutQuart' },
        interaction:         { mode: 'index', intersect: false },

        plugins: {
          legend: { display: false },

          tooltip: {
            filter: function (item) { return item.datasetIndex === 1 && item.raw !== null; },
            backgroundColor: '#11151F',
            borderColor:     '#1E2A3A',
            borderWidth:     1,
            titleColor:      '#E0E0E0',
            bodyColor:       '#9AA5B4',
            padding:         12,
            cornerRadius:    8,
            titleFont: { family: "'Space Mono', monospace", size: 11 },
            bodyFont:  { family: "'DM Sans', sans-serif",   size: 12 },
            callbacks: {
              title: function (items) {
                // Find the event at this index
                var idx = items[0].dataIndex;
                var frac = idx / STEPS;
                var ms   = first + frac * totalMs;
                var closest = data.slice.reduce(function (best, e) {
                  return Math.abs(e.date.getTime() - ms) < Math.abs(best.date.getTime() - ms) ? e : best;
                });
                return closest ? closest.label : '';
              },
              label: function (item) {
                if (item.raw === null) return '';
                var idx = item.dataIndex;
                var frac = idx / STEPS;
                var ms   = first + frac * totalMs;
                var closest = data.slice.reduce(function (best, e) {
                  return Math.abs(e.date.getTime() - ms) < Math.abs(best.date.getTime() - ms) ? e : best;
                });
                return closest && window.fmtDate ? window.fmtDate(closest.date) : '';
              },
              labelColor: function (item) {
                var idx = item.dataIndex;
                return {
                  backgroundColor: sparseColors[idx] !== 'transparent' ? sparseColors[idx] : '#38BDF8',
                  borderColor:     'transparent',
                  borderRadius:    3,
                };
              }
            }
          }
        },

        scales: {
          x: {
            grid:  { color: 'rgba(30,42,58,0.5)', drawBorder: false },
            ticks: {
              color:         '#5A6A7A',
              font:          { family: "'Space Mono', monospace", size: 10 },
              maxRotation:   0,
              autoSkip:      true,
              maxTicksLimit: 8,
            },
            border: { color: '#1E2A3A' }
          },
          y: {
            min: -12,
            max: 118,
            grid:  { color: 'rgba(30,42,58,0.5)', drawBorder: false },
            ticks: {
              color:    '#5A6A7A',
              font:     { family: "'Space Mono', monospace", size: 10 },
              callback: function (v) { return v === 100 ? 'ATH' : v === 0 ? 'ATL' : ''; },
              stepSize: 50,
            },
            border: { color: '#1E2A3A' }
          }
        }
      }
    });

    // ── Live NOW line updater — recalculates every 60 seconds ──────────────
    setInterval(function () {
      if (!chartInstance) return;
      var now2    = new Date();
      var frac2   = (now2.getTime() - first) / totalMs;
      var newIdx  = Math.round(frac2 * STEPS);
      newIdx      = Math.max(1, Math.min(STEPS - 1, newIdx));
      liveNowIndex.val = newIdx;
      chartInstance.update('none'); // redraw without animation
    }, 60000); // every 60 seconds
  }

  initChart();

})();
