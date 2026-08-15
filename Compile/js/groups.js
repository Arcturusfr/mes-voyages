// ── GROUP ENGINE ──────────────────────────────────────────────
// Two stays belong to the same group if their date ranges touch or overlap.
// Groups are built by BFS chaining. Alerts check missing transports and overlaps > 1 day.

function computeGroups(allTrips) {
  const active = allTrips.filter(t => t.status !== 'cancel');
  const used   = new Set();
  const groups = [];

  function areLinked(a, b) {
    const aStart = new Date(a.start), aEnd = new Date(a.end);
    const bStart = new Date(b.start), bEnd = new Date(b.end);
    return aStart <= bEnd && aEnd >= bStart;
  }

  active.forEach(seed => {
    if (used.has(seed.id)) return;
    const group = [seed];
    used.add(seed.id);
    let changed = true;
    while (changed) {
      changed = false;
      active.forEach(t => {
        if (used.has(t.id)) return;
        if (group.some(g => areLinked(g, t))) {
          group.push(t); used.add(t.id); changed = true;
        }
      });
    }
    group.sort((a, b) => new Date(a.start) - new Date(b.start));
    groups.push({ stays: group, alerts: checkGroup(group) });
  });

  return groups.sort((a, b) => new Date(a.stays[0].start) - new Date(b.stays[0].start));
}

function checkGroup(stays) {
  const alerts = [];
  const first  = stays[0];
  const last   = stays[stays.length - 1];

  const hasStart = stays.some(t =>
    (t.transports || []).some(tr => tr.status === 'confirm' && tr.dep && tr.dep.slice(0,10) === first.start)
  );
  if (!hasStart) alerts.push({ type:'err', msg:'Transport de début manquant ou non confirmé' });

  const hasEnd = stays.some(t =>
    (t.transports || []).some(tr => tr.status === 'confirm' && tr.arr && tr.arr.slice(0,10) === last.end)
  );
  if (!hasEnd) alerts.push({ type:'err', msg:'Transport de fin manquant ou non confirmé' });

  for (let i = 0; i < stays.length; i++) {
    for (let j = i + 1; j < stays.length; j++) {
      const a = stays[i], b = stays[j];
      if (a.end === b.start || b.end === a.start) continue;
      const aEnd = new Date(a.end); aEnd.setDate(aEnd.getDate() + 1);
      const bEnd = new Date(b.end); bEnd.setDate(bEnd.getDate() + 1);
      const overlapDays = Math.round(
        (Math.min(aEnd, bEnd) - Math.max(new Date(a.start), new Date(b.start))) / 86400000
      );
      if (overlapDays >= 1) {
        alerts.push({ type:'warn', msg:`Chevauchement de ${overlapDays} jour${overlapDays>1?'s':''} : ${a.destination} et ${b.destination}` });
      }
    }
  }

  if (!alerts.length) alerts.push({ type:'ok', msg:'Transports OK · Pas de chevauchement' });
  return alerts;
}

function checkSolo(t) {
  const hasConfirmed = (t.transports || []).some(tr => tr.status === 'confirm');
  return hasConfirmed ? 'ok' : 'err';
}
