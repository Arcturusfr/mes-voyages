// ── CHECKLIST ─────────────────────────────────────────────────
let clAddTargetCat = null;

function openChecklistModal(groupIds) {
  clVoyageId    = groupIds;
  clActiveCat   = 'bagages';
  clAddTargetCat = null;
  renderChecklist();
  document.getElementById('mchecklist').classList.add('open');
}

function newClCatId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Convertit une "grande catégorie" en tableau de sous-catégories { id, name, items[] }.
// Gère la migration de l'ancien format (tableau plat d'items) vers le nouveau.
function migrateClCat(raw) {
  if (!Array.isArray(raw)) raw = [];
  if (raw.length && raw[0] && typeof raw[0].text === 'string' && !('items' in raw[0])) {
    return [{ id: 'divers', name: 'Divers', items: raw }];
  }
  if (!raw.length) return [{ id: 'divers', name: 'Divers', items: [] }];
  return raw;
}

function getVoyageChecklist() {
  const ids = clVoyageId.split(',');
  const t   = trips.find(x => x.id === ids[0]);
  const cl  = t ? JSON.parse(JSON.stringify(t.checklist || {})) : {};
  cl.bagages = migrateClCat(cl.bagages);
  cl.surSoi  = migrateClCat(cl.surSoi);
  cl.actions = migrateClCat(cl.actions);
  return cl;
}

function saveVoyageChecklist(cl) {
  const ids = clVoyageId.split(',');
  const t   = trips.find(x => x.id === ids[0]);
  if (t) { t.checklist = cl; save(); }
}

function renderChecklist() {
  const cl   = getVoyageChecklist();
  const cat  = clActiveCat;
  const cats = cl[cat];

  const total = cats.reduce((n, c) => n + c.items.length, 0);
  const done  = cats.reduce((n, c) => n + c.items.filter(i => i.checked).length, 0);

  const CAT_META = {
    bagages:{ label:'🧳 Dans les bagages',         icon:'🧳', css:'bagages' },
    surSoi: { label:'👜 Sur soi',                  icon:'👜', css:'surSoi' },
    actions:{ label:'⚡ À faire avant de partir',  icon:'⚡', css:'actions' },
  };
  const otherCats = Object.keys(CAT_META).filter(c => c !== cat && (cl[c] || []).some(sc => sc.items.length > 0));

  if (!clAddTargetCat || !cats.some(c => c.id === clAddTargetCat)) clAddTargetCat = cats[0].id;

  const ids = clVoyageId.split(',');
  const t   = trips.find(x => x.id === ids[0]);
  const voyName = t ? (t.destination + (ids.length > 1 ? ' et al.' : '')) : '';
  const groupTrips = trips.filter(x => ids.includes(x.id)).sort((a, b) => new Date(a.start) - new Date(b.start));
  const voyStart = groupTrips.length ? fd(groupTrips[0].start) : '';
  const voyEnd   = groupTrips.length ? fd(groupTrips[groupTrips.length - 1].end) : '';

  document.getElementById('checklist-body').innerHTML = `
    <div style="font-size:.8rem;color:#888;margin-bottom:12px">Voyage : <strong>${voyName}</strong>${voyStart ? ` · <span style="color:var(--ocean);font-weight:500">${voyStart} → ${voyEnd}</span>` : ''}</div>
    <div class="cl-tabs">
      <button class="cl-tab ${cat === 'bagages' ? 'active' : ''}" onclick="switchClCat('bagages')">🧳 Bagages (${(cl.bagages||[]).reduce((n,c)=>n+c.items.length,0)})</button>
      <button class="cl-tab ${cat === 'surSoi'  ? 'active' : ''}" onclick="switchClCat('surSoi')">👜 Sur soi (${(cl.surSoi||[]).reduce((n,c)=>n+c.items.length,0)})</button>
      <button class="cl-tab ${cat === 'actions' ? 'active' : ''}" onclick="switchClCat('actions')">⚡ Actions (${(cl.actions||[]).reduce((n,c)=>n+c.items.length,0)})</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="cl-template-btn" onclick="loadTemplate('${cat}')">📋 Charger modèle</button>
      <button class="cl-template-btn" onclick="saveAsTemplate('${cat}')">💾 Sauver comme modèle</button>
      ${otherCats.map(c => `<button class="cl-template-btn" onclick="copyFromOtherCat('${c}')">↕ Copier depuis ${CAT_META[c].icon}</button>`).join('')}
    </div>
    <div class="cl-add-row">
      <input class="cl-add-input" id="cl-input" placeholder="Ajouter un item…" autocomplete="off"
        oninput="showClSuggest(this.value)" onblur="hideClSuggest()"
        onkeydown="if(event.key==='Enter')addClItem()">
      <select class="cl-add-cat-select" id="cl-add-cat" title="Catégorie de destination">
        ${cats.map(c => `<option value="${c.id}" ${c.id === clAddTargetCat ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <button class="cl-add-btn" onclick="addClItem()">＋</button>
      <div class="cl-suggest" id="cl-suggest" style="display:none"></div>
    </div>

    ${cats.map((c, ci) => {
      const cDone = c.items.filter(i => i.checked).length;
      return `
      <div class="cl-cat-block">
        <div class="cl-cat-header ${cats.length > 1 ? '' : 'cl-cat-header-solo'}" draggable="true"
          ondragstart="clCatDragStart(${ci}, event)" ondragover="clCatDragOver(${ci}, event)"
          ondragleave="clCatDragLeave(event)" ondrop="clCatDrop(${ci}, event)" ondragend="clCatDragEnd(event)">
          <span class="cl-item-handle" title="Glisser pour réordonner">⠿</span>
          <span class="cl-cat-name">${c.name}</span>
          <span class="cl-cat-count">${cDone > 0 ? `${cDone}/` : ''}${c.items.length}</span>
          <div class="cl-item-moves">
            <button class="cl-item-move" onclick="moveClCategory(${ci},-1)" ${ci === 0 ? 'disabled' : ''} title="Monter">▲</button>
            <button class="cl-item-move cl-item-move-down" onclick="moveClCategory(${ci},1)" ${ci === cats.length - 1 ? 'disabled' : ''} title="Descendre">▼</button>
          </div>
          <button class="cl-cat-edit" onclick="renameClCategory(${ci})" title="Renommer la catégorie">✎</button>
          <button class="cl-item-del" onclick="deleteClCategory(${ci})" title="Supprimer la catégorie">✕</button>
        </div>
        <div class="cl-items">
          ${c.items.length ? c.items.map((item, i) => `
            <div class="cl-item ${item.checked ? 'done' : ''}" draggable="true"
              ondragstart="clDragStart(${ci}, ${i}, event)" ondragover="clDragOver(${ci}, ${i}, event)"
              ondragleave="clDragLeave(event)" ondrop="clDrop(${ci}, ${i}, event)" ondragend="clDragEnd(event)">
              <span class="cl-item-handle" title="Glisser pour réordonner">⠿</span>
              <div class="cl-checkbox ${item.checked ? 'checked' : ''}" onclick="toggleClItem(${ci}, ${i})">${item.checked ? '✓' : ''}</div>
              <span class="cl-item-text">${item.text}</span>
              ${cats.length > 1 ? `
              <select class="cl-item-movecat" onchange="moveClItemToCat(${ci}, ${i}, this.value)" title="Déplacer vers une autre catégorie">
                ${cats.map(dc => `<option value="${dc.id}" ${dc.id === c.id ? 'selected' : ''}>${dc.name}</option>`).join('')}
              </select>` : ''}
              <div class="cl-item-moves">
                <button class="cl-item-move" onclick="moveClItem(${ci}, ${i},-1)" ${i === 0 ? 'disabled' : ''} title="Monter">▲</button>
                <button class="cl-item-move cl-item-move-down" onclick="moveClItem(${ci}, ${i},1)" ${i === c.items.length - 1 ? 'disabled' : ''} title="Descendre">▼</button>
              </div>
              <button class="cl-item-del" onclick="deleteClItem(${ci}, ${i})">✕</button>
            </div>`).join('')
          : `<div class="cl-cat-empty">Catégorie vide</div>`}
        </div>
      </div>`;
    }).join('')}

    <button class="cl-cat-add-btn" onclick="addClCategory()">＋ Nouvelle catégorie</button>

    <div class="cl-footer">
      <div class="cl-progress">${done > 0 ? `<strong>${done}</strong>/${total} fait${done > 1 ? 's' : ''}` : total > 0 ? `0/${total} — rien de coché` : ''}  </div>
      <div style="display:flex;gap:8px">
        ${done > 0 ? `<button class="cl-reset-btn" onclick="resetChecklist()">↺ Tout décocher</button>` : ''}
        ${total > 0 ? `<button class="cl-reset-btn" onclick="clearChecklist()">🗑 Vider</button>` : ''}
      </div>
    </div>`;
}

function switchClCat(cat) { clActiveCat = cat; clAddTargetCat = null; renderChecklist(); }

function addClItem() {
  const inp    = document.getElementById('cl-input');
  const catSel = document.getElementById('cl-add-cat');
  const text   = inp.value.trim();
  if (!text) return;
  const cl   = getVoyageChecklist();
  const cats = cl[clActiveCat];
  const targetId = catSel ? catSel.value : cats[0].id;
  clAddTargetCat = targetId;
  const targetCat = cats.find(c => c.id === targetId) || cats[0];
  targetCat.items.push({ text, checked: false });
  if (!clItems.includes(text)) clItems.push(text);
  saveVoyageChecklist(cl);
  inp.value = '';
  document.getElementById('cl-suggest').style.display = 'none';
  renderChecklist();
  setTimeout(() => { const inp = document.getElementById('cl-input'); if (inp) inp.focus(); }, 50);
}

function toggleClItem(ci, i) {
  const cl = getVoyageChecklist();
  cl[clActiveCat][ci].items[i].checked = !cl[clActiveCat][ci].items[i].checked;
  saveVoyageChecklist(cl); renderChecklist();
}

function deleteClItem(ci, i) {
  const cl = getVoyageChecklist();
  cl[clActiveCat][ci].items.splice(i, 1);
  saveVoyageChecklist(cl); renderChecklist();
}

function moveClItemToCat(ci, i, destCatId) {
  const cl   = getVoyageChecklist();
  const cats = cl[clActiveCat];
  const src  = cats[ci];
  if (src.id === destCatId) return;
  const dest = cats.find(c => c.id === destCatId);
  if (!dest) return;
  const [item] = src.items.splice(i, 1);
  dest.items.push(item);
  saveVoyageChecklist(cl); renderChecklist();
}

// ── CHECKLIST TRI MANUEL (items) ──────────────────────────────
function moveClItem(ci, i, dir) {
  const cl  = getVoyageChecklist();
  const arr = cl[clActiveCat][ci].items;
  const j   = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  saveVoyageChecklist(cl); renderChecklist();
}

let clDragCat   = null;
let clDragIndex = null;
function clDragStart(ci, i, ev) {
  clDragCat = ci; clDragIndex = i;
  ev.dataTransfer.effectAllowed = 'move';
  ev.currentTarget.classList.add('dragging');
}
function clDragOver(ci, i, ev) {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  if (clDragCat === ci && clDragIndex !== null && clDragIndex !== i) ev.currentTarget.classList.add('drag-over');
}
function clDragLeave(ev) {
  ev.currentTarget.classList.remove('drag-over');
}
function clDrop(ci, i, ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('drag-over');
  if (clDragCat !== ci || clDragIndex === null || clDragIndex === i) { clDragCat = null; clDragIndex = null; return; }
  const cl  = getVoyageChecklist();
  const arr = cl[clActiveCat][ci].items;
  const [moved] = arr.splice(clDragIndex, 1);
  arr.splice(i, 0, moved);
  clDragCat = null; clDragIndex = null;
  saveVoyageChecklist(cl); renderChecklist();
}
function clDragEnd(ev) {
  clDragCat = null; clDragIndex = null;
  if (ev.currentTarget) ev.currentTarget.classList.remove('dragging');
}

// ── CHECKLIST CATÉGORIES ──────────────────────────────────────
function addClCategory() {
  const name = prompt('Nom de la nouvelle catégorie :');
  if (!name || !name.trim()) return;
  const cl = getVoyageChecklist();
  cl[clActiveCat].push({ id: newClCatId(), name: name.trim(), items: [] });
  saveVoyageChecklist(cl); renderChecklist();
}

function renameClCategory(ci) {
  const cl  = getVoyageChecklist();
  const cat = cl[clActiveCat][ci];
  const name = prompt('Renommer la catégorie :', cat.name);
  if (!name || !name.trim()) return;
  cat.name = name.trim();
  saveVoyageChecklist(cl); renderChecklist();
}

function deleteClCategory(ci) {
  const cl   = getVoyageChecklist();
  const cats = cl[clActiveCat];
  if (cats.length <= 1) { showToast('Impossible de supprimer la dernière catégorie.'); return; }
  const cat = cats[ci];
  const msg = cat.items.length
    ? `Supprimer la catégorie "${cat.name}" ? Ses ${cat.items.length} item(s) seront déplacés vers une autre catégorie.`
    : `Supprimer la catégorie "${cat.name}" ?`;
  if (!confirm(msg)) return;
  let fallback = cats.find((c, idx) => idx !== ci && c.name === 'Divers') || cats.find((c, idx) => idx !== ci);
  fallback.items.push(...cat.items);
  cats.splice(ci, 1);
  saveVoyageChecklist(cl); renderChecklist();
}

function moveClCategory(ci, dir) {
  const cl   = getVoyageChecklist();
  const cats = cl[clActiveCat];
  const cj   = ci + dir;
  if (cj < 0 || cj >= cats.length) return;
  [cats[ci], cats[cj]] = [cats[cj], cats[ci]];
  saveVoyageChecklist(cl); renderChecklist();
}

let clCatDragIndex = null;
function clCatDragStart(ci, ev) {
  clCatDragIndex = ci;
  ev.dataTransfer.effectAllowed = 'move';
  ev.currentTarget.classList.add('dragging');
}
function clCatDragOver(ci, ev) {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  if (clCatDragIndex !== null && clCatDragIndex !== ci) ev.currentTarget.classList.add('drag-over');
}
function clCatDragLeave(ev) {
  ev.currentTarget.classList.remove('drag-over');
}
function clCatDrop(ci, ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('drag-over');
  if (clCatDragIndex === null || clCatDragIndex === ci) { clCatDragIndex = null; return; }
  const cl   = getVoyageChecklist();
  const cats = cl[clActiveCat];
  const [moved] = cats.splice(clCatDragIndex, 1);
  cats.splice(ci, 0, moved);
  clCatDragIndex = null;
  saveVoyageChecklist(cl); renderChecklist();
}
function clCatDragEnd(ev) {
  clCatDragIndex = null;
  if (ev.currentTarget) ev.currentTarget.classList.remove('dragging');
}

function resetChecklist() {
  const cl = getVoyageChecklist();
  cl[clActiveCat].forEach(c => c.items.forEach(i => i.checked = false));
  saveVoyageChecklist(cl); renderChecklist();
}

function clearChecklist() {
  if (!confirm('Vider toute la liste ?')) return;
  const cl = getVoyageChecklist();
  cl[clActiveCat].forEach(c => c.items = []);
  saveVoyageChecklist(cl); renderChecklist();
}

function loadTemplate(cat) {
  const tpl = JSON.parse(localStorage.getItem('mv-cl-tpl-' + cat) || '[]');
  if (!tpl.length) { showToast('Aucun modèle sauvegardé pour cette catégorie.'); return; }
  const cl   = getVoyageChecklist();
  const cats = cl[cat];
  const existing = new Set(cats.flatMap(c => c.items.map(i => i.text)));
  const target = cats.find(c => c.name === 'Divers') || cats[0];
  let added = 0;
  tpl.forEach(text => { if (!existing.has(text)) { target.items.push({ text, checked: false }); added++; } });
  saveVoyageChecklist(cl); renderChecklist();
  showToast(`✅ ${added} item(s) chargés depuis le modèle`);
}

function saveAsTemplate(cat) {
  const cl    = getVoyageChecklist();
  const items = cl[cat].flatMap(c => c.items.map(i => i.text));
  if (!items.length) { showToast('La liste est vide.'); return; }
  localStorage.setItem('mv-cl-tpl-' + cat, JSON.stringify(items));
  showToast(`💾 Modèle sauvegardé (${items.length} item(s))`);
}

function copyFromOtherCat(fromCat) {
  const cl = getVoyageChecklist();
  const destCats = cl[clActiveCat];
  const dest = destCats.find(c => c.name === 'Divers') || destCats[0];
  const existing = new Set(destCats.flatMap(c => c.items.map(i => i.text)));
  (cl[fromCat] || []).flatMap(c => c.items).forEach(i => {
    if (!existing.has(i.text)) { dest.items.push({ text: i.text, checked: false }); existing.add(i.text); }
  });
  saveVoyageChecklist(cl); renderChecklist();
}

// ── CHECKLIST AUTOCOMPLETE ────────────────────────────────────
let clSuggestTimeout = null;
function showClSuggest(val) {
  clearTimeout(clSuggestTimeout);
  const s = document.getElementById('cl-suggest'); if (!s) return;
  const q = val.trim().toLowerCase();
  if (!q) { s.style.display = 'none'; return; }
  const cl = getVoyageChecklist();
  const existing = new Set(cl[clActiveCat].flatMap(c => c.items.map(i => i.text.toLowerCase())));
  const bank = [...new Set([
    ...clItems,
    ...(cl.bagages||[]).flatMap(c => c.items.map(i => i.text)),
    ...(cl.surSoi ||[]).flatMap(c => c.items.map(i => i.text)),
    ...(cl.actions||[]).flatMap(c => c.items.map(i => i.text)),
  ])];
  const matches = bank.filter(t => t.toLowerCase().includes(q) && !existing.has(t.toLowerCase())).slice(0, 8);
  if (!matches.length) { s.style.display = 'none'; return; }
  s.innerHTML = matches.map(t => `<div class="cl-suggest-item" onmousedown="pickClSuggest('${t.replace(/'/g,"\\'")}')">📌 ${t}</div>`).join('');
  s.style.display = 'block';
}
function hideClSuggest() {
  clSuggestTimeout = setTimeout(() => { const s = document.getElementById('cl-suggest'); if (s) s.style.display = 'none'; }, 200);
}
function pickClSuggest(val) {
  const inp = document.getElementById('cl-input');
  if (inp) { inp.value = val; document.getElementById('cl-suggest').style.display = 'none'; addClItem(); }
}
