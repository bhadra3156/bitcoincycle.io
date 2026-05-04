/**
 * chart.js — BitcoinCycle.io
 * Single clean wave: green rising, red falling
 * ATH dots = orange | ATL dots = blue | NOW = short dashed cyan (live)
 */

(function () {

  var chartInstance = null;

  function buildChartData() {
    var now     = new Date();
    var events  = window.btcEvents;
    var STEPS   = 400;

    // Filter 2022–2038
    var slice = events.filter(function (e) {
      var t = e.date.getTime();
      return (
        t >= new Date('2022-01-01').getTime() &&
        t <= new Date('2038-12-31').getTime()
      );
    });

    var first   = slice[0].date.getTime();
    var last    = slice[slice.length - 1].date.getTime();
    var totalMs = last - first;

    // Build 400 smooth cosine-interpolated points
    var smoothLabels = [];
    var smoothValues = [];

    for (var i = 0; i <= STEPS; i++) {
      var frac = i / STEPS;
      var ms   = first + frac * totalMs;
      var d    = new Date(ms);

      // Find which segment we're in
      var segIdx = 0;
      for (var j = 0; j < slice.length - 1; j++) {
        if (ms >= slice[j].date.getTime() && ms <= slice[j + 1].date.getTime()) {
          segIdx = j;
          break;
        }
      }
      var evA     = slice[segIdx];
      var evB     = slice[segIdx + 1] || evA;
      var segFrac = (ms - evA.date.getTime()) / ((evB.date.getTime() - evA.date.getTime()) || 1);

      var startVal = evA.type === 'ATH' ? 100 : 0;
      var endVal   = evB.type === 'ATH' ? 100 : 0;
      var ease     = (1 - Math.cos(segFrac * Math.PI)) / 2;
      var val      = startVal + (endVal - startVal) * ease;

      smoothLabels.push(window.fmtShort ? window.fmtShort(d) : d.toLocaleDateString());
      smoothValues.push(val);
    }

    // Sparse dot arrays — null everywhere except at real event positions
    var sparseValues = new Array(STEPS + 1).fill(null);
    var sparseColors = new Array(STEPS + 1).fill('transparent');
    var sparseRadius = new Array(STEPS + 1).fill(0);

    slice.forEach(function (e, i) {
      var f   = (e.date.getTime() - first) / totalMs;
      var idx = Math.round(f * STEPS);
      idx = Math.max(0, Math.min(STEPS, idx));
      sparseValues[idx] = e.type === 'ATH' ? 100 : 0;

      
sparseColors[idx] = e.type === 'ATH' ? '#FFD700' : '#4FC3F7';
      
      sparseRadius[idx] = (window.btcNextEvt && e.id === window.btcNextEvt.id) ? 10 : (e.date < now ? 5 : 7);
    });

    // NOW position index
    var nowFrac  = (now.getTime() - first) / totalMs;
    var nowIndex = Math.round(nowFrac * STEPS);
    nowIndex     = Math.max(1, Math.min(STEPS - 1, nowIndex));

    return {
      slice:        slice,
      smoothLabels: smoothLabels,
      smoothValues: smoothValues,
      sparseValues: sparseValues,
      sparseColors: sparseColors,
      sparseRadius: sparseRadius,
      nowIndex:     nowIndex,
      first:        first,
      last:         last,
      totalMs:      totalMs,
      STEPS:        STEPS
    };
  }

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

  // NOW line plugin — short, centred, live-updating
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
        var height  = area.bottom - area.top;
        var midY    = area.top + height / 2;
        var lineTop = midY - height * 0.22;
        var lineBot = midY + height * 0.22;

        c.save();

        // Short dashed cyan vertical line
        c.beginPath();
        c.setLineDash([5, 4]);
        c.moveTo(xPos, lineTop);
        c.lineTo(xPos, lineBot);
        c.strokeStyle = '#38BDF8';
        c.lineWidth   = 1.8;
        c.stroke();
        c.setLineDash([]);

        // Small "NOW" badge at midpoint
        c.font         = 'bold 10px "Space Mono", monospace';
        c.textAlign    = 'center';
        c.textBaseline = 'middle';
        var tw = c.measureText('NOW').width;
        var bx = xPos - tw / 2 - 7;
        var by = midY - 10;
        var bw = tw + 14;
        var bh = 20;

        c.fillStyle = 'rgba(10,10,10,0.88)';
        roundRect(c, bx, by, bw, bh, 4);
        c.fill();

        c.strokeStyle = '#38BDF8';
        c.lineWidth   = 1;
        roundRect(c, bx, by, bw, bh, 4);
        c.stroke();

        c.fillStyle = '#38BDF8';
        c.fillText('NOW', xPos, midY);

        c.restore();
      }
    };
  }

  function initChart() {
    var canvas = document.getElementById('pulseChart');
    if (!canvas || typeof Chart === 'undefined' || !window.btcEvents) return;

    var data         = buildChartData();
    var liveNowIndex = { val: data.nowIndex };
    var ctx          = canvas.getContext('2d');

    // Gradient fill
    var grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0,   'rgba(34,197,94,0.15)');
    grad.addColorStop(0.5, 'rgba(247,147,26,0.05)');
    grad.addColorStop(1,   'rgba(79,195,247,0.07)');

    var nowPlugin = makeNowPlugin(function () { return liveNowIndex.val; });

    chartInstance = new Chart(ctx, {
      type: 'line',
      plugins: [nowPlugin],
      data: {
        labels: data.smoothLabels,
        datasets: [
          // Dataset 1: smooth wave line — green rising, red falling, NO dots
          {
            label:           'Cycle',
            data:            data.smoothValues,
            borderWidth:     2.5,
            tension:         0,
            fill:            true,
            backgroundColor: grad,
            borderColor:     '#22C55E',
            segment: {
              borderColor: function (ctx) {
                return ctx.p1.parsed.y >= ctx.p0.parsed.y ? '#22C55E' : '#F43F5E';
              }
            },
            pointRadius:      0,
            pointHoverRadius: 0
          },
          // Dataset 2: event dots only — orange ATH, blue ATL, no line
          {
            label:                     'Events',
            data:                      data.sparseValues,
            borderWidth:               0,
            tension:                   0,
            fill:                      false,
            backgroundColor:           'transparent',
            borderColor:               'transparent',
            pointBackgroundColor:      data.sparseColors,
            pointBorderColor:          '#0A0A0A',
            pointBorderWidth:          2,
            pointRadius:               data.sparseRadius,
            pointHoverRadius:          data.sparseRadius.map(function (r) { return r > 0 ? r + 3 : 0; }),
            pointHoverBackgroundColor: data.sparseColors,
            pointHoverBorderColor:     '#ffffff',
            pointHoverBorderWidth:     2,
            showLine:                  false
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
            filter: function (item) {
              return item.datasetIndex === 1 && item.raw !== null;
            },
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
                var idx     = items[0].dataIndex;
                var frac    = idx / data.STEPS;
                var ms      = data.first + frac * data.totalMs;
                var closest = data.slice.reduce(function (best, e) {
                  return Math.abs(e.date.getTime() - ms) < Math.abs(best.date.getTime() - ms) ? e : best;
                });
                return closest ? closest.label : '';
              },
              label: function (item) {
                if (item.raw === null) return '';
                var idx     = item.dataIndex;
                var frac    = idx / data.STEPS;
                var ms      = data.first + frac * data.totalMs;
                var closest = data.slice.reduce(function (best, e) {
                  return Math.abs(e.date.getTime() - ms) < Math.abs(best.date.getTime() - ms) ? e : best;
                });
                return closest && window.fmtDate ? window.fmtDate(closest.date) : '';
              },
              labelColor: function (item) {
                var col = data.sparseColors[item.dataIndex];
                return {
                  backgroundColor: (col && col !== 'transparent') ? col : '#38BDF8',
                  borderColor:     'transparent',
                  borderRadius:    3
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
              maxTicksLimit: 8
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
              stepSize: 50
            },
            border: { color: '#1E2A3A' }
          }
        }
      }
    });

    // Live NOW line — recalculates every 60 seconds
    setInterval(function () {
      if (!chartInstance) return;
      var now2    = new Date();
      var frac2   = (now2.getTime() - data.first) / data.totalMs;
      var newIdx  = Math.round(frac2 * data.STEPS);
      newIdx      = Math.max(1, Math.min(data.STEPS - 1, newIdx));
      liveNowIndex.val = newIdx;
      chartInstance.update('none');
    }, 60000);
  }

  initChart();

})();
