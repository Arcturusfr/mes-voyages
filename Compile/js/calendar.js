// ── CALENDAR ─────────────────────────────────────────────────
function changeMonth(d) {
  cm += d;
  if (cm > 11) { cm = 0; cy++; }
  if (cm < 0)  { cm = 11; cy--; }
  renderCal();
}

function renderCal() {
  document.getElementById('ctitle').textContent = `${MFL[cm]} ${cy}`;
  const f     = new Date(cy, cm, 1);
  const l     = new Date(cy, cm + 1, 0);
  const sdow  = (f.getDay() + 6) % 7;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let cells = [];
  for (let i = sdow - 1; i >= 0; i--) cells.push({ d: new Date(cy, cm, -i), o: true });
  for (let d = 1; d <= l.getDate(); d++) cells.push({ d: new Date(cy, cm, d), o: false });
  const rem = 42 - cells.length;
  for (let i = 1; i <= rem; i++) cells.push({ d: new Date(cy, cm + 1, i), o: true });

  const list = ft();

  // ── LANE ASSIGNMENT ──────────────────────────────────────────
  const sorted    = [...list].sort((a, b) => new Date(a.start) - new Date(b.start));
  const laneEndDate = [];
  const stayLane  = {};

  sorted.forEach(t => {
    const tStart = new Date(t.start); tStart.setHours(0,0,0,0);
    const tEnd   = new Date(t.end);   tEnd.setHours(0,0,0,0);
    let lane = 0;
    while (laneEndDate[lane] && laneEndDate[lane] >= tStart) lane++;
    stayLane[t.id]   = lane;
    laneEndDate[lane] = tEnd;
  });

  const maxLane = Math.max(0, ...Object.values(stayLane));

  document.getElementById('cbody').innerHTML = cells.map(c => {
    const it = c.d.getTime() === today.getTime();

    const dt = list.filter(t => {
      const s = new Date(t.start); s.setHours(0,0,0,0);
      const e = new Date(t.end);   e.setHours(0,0,0,0);
      return c.d >= s && c.d <= e;
    });

    const slots = Array(maxLane + 1).fill(null);
    dt.forEach(t => { slots[stayLane[t.id]] = t; });

    const evHtml = slots.map(t => {
      if (!t) return `<div style="height:18px;margin-bottom:2px"></div>`;
      const tStart  = new Date(t.start); tStart.setHours(0,0,0,0);
      const tEnd    = new Date(t.end);   tEnd.setHours(0,0,0,0);
      const isStart = c.d.getTime() === tStart.getTime();
      const isEnd   = c.d.getTime() === tEnd.getTime();
      const isSolo  = isStart && isEnd;
      const posClass = isSolo ? 'ev-solo' : isStart ? 'ev-start' : isEnd ? 'ev-end' : 'ev-full';
      const stClass  = t.status === 'plan' ? 'sp' : t.status === 'cancel' ? 'sx' : '';
      const bg       = t.status === 'cancel' ? '#bbb' : (t.color || COLORS[0]);
      const showLabel = !isStart && !isEnd;
      return `<div class="cev-wrap" onclick="event.stopPropagation();openDetail('${t.id}')">
        <div class="cev ${posClass} ${stClass}" style="background:${bg}">${showLabel ? t.destination : ''}</div>
      </div>`;
    }).join('');

    return `<div class="ccell ${c.o ? 'om' : ''} ${it ? 'td' : ''}"><div class="cdate">${c.d.getDate()}</div>${evHtml}</div>`;
  }).join('');
}
