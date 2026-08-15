// ── STATS BAR ─────────────────────────────────────────────────
function stats() {
  const vis = ft();
  document.getElementById('s1').textContent = vis.length;

  const j = vis.reduce((s, t) => {
    const d = Math.round((new Date(t.end) - new Date(t.start)) / 86400000) + 1;
    return s + (d > 0 ? d : 0);
  }, 0);
  document.getElementById('s2').textContent = j;

  const bc = trips.filter(t => t.status === 'confirm').reduce((s, t) => {
    const lr = (t.carRentals || []).filter(x => x.status === 'confirm').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0);
    return s + (parseFloat(t.budget) || 0)
             + (t.transports || []).filter(x => x.status === 'confirm').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0)
             + lr;
  }, 0);

  const be = trips.filter(t => t.status !== 'cancel').reduce((s, t) => {
    const lr = (t.carRentals || []).filter(x => x.status !== 'cancel').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0);
    return s + (parseFloat(t.budget) || 0)
             + (t.transports || []).filter(x => x.status !== 'cancel').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0)
             + lr;
  }, 0);

  document.getElementById('s3').textContent = bc > 0 ? bc.toLocaleString('fr-FR') + ' €' : '—';
  document.getElementById('s4').textContent = be > 0 ? be.toLocaleString('fr-FR') + ' €' : '—';

  const now = new Date();
  const nx = trips
    .filter(t => t.status !== 'cancel' && new Date(t.start) >= now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  document.getElementById('s5').textContent = nx ? (nx.destination + (nx.hotel ? ' · ' + nx.hotel : '')) : '—';
}

// ── BUDGET MODAL ──────────────────────────────────────────────
function openBudgetModal() {
  const fmt = v => v > 0 ? v.toLocaleString('fr-FR') + ' €' : '—';

  const hconf  = trips.filter(t => t.status === 'confirm').reduce((s, t) => s + (parseFloat(t.budget) || 0), 0);
  const hestim = trips.filter(t => t.status !== 'cancel').reduce((s, t) => s + (parseFloat(t.budget) || 0), 0);

  const tconf = trips.reduce((s, t) => {
    const tr = (t.transports  || []).filter(x => x.status === 'confirm').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0);
    const lr = (t.carRentals  || []).filter(x => x.status === 'confirm').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0);
    return s + tr + lr;
  }, 0);

  const testim = trips.reduce((s, t) => {
    const tr = (t.transports  || []).filter(x => x.status !== 'cancel').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0);
    const lr = (t.carRentals  || []).filter(x => x.status !== 'cancel').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0);
    return s + tr + lr;
  }, 0);

  const totconf  = hconf  + tconf;
  const totestim = hestim + testim;

  const tripRows = trips.filter(t => t.status !== 'cancel').map(t => {
    const th  = parseFloat(t.budget) || 0;
    const tt  = (t.transports || []).filter(x => x.status !== 'cancel').reduce((a, x) => a + (parseFloat(x.cost) || 0), 0);
    const tot = th + tt;
    if (!tot) return '';
    const isConf = t.status === 'confirm';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--sand);font-size:.86rem">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:8px;height:8px;border-radius:50%;background:${t.color || COLORS[0]};flex-shrink:0"></div>
        <span style="font-weight:500">${t.destination}</span>
        <span style="font-size:.72rem;color:#aaa">${isConf ? '✓ Confirmé' : '? Envisagé'}</span>
      </div>
      <div style="text-align:right">
        <span style="font-weight:600;font-family:'Jost',sans-serif">${fmt(tot)}</span>
        ${th && tt ? `<div style="font-size:.7rem;color:#aaa">🏨 ${fmt(th)} · ✈ ${fmt(tt)}</div>` : ''}
      </div>
    </div>`;
  }).filter(Boolean).join('');

  document.getElementById('budget-body').innerHTML = `
    <div class="bud-section">
      <div class="bud-section-title">🏨 Hébergement</div>
      <div class="bud-grid">
        <div class="bud-card bconf"><div class="bud-lbl">✓ Confirmé</div><div class="bud-val">${fmt(hconf)}</div></div>
        <div class="bud-card bestim"><div class="bud-lbl">? Estimé</div><div class="bud-val">${fmt(hestim)}</div></div>
      </div>
    </div>
    <div class="bud-section">
      <div class="bud-section-title">✈ Transports</div>
      <div class="bud-grid">
        <div class="bud-card bconf"><div class="bud-lbl">✓ Confirmé</div><div class="bud-val">${fmt(tconf)}</div></div>
        <div class="bud-card bestim"><div class="bud-lbl">? Estimé</div><div class="bud-val">${fmt(testim)}</div></div>
      </div>
    </div>
    <div class="bud-sep"></div>
    <div class="bud-section">
      <div class="bud-section-title">Σ Total</div>
      <div class="bud-total-grid">
        <div class="bud-total bconf"><div class="bud-lbl">✓ Confirmé</div><div class="bud-val">${fmt(totconf)}</div><div class="bud-sub">héberg. + transports confirmés</div></div>
        <div class="bud-total bestim"><div class="bud-lbl">? Estimé</div><div class="bud-val">${fmt(totestim)}</div><div class="bud-sub">tous (hors annulés)</div></div>
      </div>
    </div>
    ${tripRows ? `<div class="bud-sep"></div>
    <div class="bud-section">
      <div class="bud-section-title">Détail par séjour</div>
      ${tripRows}
    </div>` : ''}`;

  document.getElementById('mbudget').classList.add('open');
}
