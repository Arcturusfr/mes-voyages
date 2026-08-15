// ── AUTOCOMPLETE — DESTINATION ────────────────────────────────
let act = null;
function showAC(v) {
  clearTimeout(act);
  const l = document.getElementById('acl'), q = v.trim().toLowerCase();
  const m = dests.filter(d => d.toLowerCase().includes(q) && d.toLowerCase() !== q);
  if (!m.length) { l.style.display = 'none'; return; }
  l.innerHTML = m.map(d => `<div class="acitem" onmousedown="pickAC('${d.replace(/'/g,"\\'")}')"><span class="acic">🕐</span>${d}</div>`).join('');
  l.style.display = 'block';
}
function hideAC() { act = setTimeout(() => { document.getElementById('acl').style.display = 'none'; }, 200); }
function pickAC(v) { document.getElementById('fd').value = v; document.getElementById('acl').style.display = 'none'; }

// ── AUTOCOMPLETE — HOTEL ──────────────────────────────────────
let acth = null;
function showACH(v) {
  clearTimeout(acth);
  const l = document.getElementById('aclh'), q = v.trim().toLowerCase();
  const m = hotels.filter(h => h.toLowerCase().includes(q) && h.toLowerCase() !== q);
  if (!m.length) { l.style.display = 'none'; return; }
  l.innerHTML = m.map(h => `<div class="acitem" onmousedown="pickACH('${h.replace(/'/g,"\\'")}')"><span class="acic">🏨</span>${h}</div>`).join('');
  l.style.display = 'block';
}
function hideACH() { acth = setTimeout(() => { document.getElementById('aclh').style.display = 'none'; }, 200); }
function pickACH(v) { document.getElementById('fho').value = v; document.getElementById('aclh').style.display = 'none'; }

// ── HOTEL SERVICES ────────────────────────────────────────────
function buildHotelSvcs(active) {
  document.getElementById('fhsvc').innerHTML = HOTEL_SVCS.map(s =>
    `<div class="hsvc ${active.includes(s.key) ? 'on' : ''}" data-key="${s.key}" onclick="toggleSvc(this)">
      <span class="hsvc-icon">${s.icon}</span>${s.label}
    </div>`
  ).join('');
}
function toggleSvc(el) { el.classList.toggle('on'); }
function getHotelSvcs() {
  return [...document.querySelectorAll('#fhsvc .hsvc.on')].map(el => el.dataset.key);
}

// ── COLOR PICKER ──────────────────────────────────────────────
function buildCP() {
  document.getElementById('cpick').innerHTML = COLORS.map(c =>
    `<div class="sw ${scol === c ? 'sel' : ''}" style="background:${c}" onclick="pickC('${c}')"></div>`
  ).join('');
}
function pickC(c) {
  scol = c;
  document.querySelectorAll('.sw').forEach(s =>
    s.classList.toggle('sel', s.style.background === c || s.style.backgroundColor === c)
  );
}

// ── STATUS SELECTOR ───────────────────────────────────────────
function renderTSR() {
  document.querySelectorAll('#tsr .sopt').forEach(e => e.classList.toggle('sel', e.dataset.v === stSt));
}
function selTripSt(v) { stSt = v; renderTSR(); }

// ── TRIP MODAL ────────────────────────────────────────────────
function openTripModal(id = null) {
  eid = id;
  document.getElementById('mtrip-title').textContent = id ? 'Modifier le séjour' : 'Nouveau séjour';
  document.getElementById('bdel').style.display = id ? 'block' : 'none';

  // Reset tabs
  document.querySelectorAll('.tabbtn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('.tabpane').forEach((p, i) => p.classList.toggle('active', i === 0));

  if (id) {
    const t = trips.find(x => x.id === id);
    document.getElementById('fd').value   = t.destination;
    document.getElementById('fst').value  = t.start;
    document.getElementById('fen').value  = t.end;
    document.getElementById('fho').value  = t.hotel || '';
    document.getElementById('fbu').value  = t.budget || '';
    document.getElementById('fac').value  = t.activities || '';
    document.getElementById('fno').value  = t.notes || '';
    document.getElementById('fhno').value = t.hotelNotes || '';
    scol = t.color || COLORS[0]; stSt = t.status || 'plan';
    ctr  = JSON.parse(JSON.stringify(t.transports  || []));
    clr  = JSON.parse(JSON.stringify(t.carRentals  || []));
    buildHotelSvcs(t.hotelSvcs || []);
  } else {
    ['fd','fho','fbu','fac','fno','fhno'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('fst').value = ''; document.getElementById('fen').value = '';
    scol = COLORS[0]; stSt = 'plan'; ctr = []; clr = [];
    buildHotelSvcs([]);
  }
  buildCP(); renderTSR(); renderTL(); cancelTF(); renderLL(); cancelLF();
  document.getElementById('mtrip').classList.add('open');
}

function saveTrip() {
  const dest  = document.getElementById('fd').value.trim();
  const start = document.getElementById('fst').value;
  const end   = document.getElementById('fen').value;
  if (!dest || !start || !end) { alert('Destination et dates obligatoires.'); return; }
  if (new Date(end) < new Date(start)) { alert('La date de retour doit être après le départ.'); return; }
  const trip = {
    id: eid || gid(), destination: dest, start, end,
    hotel:      document.getElementById('fho').value.trim(),
    budget:     document.getElementById('fbu').value,
    hotelSvcs:  getHotelSvcs(),
    hotelNotes: document.getElementById('fhno').value.trim(),
    activities: document.getElementById('fac').value.trim(),
    notes:      document.getElementById('fno').value.trim(),
    color: scol, status: stSt, transports: ctr, carRentals: clr
  };
  if (eid) { const i = trips.findIndex(t => t.id === eid); trips[i] = trip; } else trips.push(trip);
  save(); closeModal('mtrip'); stats(); render();
  showToast(eid ? '✅ Voyage mis à jour !' : '✅ Voyage ajouté !');
}

function deleteTrip() {
  if (!confirm('Supprimer ce voyage ?')) return;
  trips = trips.filter(t => t.id !== eid);
  save(); closeModal('mtrip'); stats(); render(); showToast('🗑 Voyage supprimé.');
}

// ── TRANSPORT FORM ────────────────────────────────────────────
function renderTL() {
  const l = document.getElementById('tlist');
  if (!ctr.length) { l.innerHTML = '<div style="color:#ccc;font-size:.83rem;text-align:center;padding:7px 0">Aucun trajet</div>'; return; }
  l.innerHTML = ctr.map((tr, i) => {
    const icon = TICONS[tr.type] || '🔵';
    const dep  = tr.dep ? fdt(tr.dep) : '', arr = tr.arr ? fdt(tr.arr) : '';
    const times = dep || arr ? `${dep}${dep && arr ? ' → ' : ''}${arr}` : '';
    const cost  = tr.cost ? parseFloat(tr.cost).toLocaleString('fr-FR') + ' €' : '';
    return `<div class="tcard"><div class="tic">${icon}</div>
      <div class="tinfo">
        <div class="troute">${tr.from || '?'} → ${tr.to || '?'}</div>
        <div class="tmeta">${[tr.company, times, tr.ref, cost].filter(Boolean).join(' · ')}</div>
        <div style="margin-top:4px">${badge(tr.status || 'plan')}</div>
      </div>
      <div class="tacts">
        <button class="bic" onclick="editTF(${i})">✏</button>
        <button class="bic" onclick="rmTF(${i})">🗑</button>
      </div></div>`;
  }).join('');
}

function openTF(idx = null) {
  etIdx = idx;
  document.getElementById('tftitle').textContent = idx !== null ? 'Modifier le trajet' : 'Nouveau trajet';
  if (idx !== null) {
    const tr = ctr[idx];
    document.getElementById('tft').value  = tr.type    || 'avion';
    document.getElementById('tfc').value  = tr.company || '';
    document.getElementById('tff').value  = tr.from    || '';
    document.getElementById('tfto').value = tr.to      || '';
    document.getElementById('tfdp').value = tr.dep     || '';
    document.getElementById('tfar').value = tr.arr     || '';
    document.getElementById('tfrf').value = tr.ref     || '';
    document.getElementById('tfco').value = tr.cost    || '';
    tfSt = tr.status || 'plan';
  } else {
    ['tfc','tff','tfto','tfdp','tfar','tfrf','tfco'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('tft').value = 'avion'; tfSt = 'plan';
  }
  renderTFSR();
  document.getElementById('tform').style.display = 'block';
}
function cancelTF() { document.getElementById('tform').style.display = 'none'; etIdx = null; }
function editTF(i) { openTF(i); }
function rmTF(i) { ctr.splice(i, 1); renderTL(); }
function saveTF() {
  const from = document.getElementById('tff').value.trim();
  const to   = document.getElementById('tfto').value.trim();
  if (!from && !to) { alert("Indiquez au moins le départ ou l'arrivée."); return; }
  const tr = {
    type:    document.getElementById('tft').value,
    company: document.getElementById('tfc').value.trim(),
    from, to,
    dep:  document.getElementById('tfdp').value,
    arr:  document.getElementById('tfar').value,
    ref:  document.getElementById('tfrf').value.trim(),
    cost: document.getElementById('tfco').value,
    status: tfSt
  };
  if (etIdx !== null) ctr[etIdx] = tr; else ctr.push(tr);
  cancelTF(); renderTL();
}
function renderTFSR() {
  document.querySelectorAll('#tfsr .sopt').forEach(e => e.classList.toggle('sel', e.dataset.v === tfSt));
}
function selTfSt(v) { tfSt = v; renderTFSR(); }

// ── CAR RENTAL ────────────────────────────────────────────────
function renderLL() {
  const l = document.getElementById('llist');
  if (!clr.length) { l.innerHTML = '<div style="color:#ccc;font-size:.83rem;text-align:center;padding:7px 0">Aucune location</div>'; return; }
  l.innerHTML = clr.map((lr, i) => {
    const dep  = lr.dep ? fdt(lr.dep) : '', ret = lr.ret ? fdt(lr.ret) : '';
    const cost = lr.cost ? parseFloat(lr.cost).toLocaleString('fr-FR') + ' €' : '';
    return `<div class="tcard">
      <div class="tic">🚙</div>
      <div class="tinfo">
        <div class="troute">${lr.agency || 'Location voiture'}</div>
        <div class="tmeta">${[dep && ret ? dep + ' → ' + ret : (dep || ret), cost].filter(Boolean).join(' · ')}</div>
        <div style="margin-top:4px">${badge(lr.status || 'plan')}</div>
      </div>
      <div class="tacts">
        <button class="bic" onclick="editLF(${i})">✏</button>
        <button class="bic" onclick="rmLF(${i})">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function openLF(idx = null) {
  elIdx = idx;
  document.getElementById('lftitle').textContent = idx !== null ? 'Modifier la location' : 'Nouvelle location';
  if (idx !== null) {
    const lr = clr[idx];
    document.getElementById('lfa').value = lr.agency || '';
    document.getElementById('lfd').value = lr.dep    || '';
    document.getElementById('lfr').value = lr.ret    || '';
    document.getElementById('lfc').value = lr.cost   || '';
    lfSt = lr.status || 'plan';
  } else {
    ['lfa','lfc'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('lfd').value = ''; document.getElementById('lfr').value = '';
    lfSt = 'plan';
  }
  renderLFSR();
  document.getElementById('lform').style.display = 'block';
}
function cancelLF() { document.getElementById('lform').style.display = 'none'; elIdx = null; }
function editLF(i) { openLF(i); }
function rmLF(i) { clr.splice(i, 1); renderLL(); }
function saveLF() {
  const lr = {
    agency: document.getElementById('lfa').value.trim(),
    dep:    document.getElementById('lfd').value,
    ret:    document.getElementById('lfr').value,
    cost:   document.getElementById('lfc').value,
    status: lfSt
  };
  if (elIdx !== null) clr[elIdx] = lr; else clr.push(lr);
  cancelLF(); renderLL();
}
function renderLFSR() {
  document.querySelectorAll('#lfsr .sopt').forEach(e => e.classList.toggle('sel', e.dataset.v === lfSt));
}
function selLfSt(v) { lfSt = v; renderLFSR(); }
