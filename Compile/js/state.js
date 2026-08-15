// ── STATE ─────────────────────────────────────────────────────
let trips   = JSON.parse(localStorage.getItem('mv-trips')  || '[]');
let dests   = JSON.parse(localStorage.getItem('mv-dests')  || '[]');
let hotels  = JSON.parse(localStorage.getItem('mv-hotels') || '[]');
let clItems = JSON.parse(localStorage.getItem('mv-cl-items')|| '[]');

let filter = 'all';
let view   = 'timeline';
let cy     = new Date().getFullYear();
let cm     = new Date().getMonth();

// Trip modal state
let eid   = null;
let scol  = COLORS[0];
let stSt  = 'plan';
let ctr   = [];   // current transports
let etIdx = null; // editing transport index
let tfSt  = 'plan';
let clr   = [];   // current car rentals
let elIdx = null; // editing car rental index
let lfSt  = 'plan';

// Checklist state
let clVoyageId  = null;
let clActiveCat = 'bagages';

// ── PERSISTENCE ────────────────────────────────────────────────
function save() {
  localStorage.setItem('mv-trips', JSON.stringify(trips));
  dests  = [...new Set(trips.map(t => t.destination).filter(Boolean))].sort();
  hotels = [...new Set(trips.map(t => t.hotel).filter(Boolean))].sort();
  localStorage.setItem('mv-dests',    JSON.stringify(dests));
  localStorage.setItem('mv-hotels',   JSON.stringify(hotels));
  localStorage.setItem('mv-cl-items', JSON.stringify(clItems));
}

function gid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── FILTER HELPER ──────────────────────────────────────────────
function ft() {
  return filter === 'all' ? trips : trips.filter(t => t.status === filter);
}
