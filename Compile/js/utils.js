// ── HELPERS ───────────────────────────────────────────────────
function fd(s) {
  return new Date(s).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' });
}

function fdt(s) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
       + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}

function showToast(m) {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function badge(s) {
  if (s === 'plan')   return `<span class="badge bp">? Envisagé</span>`;
  if (s === 'cancel') return `<span class="badge bx">✕ Annulé</span>`;
  return `<span class="badge bc">✓ Confirmé</span>`;
}

// ── MODAL UTILS ───────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); })
  );
});
