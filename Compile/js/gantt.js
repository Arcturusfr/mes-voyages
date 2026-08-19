// v2026-08-18_18h30 — modifs Claude : sous-division en semaines quand 1-2 mois affichés
// ── GANTT ─────────────────────────────────────────────────────
let monthOffset = new Date().getMonth();
const COL_STEPS = [1, 2, 3, 4, 6, 8, 12];
let visibleMonths = 4;

// Focus initial (une seule fois par chargement de l'app) sur le voyage en cours,
// sinon le prochain, sinon le dernier passé.
let didInitAutoFocus = false;
let pendingFocusTripId = null;

function getDefaultFocusTrip() {
  const now = new Date();
  const pool = trips.filter(t => t.status !== 'cancel');

  const ongoing = pool
    .filter(t => new Date(t.start) <= now && new Date(t.end) >= now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  if (ongoing) return ongoing;

  const upcoming = pool
    .filter(t => new Date(t.start) > now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  if (upcoming) return upcoming;

  const past = pool
    .filter(t => new Date(t.end) < now)
    .sort((a, b) => new Date(b.end) - new Date(a.end))[0];
  return past || null;
}

function changeVisibleMonths(d) {
  const idx = COL_STEPS.indexOf(visibleMonths);
  const newIdx = Math.min(COL_STEPS.length - 1, Math.max(0, idx + d));
  if (COL_STEPS[newIdx] === visibleMonths) return;
  visibleMonths = COL_STEPS[newIdx];
  renderGantt();
}

function changeYear(d) {
  cy += d;
  monthOffset = (cy === new Date().getFullYear()) ? new Date().getMonth() : 0;
  renderGantt();
}

function shiftMonths(d) {
  const sc = document.getElementById('gscroll');
  if (sc) sc.scrollLeft += d * getMonthColWidth();
}

function getMonthColWidth() {
  const wrap = document.querySelector('.gwrap');
  if (!wrap) return 80;
  return Math.floor((wrap.clientWidth - 312) / visibleMonths);
}

function renderGantt() {
  if (!didInitAutoFocus) {
    didInitAutoFocus = true;
    const target = getDefaultFocusTrip();
    if (target) {
      pendingFocusTripId = target.id;
      const ty = new Date(target.start).getFullYear();
      monthOffset = new Date(target.start).getMonth();
      if (ty !== cy) {
        cy = ty;
        renderGantt();
        return;
      }
    }
  }

  const allFiltered = ft();
  const list = allFiltered.filter(t => {
    const s = new Date(t.start), e = new Date(t.end);
    return s.getFullYear() <= cy && e.getFullYear() >= cy;
  }).sort((a, b) => new Date(a.start) - new Date(b.start));

  // Build alert map
  const groups  = computeGroups(trips.filter(t => t.status !== 'cancel'));
  const alertMap = {};
  groups.forEach(g => {
    if (g.stays.length >= 2) {
      const hasErr   = g.alerts.some(a => a.type === 'err');
      const warnIds  = new Set();
      for (let i = 0; i < g.stays.length; i++) {
        for (let j = i + 1; j < g.stays.length; j++) {
          const a = g.stays[i], b = g.stays[j];
          if (a.end === b.start || b.end === a.start) continue;
          const aEnd = new Date(a.end); aEnd.setDate(aEnd.getDate() + 1);
          const bEnd = new Date(b.end); bEnd.setDate(bEnd.getDate() + 1);
          const ov = Math.round((Math.min(aEnd, bEnd) - Math.max(new Date(a.start), new Date(b.start))) / 86400000);
          if (ov >= 1) { warnIds.add(a.id); warnIds.add(b.id); }
        }
      }
      g.stays.forEach(s => { alertMap[s.id] = { warn: warnIds.has(s.id), err: hasErr }; });
    } else {
      const s = g.stays[0];
      if (s.status !== 'cancel') alertMap[s.id] = { warn: false, err: checkSolo(s) === 'err' };
    }
  });

  const mcw   = getMonthColWidth();
  const total = leap(cy) ? 366 : 365;
  const now   = new Date();
  const isCY  = cy === now.getFullYear();
  const curMonth = now.getMonth();

  document.querySelector('.gwrap').style.setProperty('--mcw', mcw + 'px');

  // Sous-division en semaines (uniquement si 1 ou 2 mois affichés : assez de place pour rester lisible)
  const showWeeks = visibleMonths <= 2;
  const weekSepHtml = MF.map((_, i) => {
    if (!showWeeks) return '';
    const daysInMonth = new Date(cy, i + 1, 0).getDate();
    let html = '';
    for (let d = 2; d <= daysInMonth; d++) {
      if (new Date(cy, i, d).getDay() === 1) { // lundi = début de semaine
        const pct = ((d - 1) / daysInMonth) * 100;
        html += `<div class="gweek-sep" style="left:${pct}%"></div>`;
      }
    }
    return html;
  });

  const headMons = MF.map((m, i) =>
    `<div class="gh-mon${isCY && i === curMonth ? ' cur' : ''}">${m}${weekSepHtml[i]}</div>`
  ).join('');

  let rows = '';
  if (!list.length) {
    rows = `<div class="gempty"><span class="ic-roman">🌴</span> Aucun séjour en ${cy}${filter !== 'all' ? ' (filtre actif)' : ''}.</div>`;
  } else {
    list.forEach(t => {
      const days    = diy(t.start, t.end, cy);
      const leftPx  = Math.round((days.s / total) * 12 * mcw);
      const widthPx = Math.max(Math.round((days.c / total) * 12 * mcw), 8);
      const dur     = Math.round((new Date(t.end) - new Date(t.start)) / 86400000) + 1;
      const bc      = `gbar ${t.status === 'plan' ? 'sp' : t.status === 'cancel' ? 'sx' : ''}`;
      const col     = t.status === 'cancel' ? '#bbb' : (t.color || COLORS[0]);
      const al      = alertMap[t.id];
      let pill = '';
      if (al) {
        if (al.warn && al.err) pill = `<span class="gpill gpill-warn">⚠</span><span class="gpill gpill-err">✕</span>`;
        else if (al.warn)      pill = `<span class="gpill gpill-warn">⚠</span>`;
        else if (al.err)       pill = `<span class="gpill gpill-err">✕</span>`;
        else                   pill = `<span class="gpill gpill-ok">✓</span>`;
      }

      const cols = Array(12).fill(0).map((_, i) =>
        `<div class="gcol${isCY && i === curMonth ? ' cur' : ''}">${weekSepHtml[i]}</div>`
      ).join('');

      rows += `<div class="gantt-row" data-tid="${t.id}" onclick="openDetail('${t.id}')">
        <div class="ginfo">
          <div class="gdest">${t.destination}${pill}</div>
          ${t.hotel ? `<div class="ghotel"><span class="ic-roman">🏡</span> ${t.hotel}${(t.hotelSvcs || []).map(k => { const s = HOTEL_SVCS.find(x => x.key === k); return s ? `<span class="ghotel-svc">${s.icon}</span>` : ''; }).join('')}</div>` : ''}
          <div class="gdates-row">${fd(t.start)} → ${fd(t.end)}</div>
          <div class="gmeta">${badge(t.status)}<span class="gdur">${dur}j</span></div>
        </div>
        <div class="gcols">
          ${cols}
          <div class="gbar-track">
            <div class="${bc}" style="left:${leftPx}px;width:${widthPx}px;background:${col}" title="${t.destination}">
              ${dur >= 10 ? t.destination : ''}
            </div>
          </div>
        </div>
      </div>`;
    });
  }

  document.getElementById('gantt').innerHTML = `
    <div class="gtable">
      <div class="gantt-head">
        <div class="gh-label">
          <div class="gh-label-title">Séjours</div>
          <div class="gh-year-nav">
            <button class="gh-yr-btn" onclick="changeYear(-1)">‹</button>
            <span class="gh-year">${cy}</span>
            <button class="gh-yr-btn" onclick="changeYear(1)">›</button>
          </div>
          <div class="gh-col-nav" title="Nombre de mois affichés">
            <button class="gh-yr-btn" onclick="changeVisibleMonths(-1)"${visibleMonths === COL_STEPS[0] ? ' disabled' : ''}>−</button>
            <span class="gh-col-count">${visibleMonths}</span>
            <button class="gh-yr-btn" onclick="changeVisibleMonths(1)"${visibleMonths === COL_STEPS[COL_STEPS.length - 1] ? ' disabled' : ''}>+</button>
          </div>
        </div>
        ${headMons}
      </div>
      ${rows}
    </div>`;

  const sc = document.getElementById('gscroll');
  if (sc) {
    sc.scrollLeft = Math.max(0, (monthOffset - 0.5) * mcw);
    initDrag(sc);
  }

  if (pendingFocusTripId) {
    const focusId = pendingFocusTripId;
    pendingFocusTripId = null;
    requestAnimationFrame(() => {
      const rowEl = document.querySelector(`.gantt-row[data-tid="${focusId}"]`);
      if (rowEl) rowEl.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  }

  renderGroupPanel(groups, cy);

  requestAnimationFrame(() => {
    const head = document.querySelector('.gantt-head');
    if (head) document.querySelector('.gwrap').style.setProperty('--head-h', head.offsetHeight + 'px');
  });
}

// ── DRAG TO SCROLL ─────────────────────────────────────────────
function initDrag(el) {
  if (el._dragInit) return;
  el._dragInit = true;
  let isDown = false, startX = 0, scrollStart = 0;

  el.addEventListener('mousedown', e => {
    isDown = true; startX = e.pageX; scrollStart = el.scrollLeft;
    el.classList.add('dragging');
  });
  window.addEventListener('mousemove', e => {
    if (!isDown) return;
    el.scrollLeft = scrollStart - (e.pageX - startX);
  });
  window.addEventListener('mouseup', () => { isDown = false; el.classList.remove('dragging'); });
  el.addEventListener('touchend', () => {
    const mcw = getMonthColWidth();
    if (mcw > 0) monthOffset = Math.round(el.scrollLeft / mcw);
  });
}

// ── DAY-IN-YEAR ───────────────────────────────────────────────
function diy(s, e, y) {
  const ys = new Date(y, 0, 1), ye = new Date(y, 11, 31);
  const st = new Date(Math.max(new Date(s), ys)), en = new Date(Math.min(new Date(e), ye));
  const doy = d => { const t = new Date(d.getFullYear(), 0, 0); return Math.floor((d - t) / 86400000); };
  return { s: doy(st) - 1, c: Math.max(0, (en - st) / 86400000 + 1) };
}

function leap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// ── CONTROL PANEL ─────────────────────────────────────────────
function toggleCtrlPanel() {
  document.getElementById('mctrl').classList.add('open');
}

function renderGroupPanel(groups, year) {
  const wrap = document.getElementById('gpanel-wrap');

  const items = [];
  groups.forEach((g, gi) => {
    const inYear = g.stays.some(s => new Date(s.start).getFullYear() <= year && new Date(s.end).getFullYear() >= year);
    if (!inYear) return;
    if (g.stays.length >= 2) {
      items.push({ type:'group', g, gi });
    } else {
      const s = g.stays[0];
      if (s.status !== 'cancel' && checkSolo(s) === 'err') items.push({ type:'solo', s });
    }
  });

  const alerts = items.filter(item =>
    item.type === 'group' ? item.g.alerts.some(a => a.type !== 'ok') : true
  );

  if (!alerts.length) {
    wrap.innerHTML = '<div style="padding:20px;text-align:center;color:#bbb;font-style:italic"><span class="ic-roman">✓</span> Aucun problème détecté pour cette année.</div>';
    return;
  }

  let h = `<div class="gpanel">
    <div class="gpanel-hd">⚠ ${alerts.length} voyage${alerts.length > 1 ? 's' : ''} nécessitant votre attention</div>`;

  alerts.forEach((item, i) => {
    if (item.type === 'group') {
      const g = item.g, gi = item.gi;
      const first = g.stays[0], last = g.stays[g.stays.length - 1];
      const totalDur = Math.round((new Date(last.end) - new Date(first.start)) / 86400000) + 1;
      const alertsHtml = g.alerts.map(a =>
        `<span class="galert galert-${a.type}">${a.type==='ok'?'✓':a.type==='warn'?'⚠️':'✕'} ${a.msg}</span>`
      ).join('');
      h += `<div class="ggroup">
        <div class="ggroup-hd" onclick="toggleGroup('gg${gi}')">
          <div class="ggroup-name">${first.destination}${g.stays.length > 2 ? ' → … ' : ' → '}${last.destination}</div>
          <span class="ggroup-dates">${fd(first.start)} – ${fd(last.end)} · ${totalDur}j</span>
          <div class="ggroup-alerts">${alertsHtml}</div>
        </div>
        <div class="ggroup-stays" id="gg${gi}">
          ${g.stays.map(s => {
            const dur = Math.round((new Date(s.end) - new Date(s.start)) / 86400000) + 1;
            return `<div class="gstay" onclick="openDetail('${s.id}')">
              <div class="gstay-dot" style="background:${s.color || COLORS[0]}"></div>
              <span class="gstay-name">${s.destination}</span>
              <span class="gstay-dates">${fd(s.start)} → ${fd(s.end)} (${dur}j)</span>
              ${s.hotel ? `<span class="gstay-hotel"><span class="ic-roman">🏡</span> ${s.hotel}</span>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    } else {
      const s = item.s;
      const dur = Math.round((new Date(s.end) - new Date(s.start)) / 86400000) + 1;
      h += `<div class="ggroup">
        <div class="ggroup-hd" onclick="openDetail('${s.id}')">
          <div class="gstay-dot" style="background:${s.color || COLORS[0]};width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>
          <div class="ggroup-name" style="font-size:.92rem">${s.destination}</div>
          <span class="ggroup-dates">${fd(s.start)} – ${fd(s.end)} · ${dur}j</span>
          <span class="galert galert-err">✕ Aucun transport confirmé</span>
        </div>
      </div>`;
    }
  });

  h += `</div>`;
  wrap.innerHTML = h;
}

function toggleGroup(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}
