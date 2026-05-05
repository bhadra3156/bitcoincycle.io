/**
 * BitcoinCycle.io — public/js/chart.js
 * Cycle Pulse Chart
 *
 * TASK 3 changes:
 *  - Removed "Today" marker / tooltip (was causing disappearing issues and slowing page)
 *  - Date labels on X axis: bigger, brighter, Bitcoin orange (#F7931A)
 *  - Y axis: shows "ATH" and "ATL" labels instead of numbers
 *  - All ATH points (cycle peaks) and ATL points (cycle troughs) are labelled
 *  - No hover popups on individual points — keeps page fast and clean
 */

(function () {
  'use strict';

  /* ── Cycle parameters ───────────────────────────────────────── */
  var ANCHOR      = new Date('2022-11-21');   // Cycle 4 ATL anchor
  var EXPAND_DAYS = 1064;                      // ATL → ATH
  var COMPRESS    = 364;                       // ATH → ATL
  var CYCLE_LEN   = EXPAND_DAYS + COMPRESS;   // 1428

  /* ── Colour palette ─────────────────────────────────────────── */
  var C_RISE  = '#34D399';   // expansion line (green)
  var C_FALL  = '#F87171';   // compression line (red)
  var C_ATH   = '#F0B429';   // ATH dots (amber)
  var C_ATL   = '#60A5FA';   // ATL dots (blue)
  var C_GRID  = 'rgba(255,255,255,0.05)';
  var C_ORANGE = '#F7931A';  // Bitcoin orange — for date labels

  /* ── Build the cycle data points ───────────────────────────── */
  // We plot from Cycle 4 anchor (Nov 2022) through ~Cycle 8 (2038)
  // Each cycle: sinusoidal rise for 1064 days, then fall for 364 days.
  // We normalise the Y axis so ATH = 1, ATL = 0.

  var POINT_DENSITY = 30; // one data point every N days — keeps rendering fast

  function msToDay(ms) {
    return ms / 86400000;
  }

  function dayToMs(d) {
    return d * 86400000;
  }

  function dateAddDays(base, days) {
    return new Date(base.getTime() + dayToMs(days));
  }

  // Generate smooth sinusoidal Y value for a given day within the cycle
  // pos = days within current 1428-day cycle (0 = ATL, 1064 = ATH, 1428 = next ATL)
  function cycleY(pos) {
    if (pos <= EXPAND_DAYS) {
      // Rising: 0 → 1 over 1064 days (smooth sine curve)
      return 0.5 - 0.5 * Math.cos(Math.PI * pos / EXPAND_DAYS);
    } else {
      // Falling: 1 → 0 over 364 days
      var p = (pos - EXPAND_DAYS) / COMPRESS;
      return 0.5 + 0.5 * Math.cos(Math.PI * p);
    }
  }

  // Build datasets
  var riseData  = [];  // expansion segments
  var fallData  = [];  // compression segments
  var athPoints = [];  // ATH markers
  var atlPoints = [];  // ATL markers (including anchor)

  // How many total cycles to show (from anchor)
  var TOTAL_DAYS = CYCLE_LEN * 4 + EXPAND_DAYS; // ~2038

  var day = 0;
  while (day <= TOTAL_DAYS) {
    var cycleOffset = day % CYCLE_LEN;
    var date = dateAddDays(ANCHOR, day);
    var y = cycleY(cycleOffset);

    var point = { x: date, y: y };

    if (cycleOffset <= EXPAND_DAYS) {
      riseData.push(point);
    } else {
      fallData.push(point);
    }

    day += POINT_DENSITY;
  }

  // ATL points: at day 0, 1428, 2856, 4284, 5712 ...
  var atlDay = 0;
  while (atlDay <= TOTAL_DAYS) {
    atlPoints.push({ x: dateAddDays(ANCHOR, atlDay), y: 0 });
    atlDay += CYCLE_LEN;
  }

  // ATH points: at day 1064, 2492, 3920, 5348 ...
  var athDay = EXPAND_DAYS;
  while (athDay <= TOTAL_DAYS) {
    athPoints.push({ x: dateAddDays(ANCHOR, athDay), y: 1 });
    athDay += CYCLE_LEN;
  }

  /* ── Wait for Chart.js to load ──────────────────────────────── */
  function tryRender() {
    var canvas = document.getElementById('pulseChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
      setTimeout(tryRender, 100);
      return;
    }
    renderChart(canvas);
  }

  function renderChart(canvas) {
    var ctx = canvas.getContext('2d');

    // Destroy existing chart if re-rendering
    if (canvas._chartInstance) {
      canvas._chartInstance.destroy();
    }

    var chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          /* Expansion (rising) line */
          {
            label: 'Rising (Expansion)',
            data: riseData,
            borderColor: C_RISE,
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.4,
            fill: {
              target: 'origin',
              above: 'rgba(52,211,153,0.07)'
            },
            parsing: false,
            order: 3
          },
          /* Compression (falling) line */
          {
            label: 'Falling (Compression)',
            data: fallData,
            borderColor: C_FALL,
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.4,
            fill: false,
            parsing: false,
            order: 3
          },
          /* ATH dots */
          {
            label: 'ATH',
            data: athPoints,
            borderColor: C_ATH,
            backgroundColor: C_ATH,
            pointRadius: 7,
            pointHoverRadius: 9,
            pointStyle: 'circle',
            borderWidth: 2,
            showLine: false,
            parsing: false,
            order: 1
          },
          /* ATL dots */
          {
            label: 'ATL',
            data: atlPoints,
            borderColor: C_ATL,
            backgroundColor: C_ATL,
            pointRadius: 7,
            pointHoverRadius: 9,
            pointStyle: 'circle',
            borderWidth: 2,
            showLine: false,
            parsing: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 400 },
        interaction: {
          mode: 'nearest',
          intersect: true   // only show tooltip when hovering exactly on a dot
        },
        plugins: {
          legend: { display: false },  // we use our own HTML legend
          tooltip: {
            enabled: true,
            filter: function (item) {
              // Only show tooltip for ATH and ATL dots, not line points
              return item.datasetIndex === 2 || item.datasetIndex === 3;
            },
            backgroundColor: 'rgba(13,13,15,0.95)',
            borderColor: 'rgba(247,147,26,0.3)',
            borderWidth: 1,
            padding: 10,
            titleFont: { family: "'Space Mono', monospace", size: 11 },
            bodyFont:  { family: "'Space Mono', monospace", size: 12 },
            titleColor: '#9BA3B8',
            bodyColor: '#EEEEF0',
            callbacks: {
              title: function (items) {
                if (!items.length) return '';
                var d = new Date(items[0].raw.x);
                return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              },
              label: function (item) {
                if (item.datasetIndex === 2) return '↑ All-Time High (ATH)';
                if (item.datasetIndex === 3) return '↓ All-Time Low (ATL)';
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'year',
              displayFormats: { year: 'MMM YYYY' }
            },
            grid: {
              color: C_GRID,
              drawBorder: false
            },
            ticks: {
              color: C_ORANGE,         // TASK 3: Bitcoin orange
              font: {
                family: "'Space Mono', monospace",
                size: 12,              // TASK 3: bigger
                weight: '700'          // TASK 3: bold
              },
              maxRotation: 0,
              maxTicksLimit: 8
            },
            border: { display: false }
          },
          y: {
            min: -0.05,
            max: 1.15,
            grid: {
              color: C_GRID,
              drawBorder: false
            },
            ticks: {
              // TASK 3: Show ATH / ATL text labels instead of 0/1 numbers
              color: function (ctx) {
                var val = ctx.tick.value;
                if (val >= 0.95) return C_ATH;   // amber for ATH
                if (val <= 0.05) return C_ATL;   // blue for ATL
                return 'rgba(0,0,0,0)';           // hide mid values
              },
              font: {
                family: "'Space Mono', monospace",
                size: 12,
                weight: '700'
              },
              callback: function (val) {
                if (val >= 0.95) return 'ATH';
                if (val <= 0.05) return 'ATL';
                return '';
              },
              stepSize: 1
            },
            border: { display: false }
          }
        }
      }
    });

    canvas._chartInstance = chart;
  }

  /* ── Init ───────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryRender);
  } else {
    tryRender();
  }

})();
