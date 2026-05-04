/**
 * main.js — BitcoinCycle.io
 * Date Engine + shared state + table render
 */

// ═══ CONSTANTS ═══
const EXP   = 1064;   // Expansion: ATL → ATH
const COMP  = 364;    // Compression: ATH → ATL
const ANCHOR = '2022-11-21'; // FTX bottom ATL

// ═══ DATE ENGINE ═══
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtShort(d) {
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

window.fmtDate  = fmtDate;
window.fmtShort = fmtShort;

function generateCycles(endYear = 2050) {
  const anchor = new Date(ANCHOR);
  const endDate = new Date(endYear + '-12-31');
  const events = [{
    id: 0, cycle: 1, type: 'ATL', date: new Date(anchor),
    days: 0, label: 'Cycle Origin (FTX Bottom)'
  }];
  let cur = new Date(anchor), isExp = true, cycle = 1;

  while (cur < endDate) {
    const days = isExp ? EXP : COMP;
    cur = addDays(cur, days);
    if (cur > endDate) break;
    const type = isExp ? 'ATH' : 'ATL';
    if (type === 'ATH') cycle++;
    events.push({
      id: events.length, cycle, type, date: new Date(cur),
      days, label: `Cycle ${cycle} ${type === 'ATH' ? 'Peak' : 'Bottom'}`
    });
    isExp = !isExp;
  }
  return events;
}

// ═══ SHARED STATE ═══
const events    = generateCycles(2050);
const now       = new Date();
const nextEvent = events.find(e => e.date > now);
const prevEvent = [...events].reverse().find(e => e.date <= now);

window.btcEvents   = events;
window.btcNextEvt  = nextEvent;
window.btcPrevEvt  = prevEvent;

// ═══ PREV STAT ═══
if (prevEvent) {
  const val = document.getElementById('prev-val');
  const sub = document.getElementById('prev-sub');
  if (val) {
    val.textContent  = prevEvent.type;
    val.className    = 'stat-val ' + (prevEvent.type === 'ATH' ? 'c-btc' : 'c-atl');
    val.style.height = '';
  }
  if (sub) {
    sub.textContent  = fmtDate(prevEvent.date);
    sub.style.height = '';
  }
}

// ═══ PREDICTION TEXT ═══
const allATH = events.filter(e => e.type === 'ATH');
const allATL = events.filter(e => e.type === 'ATL');
const nextATH = allATH.find(e => e.date > now);
const nextATL = allATL.find(e => e.date > now);
const nadEl = document.getElementById('next-ath-date');
const nalEl = document.getElementById('next-atl-date');
if (nadEl && nextATH) nadEl.textContent = fmtDate(nextATH.date);
if (nalEl && nextATL) nalEl.textContent = fmtDate(nextATL.date);

// ═══ TABLE ═══
let tableFilter = 'ALL';
let showAll     = false;

window.setFilter = function(f) {
  tableFilter = f;
  showAll = false;
  renderTable();
  ['ALL','ATH','ATL'].forEach(x => {
    const b = document.getElementById('f-' + x);
    if (!b) return;
    b.className = 'fbtn' + (x === f ? ' a-' + f.toLowerCase() : '');
  });
};

window.toggleShowAll = function() {
  showAll = !showAll;
  renderTable();
  const btn = document.getElementById('show-more-btn');
  if (btn) btn.setAttribute('aria-expanded', showAll);
};

function renderTable() {
  const base = tableFilter === 'ALL' ? events : events.filter(e => e.type === tableFilter);
  const rows = showAll ? base : base.slice(0, 16);
  const tb   = document.getElementById('tbl-body');
  if (!tb) return;

  tb.innerHTML = rows.map((e, i) => {
    const isPast  = e.date <= now;
    const isNext  = nextEvent && e.id === nextEvent.id;
    const status  = isPast ? '✓ PAST' : isNext ? '⬡ NEXT' : '○ FUTURE';
    const sCls    = isPast ? '' : isNext ? 'c-acc' : '';
    const trCls   = [isPast ? 'is-past' : '', isNext ? 'is-next' : ''].join(' ').trim();
    const typeIcon = e.type === 'ATH' ? '↑' : '↓';
    const tpCls    = e.type === 'ATH' ? 'tp-ath' : 'tp-atl';
    const durColor = e.days === EXP ? 'c-btc' : e.days === COMP ? 'c-atl' : 'c-acc';
    const durText  = e.days === 0 ? 'Origin' : e.days.toLocaleString() + ' days';

    return `<tr class="${trCls}">
      <td><span class="mono" style="color:var(--text3)">${String(i + 1).padStart(2,'0')}</span></td>
      <td><span class="mono" style="color:var(--text3)">${e.cycle}</span></td>
      <td><span class="tp ${tpCls}">${typeIcon} ${e.type}</span></td>
      <td><span class="mono" style="color:var(--text1)">${fmtDate(e.date)}</span></td>
      <td><span class="mono ${durColor}">${durText}</span></td>
      <td><span style="font-family:var(--mono);font-size:10px;letter-spacing:1px" class="${sCls}">${status}</span></td>
    </tr>`;
  }).join('');

  const total = base.length;
  const lbl   = document.getElementById('show-label');
  const ico   = document.getElementById('show-icon');
  if (lbl) lbl.textContent = showAll ? 'SHOW LESS' : `SHOW ALL ${total} EVENTS`;
  if (ico) ico.innerHTML   = showAll
    ? '<polyline points="18 15 12 9 6 15"/>'
    : '<polyline points="6 9 12 15 18 9"/>';
}

// Init table — scripts run after body, DOM is ready
renderTable();
