// ── THEME ──────────────────────────────────────────────────────
function getThemes() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return {
    all:    { bg: dark ? '#0d2535' : '#1a5f80', tx: 'rgba(255,255,255,.95)', sep: 'rgba(255,255,255,.15)' },
    plan:   { bg: dark ? '#2a2210' : '#7a5a00', tx: dark ? '#e8cc60' : '#fff8d0', sep: 'rgba(255,220,100,.2)' },
    confirm:{ bg: dark ? '#0a2518' : '#1a5a30', tx: dark ? '#60e090' : '#d0ffe0', sep: 'rgba(80,200,120,.2)' },
    cancel: { bg: dark ? '#250a0a' : '#7a2020', tx: dark ? '#e07070' : '#ffe0e0', sep: 'rgba(200,80,80,.2)' },
  };
}

function applyTheme(f) {
  const themes = getThemes();
  const t      = themes[f] || themes.all;
  const root   = document.documentElement;
  root.style.setProperty('--theme-bg',  t.bg);
  root.style.setProperty('--theme-tx',  t.tx);
  root.style.setProperty('--theme-sep', t.sep);
  document.querySelectorAll('.gh-label').forEach(el => {
    el.style.background = t.bg; el.style.color = t.tx;
  });
  const sl = document.getElementById('sbar-left');
  sl.className = 'sbar-left tc-' + f;
}

function toggleTheme() {
  const isDark   = document.documentElement.dataset.theme === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.dataset.theme = newTheme;
  localStorage.setItem('mv-theme', newTheme);
  document.getElementById('btn-theme').textContent = newTheme === 'dark' ? '☀️' : '🌙';
  applyTheme(filter);
  render();
}

function initTheme() {
  const saved      = localStorage.getItem('mv-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme      = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── FILTER ────────────────────────────────────────────────────
function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.ftab').forEach(b => {
    b.className = 'ftab';
    if (b === btn) b.classList.add(f === 'all' ? 'fa' : f === 'plan' ? 'fp' : f === 'confirm' ? 'fc' : 'fx');
  });
  applyTheme(f);
  stats(); render();
}

// ── VIEWS ─────────────────────────────────────────────────────
function switchView(v) {
  view = v;
  document.querySelectorAll('.vbtn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && v === 'timeline') || (i === 1 && v === 'calendar'))
  );
  document.getElementById('vt').classList.toggle('active', v === 'timeline');
  document.getElementById('vc').classList.toggle('active', v === 'calendar');
  render();
}

function render() {
  view === 'timeline' ? renderGantt() : renderCal();
}

// ── EXPORT / IMPORT ───────────────────────────────────────────
function exportData() {
  const data = {
    version:    2,
    exportedAt: new Date().toISOString(),
    trips,
    clItems,
    clTemplates: {
      bagages: JSON.parse(localStorage.getItem('mv-cl-tpl-bagages') || '[]'),
      surSoi:  JSON.parse(localStorage.getItem('mv-cl-tpl-surSoi')  || '[]'),
      actions: JSON.parse(localStorage.getItem('mv-cl-tpl-actions') || '[]'),
    }
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `mes-voyages-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  showToast('✅ Données exportées !');
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const imp  = Array.isArray(data) ? data : (data.trips || []);
      if (!imp.length) { showToast('⚠️ Fichier vide ou invalide.'); return; }
      const merge = confirm(`Importer ${imp.length} voyage(s) ?\n\nOK = Fusionner\nAnnuler = Remplacer`);
      if (merge) {
        const ids = new Set(trips.map(t => t.id));
        trips = [...trips, ...imp.filter(t => !ids.has(t.id))];
      } else {
        trips = imp;
      }
      if (data.clTemplates) {
        ['bagages','surSoi','actions'].forEach(cat => {
          if (data.clTemplates[cat] && data.clTemplates[cat].length)
            localStorage.setItem('mv-cl-tpl-' + cat, JSON.stringify(data.clTemplates[cat]));
        });
      }
      if (data.clItems && data.clItems.length) {
        clItems = [...new Set([...clItems, ...data.clItems])];
      }
      save(); stats(); render();
      showToast(`✅ ${imp.length} voyage(s) importé(s)${data.clTemplates ? ' + modèles check-list' : ''}!`);
    } catch { showToast('❌ Erreur de lecture.'); }
    e.target.value = '';
  };
  r.readAsText(file);
}

// ── TAB NAVIGATION (in trip modal) ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tabbtn').forEach(btn => {
    btn.addEventListener('click', function () {
      const tab = this.dataset.tab;
      document.querySelectorAll('.tabbtn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tabpane').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      document.getElementById(tab).classList.add('active');
    });
  });
});

// ── INIT ──────────────────────────────────────────────────────
// Migrate old data (v1 → v2)
if (trips.length && !trips[0].hasOwnProperty('status')) {
  trips = trips.map(t => ({ ...t, status: t.status || 'confirm', transports: t.transports || [] }));
  save();
}

// Sample data if empty
if (!trips.length) {
  const y = cy;
  trips = [
    { id:gid(), destination:'Barcelone',  start:`${y}-07-05`, end:`${y}-07-12`, hotel:'Hotel Arts', budget:'800',
      activities:'Sagrada Família, Parc Güell, La Barceloneta', notes:'Vol direct depuis Paris', color:'#c17f5a', status:'confirm',
      transports:[{type:'avion',company:'Vueling',from:'Paris ORY',to:'Barcelone BCN',dep:`${y}-07-05T07:30`,arr:`${y}-07-05T09:45`,ref:'VY8361',cost:'180',status:'confirm'}] },
    { id:gid(), destination:'Toscane',    start:`${y}-07-12`, end:`${y}-07-25`, hotel:'Villa Agriturismo', budget:'1500',
      activities:'Florence, Sienne, vignobles, San Gimignano', notes:'Location voiture recommandée', color:'#4a7c59', status:'confirm',
      transports:[
        {type:'train',company:'Trenitalia',from:'Barcelone Sants',to:'Florence SMN',dep:`${y}-07-12T10:00`,arr:`${y}-07-12T17:30`,ref:'RG9590',cost:'120',status:'confirm'},
        {type:'avion',company:'Air France',from:'Florence FLR',to:'Paris CDG',dep:`${y}-07-25T16:00`,arr:`${y}-07-25T18:00`,ref:'AF1234',cost:'210',status:'confirm'}
      ]},
    { id:gid(), destination:'Tokyo',      start:`${y}-10-10`, end:`${y}-10-24`, hotel:'', budget:'2000',
      activities:'Shibuya, temples, Mont Fuji', notes:"Réserver les billets à l'avance", color:'#5b8dd9', status:'plan',
      transports:[{type:'avion',company:'Air France',from:'Paris CDG',to:'Tokyo HND',dep:`${y}-10-10T11:00`,arr:`${y}-10-11T07:00`,ref:'AF0274',cost:'950',status:'plan'}] },
  ];
  save();
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
  const swCode = `
    const CACHE='mes-voyages-v1';
    const ASSETS=['./', './index.html'];
    self.addEventListener('install', e=>e.waitUntil(
      caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
    ));
    self.addEventListener('activate', e=>e.waitUntil(
      caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
        .then(()=>self.clients.claim())
    ));
    self.addEventListener('fetch', e=>e.respondWith(
      caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html')))
    ));
  `;
  const blob  = new Blob([swCode], { type:'application/javascript' });
  const swUrl = URL.createObjectURL(blob);
  navigator.serviceWorker.register(swUrl).catch(() => {});
}

initTheme();
applyTheme('all');
stats();
render();
