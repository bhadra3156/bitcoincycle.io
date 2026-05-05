/**
 * chart.js — BitcoinCycle.io
 * Single clean wave: green rising, red falling
 * ATH dots = yellow (#FFD700) | ATL dots = blue (#4FC3F7) | TODAY = dashed cyan (live, every second)
 * CHANGES:
 *   - "NOW" label changed to "TODAY" with auto current date below it
 *   - Hover tooltips show event name + full date
 */

(function () {

  var chartInstance = null;

  // Rounded rectangle helper
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

  // Format today's date for the badge, e.g. "5 May 2026"
  function getTodayLabel() {
    var now = new Date();
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
  }

  // TODAY line plugin — full height dashed cyan, "TODAY" badge + current date
  function makeNowPlugin(getNowIndex) {
    return {
      id: 'nowLine',
      afterDraw: function (chart) {
        var idx = getNowIndex();
        if (idx < 0) return;

        var c = chart.ctx;
        var area = chart.chartArea;
        var x = chart.scales.x;
        var xPos = x.getPixelForValue(idx);
        var midY = (area.top + area.bottom) / 2;

        c.save();

        // Full-height dashed cyan vertical line
        c.beginPath();
        c.setLineDash([6, 4]);
        c.moveTo(xPos, area.top);
        c.lineTo(xPos, area.bottom);
        c.strokeStyle = '#38BDF8';
        c.lineWidth = 1.5;
        c.globalAlpha = 0.6;
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;

        // "TODAY" badge with date underneath — centred at vertical midpoint
        var todayLabel = getTodayLabel();
        c.font = 'bold 10px "Space Mono", monospace';
        c.textAlign = 'center';
        c.textBaseline = 'middle';

        var twToday = c.measureText('TODAY').width;
        c.font = '9px "Space Mono", monospace';
        var twDate = c.measureText(todayLabel).width;
        var badgeW = Math.max(twToday, twDate) + 16;
        var badgeH = 36;

        var bx = xPos - badgeW / 2;
        var by = midY - badgeH / 2;

        // Badge background
        c.fillStyle = 'rgba(10,10,10,0.92)';
        roundRect(c, bx, by, badgeW, badgeH, 5);
        c.fill();

        // Badge border
        c.strokeStyle = '#38BDF8';
        c.lineWidth = 1.2;
        roundRect(c, bx, by, badgeW, badgeH, 5);
        c.stroke();

        // "TODAY" text
        c.font = 'bold 10px "Space Mono", monospace';
        c.fillStyle = '#38BDF8';
        c.fillText('TODAY', xPos, midY - 9);

        // Date text below
        c.font = '8px "Space Mono", monospace';
        c.fillStyle = 'rgba(56,189,248,0.7)';
        c.fillText(todayLabel, xPos, midY + 9);

        c.restore();
      }
    };
  }

  function buildChartData() {
    var now = new Date();
    var events = window.btcEvents;
    var STEPS = 400;

    // Filter 2022–2038
    var slice = events.filter(function (e) {
      var t = e.date.getTime();
      return (
        t >= new Date('2022-01-01').getTime() &&
        t <= new Date('2038-12-31').getTime()
      );
    });

    var first = slice[0].date.getTime();
    var last = slice[slice.length - 1].date.getTime();
    var totalMs = last - first;

    // Build 400 smooth cosine-interpolated points
    var smoothLabels = [];
    var smoothValues = [];

    for (var i = 0; i <= STEPS; i++) {
      var frac = i / STEPS;
      var ms = first + frac * totalMs;
      var d = new Date(ms);

      // Find which segment we're in
      var segIdx = 0;
      for (var j = 0; j < slice.length - 1; j++) {
        if (ms >= slice[j].date.getTime() && ms <= slice[j + 1].date.getTime()) {
          segIdx = j;
          break;
        }
      }

      var evA = slice[segIdx];
      var evB = slice[segIdx + 1] || evA;
      var segFrac = (ms - evA.date.getTime()) / ((evB.date.getTime() - evA.date.getTime()) || 1);

      var startVal = evA.type === 'ATH' ? 100 : 0;
      var endVal = evB.type === 'ATH' ? 100 : 0;
      var ease = (1 - Math.cos(segFrac * Math.PI)) / 2;
      var val = startVal + (endVal - startVal) * ease;

      smoothLabels.push(window.fmtShort ? window.fmtShort(d) : d.toLocaleDateString());
      smoothValues.push(val);
    }

    // Sparse dot arrays — null everywhere except at real event positions
    var sparseValues = new Array(STEPS + 1).fill(null);
    var sparseColors = new Array(STEPS + 1).fill('transparent');
    var sparseRadius = new Array(STEPS + 1).fill(0);

    // Map event index to event for tooltip lookup
    var indexToEvent = {};

    slice.forEach(function (e) {
      var f = (e.date.getTime() - first) / totalMs;
      var idx = Math.round(f * STEPS);
      idx = Math.max(0, Math.min(STEPS, idx));

      sparseValues[idx] = e.type === 'ATH' ? 100 : 0;
      sparseColors[idx] = e.type === 'ATH' ? '#FFD700' : '#4FC3F7';
      sparseRadius[idx] = (window.btcNextEvt && e.id === window.btcNextEvt.id) ? 10 : (e.date < now ? 5 : 7);
      indexToEvent[idx] = e;
    });

    // NOW position index
    var nowFrac = (now.getTime() - first) / totalMs;
    var nowIndex = Math.round(nowFrac * STEPS);
    nowIndex = Math.max(1, Math.min(STEPS - 1, nowIndex));

    return {
      slice: slice,
      smoothLabels: smoothLabels,
      smoothValues: smoothValues,
      sparseValues: sparseValues,
      sparseColors: sparseColors,
      sparseRadius: sparseRadius,
      indexToEvent: indexToEvent,
      nowIndex: nowIndex,
      first: first,
      last: last,
      totalMs: totalMs,
      STEPS: STEPS
    };
  }

  function initChart() {
    var canvas = document.getElementById('pulseChart');
    if (!canvas || typeof Chart === 'undefined' || !window.btcEvents) return;

    var data = buildChartData();
    var liveNowIndex = { val: data.nowIndex };
    var ctx = canvas.getContext('2d');

    // Gradient fill
    var grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, 'rgba(34,197,94,0.15)');
    grad.addColorStop(0.5, 'rgba(247,147,26,0.05)');
    grad.addColorStop(1, 'rgba(79,195,247,0.07)');

    var nowPlugin = makeNowPlugin(function () { return liveNowIndex.val; });

    chartInstance = new Chart(ctx, {
      type: 'line',
      plugins: [nowPlugin],
      data: {
        labels: data.smoothLabels,
        datasets: [
          // Dataset 1: smooth wave line — green rising, red falling, NO dots
          {
            label: 'Cycle',
            data: data.smoothValues,
            borderWidth: 2.5,
            tension: 0,
            fill: true,
            backgroundColor: grad,
            borderColor: '#22C55E',
            segment: {
              borderColor: function (ctx) {
                return ctx.p1.parsed.y >= ctx.p0.parsed.y ? '#22C55E' : '#F43F5E';
              }
            },
            pointRadius: 0,
            pointHoverRadius: 0
          },
          // Dataset 2: event dots only — yellow ATH, blue ATL, no connecting line
          {
            label: 'Events',
            data: data.sparseValues,
            borderWidth: 0,
            tension: 0,
            fill: false,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            pointBackgroundColor: data.sparseColors,
            pointBorderColor: '#0A0A0A',
            pointBorderWidth: 2,
            pointRadius: data.sparseRadius,
            pointHoverRadius: data.sparseRadius.map(function (r) { return r > 0 ? r + 3 : 0; }),
            pointHoverBackgroundColor: data.sparseColors,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            // Only show tooltip when hovering an actual event dot
            filter: function (item) {
              return item.datasetIndex === 1 && item.raw !== null;
            },
            backgroundColor: '#11151F',
            borderColor: '#38BDF8',
            borderWidth: 1,
            titleColor: '#F0F0F0',
            bodyColor: '#B0BCC8',
            padding: 14,
            cornerRadius: 8,
            titleFont: { family: "'Space Mono', monospace", size: 12, weight: 'bold' },
            bodyFont: { family: "'DM Sans', sans-serif", size: 13 },
            callbacks: {
              // Title: event type + cycle number e.g. "↑ ATH — Cycle 2 Peak"
              title: function (items) {
                var idx = items[0].dataIndex;
                var evt = data.indexToEvent[idx];
                if (!evt) return '';
                var icon = evt.type === 'ATH' ? '🟡' : '🔵';
                var label = evt.type === 'ATH' ? 'ATH — Cycle Peak' : 'ATL — Cycle Bottom';
                return icon + ' ' + label;
              },
              // Body: the full predicted date
              label: function (item) {
                var idx = item.dataIndex;
                var evt = data.indexToEvent[idx];
                if (!evt) return '';
                var d = evt.date;
                var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                var dateStr = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
                return '📅 ' + dateStr;
              },
              // Colour swatch
              labelColor: function (item) {
                var col = data.sparseColors[item.dataIndex];
                return {
                  backgroundColor: (col && col !== 'transparent') ? col : '#38BDF8',
                  borderColor: 'transparent',
                  borderRadius: 3
                };
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(30,42,58,0.5)', drawBorder: false },
            ticks: {
              color: '#5A6A7A',
              font: { family: "'Space Mono', monospace", size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            },
            border: { color: '#1E2A3A' }
          },
          y: {
            min: -12,
            max: 118,
            grid: { color: 'rgba(30,42,58,0.5)', drawBorder: false },
            ticks: {
              color: '#5A6A7A',
              font: { family: "'Space Mono', monospace", size: 10 },
              callback: function (v) { return v === 100 ? 'ATH' : v === 0 ? 'ATL' : ''; },
              stepSize: 50
            },
            border: { color: '#1E2A3A' }
          }
        }
      }
    });

    // Live TODAY line — updates every second
    setInterval(function () {
      if (!chartInstance) return;
      var now2 = new Date();
      var frac2 = (now2.getTime() - data.first) / data.totalMs;
      var newIdx = Math.round(frac2 * data.STEPS);
      newIdx = Math.max(1, Math.min(data.STEPS - 1, newIdx));
      liveNowIndex.val = newIdx;
      chartInstance.update('none');
    }, 1000);
  }

  initChart();

})();
