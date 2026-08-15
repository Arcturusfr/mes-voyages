// ── CHECKLIST ─────────────────────────────────────────────────
function openChecklistModal(groupIds) {
  clVoyageId  = groupIds;
  clActiveCat = 'bagages';
  renderChecklist();
  document.getElementById('mchecklist').classList.add('open');
}

function getVoyageChecklist() {
  const ids = clVoyageId.split(',');
  const t   = trips.find(x => x.id === ids[0]);
  const cl  = t ? JSON.parse(JSON.stringify(t.checklist || {})) : {};
  if (!cl.bagages) cl.bagages = [];
  if (!cl.surSoi)  cl.surSoi  = [];
  if (!cl.actions) cl.actions = [];
  return cl;
}

function saveVoyageChecklist(cl) {
  const ids = clVoyageId.split(',');
  const t   = trips.find(x => x.id === ids[0]);
  if (t) { t.checklist = cl; save(); }
}

function renderChecklist() {
  const cl    = getVoyageChecklist();
  const cat   = clActiveCat;
  const items = cl[cat] || [];
  const done  = items.filter(i => i.checked).length;
  const total = items.length;

  const CAT_META = {
    bagages:{ label:'🧳 Dans les bagages',         icon:'🧳', css:'bagages' },
    surSoi: { label:'👜 Sur soi',                  icon:'👜', css:'surSoi' },
    actions:{ label:'⚡ À faire avant de partir',  icon:'⚡', css:'actions' },
  };
  const catLabel = CAT_META[cat].label;
  const catIcon  = CAT_META[cat].icon;
  const otherCats = Object.keys(CAT_META).filter(c => c !== cat && (cl[c] || []).length > 0);

  const ids = clVoyageId.split(',');
  const t   = trips.find(x => x.id === ids[0]);
  const voyName = t ? (t.destination + (ids.length > 1 ? ' et al.' : '')) : '';
  const groupTrips = trips.filter(x => ids.includes(x.id)).sort((a, b) => new Date(a.start) - new Date(b.start));
  const voyStart = groupTrips.length ? fd(groupTrips[0].start) : '';
  const voyEnd   = groupTrips.length ? fd(groupTrips[groupTrips.length - 1].end) : '';

  document.getElementById('checklist-body').innerHTML = `
    <div style="font-size:.8rem;color:#888;margin-bottom:12px">Voyage : <strong>${voyName}</strong>${voyStart ? ` · <span style="color:var(--ocean);font-weight:500">${voyStart} → ${voyEnd}</span>` : ''}</div>
    <div class="cl-tabs">
      <button class="cl-tab ${cat === 'bagages' ? 'active' : ''}" onclick="switchClCat('bagages')">🧳 Bagages (${(cl.bagages||[]).length})</button>
      <button class="cl-tab ${cat === 'surSoi'  ? 'active' : ''}" onclick="switchClCat('surSoi')">👜 Sur soi (${(cl.surSoi||[]).length})</button>
      <button class="cl-tab ${cat === 'actions' ? 'active' : ''}" onclick="switchClCat('actions')">⚡ Actions (${(cl.actions||[]).length})</button>
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
      <button class="cl-add-btn" onclick="addClItem()">＋</button>
      <div class="cl-suggest" id="cl-suggest" style="display:none"></div>
    </div>
    <div class="cl-section">
      <div class="cl-section-title">${catLabel} — ${total} item${total !== 1 ? 's' : ''}</div>
      <div class="cl-items">
        ${items.length ? items.map((item, i) => `
          <div class="cl-item ${item.checked ? 'done' : ''}">
            <div class="cl-checkbox ${item.checked ? 'checked' : ''}" onclick="toggleClItem(${i})">${item.checked ? '✓' : ''}</div>
            <span class="cl-item-text">${item.text}</span>
            <span class="cl-item-cat ${cat}">${catIcon}</span>
            <button class="cl-item-del" onclick="deleteClItem(${i})">✕</button>
          </div>`).join('')
        : `<div style="color:#ccc;font-size:.83rem;text-align:center;padding:16px 0">Liste vide — ajoutez des items !</div>`}
      </div>
    </div>
    <div class="cl-footer">
      <div class="cl-progress">${done > 0 ? `<strong>${done}</strong>/${total} fait${done > 1 ? 's' : ''}` : total > 0 ? `0/${total} — rien de coché` : ''}  </div>
      <div style="display:flex;gap:8px">
        ${done > 0 ? `<button class="cl-reset-btn" onclick="resetChecklist()">↺ Tout décocher</button>` : ''}
        ${total > 0 ? `<button class="cl-reset-btn" onclick="clearChecklist()">🗑 Vider</button>` : ''}
      </div>
    </div>`;
}

function switchClCat(cat) { clActiveCat = cat; renderChecklist(); }

function addClItem() {
  const inp  = document.getElementById('cl-input');
  const text = inp.value.trim();
  if (!text) return;
  const cl = getVoyageChecklist();
  if (!cl[clActiveCat]) cl[clActiveCat] = [];
  cl[clActiveCat].push({ text, checked: false });
  if (!clItems.includes(text)) clItems.push(text);
  saveVoyageChecklist(cl);
  inp.value = '';
  document.getElementById('cl-suggest').style.display = 'none';
  renderChecklist();
  setTimeout(() => { const inp = document.getElementById('cl-input'); if (inp) inp.focus(); }, 50);
}

function toggleClItem(i) {
  const cl = getVoyageChecklist();
  cl[clActiveCat][i].checked = !cl[clActiveCat][i].checked;
  saveVoyageChecklist(cl); renderChecklist();
}

function deleteClItem(i) {
  const cl = getVoyageChecklist();
  cl[clActiveCat].splice(i, 1);
  saveVoyageChecklist(cl); renderChecklist();
}

function resetChecklist() {
  const cl = getVoyageChecklist();
  cl[clActiveCat].forEach(i => i.checked = false);
  saveVoyageChecklist(cl); renderChecklist();
}

function clearChecklist() {
  if (!confirm('Vider toute la liste ?')) return;
  const cl = getVoyageChecklist();
  cl[clActiveCat] = [];
  saveVoyageChecklist(cl); renderChecklist();
}

function loadTemplate(cat) {
  const tpl = JSON.parse(localStorage.getItem('mv-cl-tpl-' + cat) || '[]');
  if (!tpl.length) { showToast('Aucun modèle sauvegardé pour cette catégorie.'); return; }
  const cl = getVoyageChecklist();
  if (!cl[cat]) cl[cat] = [];
  const existing = new Set(cl[cat].map(i => i.text));
  tpl.forEach(text => { if (!existing.has(text)) cl[cat].push({ text, checked: false }); });
  saveVoyageChecklist(cl); renderChecklist();
  showToast(`✅ ${tpl.length} item(s) chargés depuis le modèle`);
}

function saveAsTemplate(cat) {
  const cl    = getVoyageChecklist();
  const items = cl[cat].map(i => i.text);
  if (!items.length) { showToast('La liste est vide.'); return; }
  localStorage.setItem('mv-cl-tpl-' + cat, JSON.stringify(items));
  showToast(`💾 Modèle sauvegardé (${items.length} item(s))`);
}

function copyFromOtherCat(fromCat) {
  const cl       = getVoyageChecklist();
  const existing = new Set(cl[clActiveCat].map(i => i.text));
  (cl[fromCat] || []).forEach(i => { if (!existing.has(i.text)) cl[clActiveCat].push({ text: i.text, checked: false }); });
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
  const existing = new Set(cl[clActiveCat].map(i => i.text.toLowerCase()));
  const bank = [...new Set([...clItems, ...(cl.bagages||[]).map(i=>i.text), ...(cl.surSoi||[]).map(i=>i.text), ...(cl.actions||[]).map(i=>i.text)])];
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
