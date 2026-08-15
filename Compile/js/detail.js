// ── DETAIL MODAL ──────────────────────────────────────────────
function openDetail(id) {
  const t = trips.find(x => x.id === id); if (!t) return;
  const dur = Math.round((new Date(t.end) - new Date(t.start)) / 86400000) + 1;
  const tc  = (t.transports || []).filter(x => x.status !== 'cancel').reduce((s, x) => s + (parseFloat(x.cost) || 0), 0);
  const tot = (parseFloat(t.budget) || 0) + tc;

  const trHtml = (t.transports || []).length ? `<div class="dsec"><div class="dstitle">Transports (${t.transports.length})</div>
    ${t.transports.map(tr => {
      const dep = tr.dep ? fdt(tr.dep) : '', arr = tr.arr ? fdt(tr.arr) : '';
      return `<div class="tdcard"><div class="tdroute">${TICONS[tr.type] || '🔵'} ${tr.from || '?'} → ${tr.to || '?'}</div>
        <div class="tdmeta">${[tr.company, dep && arr ? dep + ' → ' + arr : (dep || arr), tr.ref, tr.cost ? parseFloat(tr.cost).toLocaleString('fr-FR') + ' €' : ''].filter(Boolean).join(' · ')}</div>
        <div style="margin-top:4px">${badge(tr.status || 'plan')}</div></div>`;
    }).join('')}</div>` : '';

  const lrHtml = (t.carRentals || []).length ? `<div class="dsec"><div class="dstitle">🚙 Location voiture (${t.carRentals.length})</div>
    ${t.carRentals.map(lr => {
      const dep = lr.dep ? fdt(lr.dep) : '', ret = lr.ret ? fdt(lr.ret) : '';
      return `<div class="tdcard"><div class="tdroute">🚙 ${lr.agency || 'Location voiture'}</div>
        <div class="tdmeta">${[dep && ret ? dep + ' → ' + ret : (dep || ret), lr.cost ? parseFloat(lr.cost).toLocaleString('fr-FR') + ' €' : ''].filter(Boolean).join(' · ')}</div>
        <div style="margin-top:4px">${badge(lr.status || 'plan')}</div></div>`;
    }).join('')}</div>` : '';

  document.getElementById('detbody').innerHTML = `
    <div class="ddest" style="${t.status === 'cancel' ? 'text-decoration:line-through;opacity:.45' : ''}">${t.destination}</div>
    <div class="ddates">${fd(t.start)} → ${fd(t.end)}</div>
    <div class="dchips">${badge(t.status || 'plan')}
      <div class="chip" style="background:${t.color}22;color:${t.color}">✈ ${dur} jour${dur > 1 ? 's' : ''}</div>
      ${t.hotel ? `<div class="chip" style="background:var(--bg-card2);color:var(--text-main);border:1px solid var(--border)">🏨 ${t.hotel}</div>` : ''}
      ${tot ? `<div class="chip" style="background:#fff8e1;color:#b8860b">💰 ${tot.toLocaleString('fr-FR')} €</div>` : ''}
    </div>
    ${(t.hotelSvcs || []).length ? `<div class="dsec"><div class="dstitle">Services hébergement</div><div style="margin-top:4px">${
      t.hotelSvcs.map(k => { const s = HOTEL_SVCS.find(x => x.key === k); return s ? `<span class="hsvc-chip">${s.icon} ${s.label}</span>` : ''; }).join('')
    }</div></div>` : ''}
    ${t.hotelNotes  ? `<div class="dsec"><div class="dstitle">Notes hébergement</div><div class="dsval">${t.hotelNotes}</div></div>` : ''}
    ${t.activities  ? `<div class="dsec"><div class="dstitle">Activités</div><div class="dsval">${t.activities.replace(/\n/g,'<br>')}</div></div>` : ''}
    ${trHtml}
    ${lrHtml}
    ${t.notes ? `<div class="dsec"><div class="dstitle">Notes</div><div class="dsval">${t.notes.replace(/\n/g,'<br>')}</div></div>` : ''}
    <div class="factions">
      <button class="bcanc" onclick="closeModal('mdet')">Fermer</button>
      <button class="bcanc" onclick="closeModal('mdet');openVoyagesModal('${t.id}')">✈ Voir le voyage</button>
      <button class="bsave" onclick="closeModal('mdet');openTripModal('${t.id}')">✏ Modifier</button>
    </div>`;
  document.getElementById('mdet').classList.add('open');
}

// ── VOYAGES MODAL ─────────────────────────────────────────────
function openVoyagesModal(highlightId = null) {
  const groups = computeGroups(trips.filter(t => t.status !== 'cancel'));
  const sorted = [...groups].sort((a, b) => new Date(a.stays[0].start) - new Date(b.stays[0].start));

  if (!sorted.length) {
    document.getElementById('voyages-body').innerHTML =
      '<div style="padding:24px;text-align:center;color:#bbb;font-style:italic">Aucun voyage à afficher.</div>';
    document.getElementById('mvoyages').classList.add('open');
    return;
  }

  const renderTransport = tr => {
    const dep  = tr.dep ? fdt(tr.dep) : '', arr = tr.arr ? fdt(tr.arr) : '';
    const meta = [tr.company, dep && arr ? `${dep} → ${arr}` : (dep || arr), tr.ref, tr.cost ? parseFloat(tr.cost).toLocaleString('fr-FR') + ' €' : ''].filter(Boolean).join(' · ');
    return `<div class="voy-transport-row">
      <div class="voy-transport-icon">${TICONS[tr.type] || '🔵'}</div>
      <div class="voy-transport-info">
        <div class="voy-transport-route">${tr.from || '?'} → ${tr.to || '?'}</div>
        ${meta ? `<div class="voy-transport-meta">${meta}</div>` : ''}
        <div style="margin-top:4px">${badge(tr.status || 'plan')}</div>
      </div>
    </div>`;
  };

  const renderStay = (s, highlightId) => {
    const dur   = Math.round((new Date(s.end) - new Date(s.start)) / 86400000) + 1;
    const isHL  = s.id === highlightId;
    const svcs  = (s.hotelSvcs || []).map(k => { const sv = HOTEL_SVCS.find(x => x.key === k); return sv ? `<span class="voy-stay-svc">${sv.icon} ${sv.label}</span>` : ''; }).join('');
    const carHtml = (s.carRentals || []).map(lr => {
      const dep = lr.dep ? fdt(lr.dep) : '', ret = lr.ret ? fdt(lr.ret) : '';
      const meta = [lr.agency, dep && ret ? `${dep} → ${ret}` : (dep || ret), lr.cost ? parseFloat(lr.cost).toLocaleString('fr-FR') + ' €' : ''].filter(Boolean).join(' · ');
      return `<div style="display:flex;gap:6px;align-items:flex-start;margin-top:6px;padding:6px 8px;background:var(--bg-card2);border-radius:6px;border:1px solid var(--border)">
        <span style="font-size:.9rem">🚙</span>
        <div><div style="font-size:.8rem;font-weight:500">${lr.agency || 'Location voiture'}</div>
        ${meta ? `<div style="font-size:.72rem;color:#aaa">${meta}</div>` : ''}
        <div style="margin-top:3px">${badge(lr.status || 'plan')}</div></div>
      </div>`;
    }).join('');

    return `<div class="voy-stay" style="${isHL ? 'background:#fffbea;border-left:3px solid var(--gold);' : ''}" onclick="closeModal('mvoyages');openDetail('${s.id}')">
      <div class="voy-stay-hd">
        <div class="voy-stay-dot" style="background:${s.color || COLORS[0]}"></div>
        <div class="voy-stay-dest">${s.destination}</div>
        <div class="voy-stay-dates">${fd(s.start)} → ${fd(s.end)} · ${dur}j</div>
        ${badge(s.status || 'plan')}
      </div>
      ${s.hotel ? `<div class="voy-stay-hotel">🏨 ${s.hotel}${(s.hotelSvcs || []).length ? ' · ' + svcs : ''}</div>` : ''}
      ${s.hotelNotes ? `<div style="font-size:.74rem;color:#aaa;margin-top:2px">📌 ${s.hotelNotes}</div>` : ''}
      ${carHtml}
    </div>`;
  };

  let h = '';
  sorted.forEach(g => {
    const first = g.stays[0], last = g.stays[g.stays.length - 1];
    const totalDur = Math.round((new Date(last.end) - new Date(first.start)) / 86400000) + 1;
    const isHighlighted = highlightId && g.stays.some(s => s.id === highlightId);
    const groupName = g.stays.length === 1 ? first.destination : g.stays.map(s => s.destination).join(' → ');

    const depTransports = g.stays.flatMap(s =>
      (s.transports || []).filter(tr => tr.dep && tr.dep.slice(0,10) === first.start && tr.type !== 'location')
    ).sort((a, b) => new Date(a.dep) - new Date(b.dep));
    const hasConfirmedDep = depTransports.some(tr => tr.status === 'confirm');

    const retTransports = g.stays.flatMap(s =>
      (s.transports || []).filter(tr => tr.arr && tr.arr.slice(0,10) === last.end && tr.type !== 'location')
    ).sort((a, b) => new Date(a.arr) - new Date(b.arr));
    const hasConfirmedRet = retTransports.some(tr => tr.status === 'confirm');

    h += `<div class="voy-group" ${isHighlighted ? 'id="voy-highlight"' : ''}
           style="${isHighlighted ? 'border-color:var(--gold);box-shadow:0 0 0 2px var(--gold)33;' : ''}">
      <div class="voy-group-hd">
        <div class="voy-group-name">${groupName}</div>
        <span class="voy-group-dates">${fd(first.start)} – ${fd(last.end)}</span>
        <span class="voy-group-dur">${totalDur}j</span>
        <button onclick="openChecklistModal('${g.stays.map(s => s.id).join(',')}')"
          style="padding:4px 10px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:6px;cursor:pointer;font-size:.75rem;white-space:nowrap;transition:background .2s"
          onmouseover="this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">✅ Check-list</button>
      </div>
      ${depTransports.length
        ? depTransports.map(renderTransport).join('') + (!hasConfirmedDep
            ? `<div class="voy-transport-row"><div class="voy-transport-icon">⚠</div><div class="voy-transport-info"><div class="voy-transport-route" style="color:#c0392b">Transport de départ non confirmé</div></div></div>`
            : '')
        : `<div class="voy-transport-row"><div class="voy-transport-icon">⚠</div><div class="voy-transport-info"><div class="voy-transport-route" style="color:#c0392b">Transport de départ manquant</div></div></div>`
      }
      ${g.stays.map((s, i) => {
        const conn = i < g.stays.length - 1
          ? `<div class="voy-divider"><div class="voy-divider-line"></div><div class="voy-divider-lbl">→ suite</div><div class="voy-divider-line"></div></div>`
          : '';
        return renderStay(s, highlightId) + conn;
      }).join('')}
      ${retTransports.length
        ? retTransports.map(renderTransport).join('') + (!hasConfirmedRet
            ? `<div class="voy-transport-row"><div class="voy-transport-icon">⚠</div><div class="voy-transport-info"><div class="voy-transport-route" style="color:#c0392b">Transport de retour non confirmé</div></div></div>`
            : '')
        : `<div class="voy-transport-row"><div class="voy-transport-icon">⚠</div><div class="voy-transport-info"><div class="voy-transport-route" style="color:#c0392b">Transport de retour manquant</div></div></div>`
      }
    </div>`;
  });

  document.getElementById('voyages-body').innerHTML = h;
  document.getElementById('mvoyages').classList.add('open');

  if (highlightId) {
    setTimeout(() => {
      const el = document.getElementById('voy-highlight');
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 150);
  }
}
