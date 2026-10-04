// Calculs du stock et de la prévision, partagés entre l'application et les rappels.
export const jour = d => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);
export const enChaine = n => new Date(n * 864e5).toISOString().slice(0, 10);
export const liste = o => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));

// Comptages du foin, du plus ancien au plus récent (reprend l'ancien comptage unique s'il existe)
export function comptages(f) {
  const l = liste(f.foin?.inventaires);
  if (f.foin?.inventaire?.date) l.push({ id: "legacy", ...f.foin.inventaire });
  return l.filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date));
}

// Consommation réelle entre deux comptages : stock avant + livraisons - stock après
export function periodes(f) {
  const cs = comptages(f), livs = liste(f.foin?.livraisons), out = [];
  for (let i = 1; i < cs.length; i++) {
    const a = cs[i - 1], b = cs[i], ja = jour(a.date), jb = jour(b.date), jours = jb - ja;
    if (jours <= 0) continue;
    const liv = livs.filter(l => { const j = jour(l.date); return j > ja && j <= jb; }).reduce((s, l) => s + (+l.balles || 0), 0);
    const conso = (+a.balles || 0) + liv - (+b.balles || 0);
    out.push({ du: a.date, au: b.date, jours, conso, rate: conso / jours, idFin: b.id });
  }
  return out;
}

// Prévision : consommation par jour observée sur le même mois lors des comptages passés
export function prevision(f, auj) {
  const cs = comptages(f); if (!cs.length) return null;
  const last = cs[cs.length - 1], lj = jour(last.date);
  const livs = {};
  liste(f.foin?.livraisons).forEach(l => { const j = jour(l.date); livs[j] = (livs[j] || 0) + (+l.balles || 0); });
  // Sorties notées depuis le dernier comptage : si elles existent, elles remplacent la consommation estimée jusqu'à aujourd'hui
  const sort = {}; let nbSort = 0, totSort = 0;
  liste(f.foin?.sorties).forEach(s => { const j = jour(s.date); if (j > lj) { sort[j] = (sort[j] || 0) + (+s.balles || 0); nbSort++; if (j <= auj) totSort += +s.balles || 0; } });
  const reel = nbSort > 0;
  const sum = Array(12).fill(0), n = Array(12).fill(0); let tot = 0, totN = 0;
  for (const p of periodes(f)) {
    if (p.conso < 0) continue; // incohérent (livraison oubliée ?) : ignoré
    const r = p.rate;
    for (let j = jour(p.du) + 1; j <= jour(p.au); j++) { const m = new Date(j * 864e5).getUTCMonth(); sum[m] += r; n[m]++; tot += r; totN++; }
  }
  const historique = totN > 0, moy = historique ? tot / totN : 0, taux = m => (n[m] ? sum[m] / n[m] : moy);
  let stock = +last.balles || 0, stockAuj = lj >= auj ? stock : null, rupture = null;
  for (let i = 0; i < 1500; i++) {
    const j = lj + 1 + i;
    const conso = reel && j <= auj ? (sort[j] || 0) : (historique ? taux(new Date(j * 864e5).getUTCMonth()) : 0);
    stock += (livs[j] || 0) - conso;
    if (stock < 0) { rupture = j; if (stockAuj === null) stockAuj = 0; break; }
    if (j === auj) stockAuj = stock;
  }
  if (stockAuj === null) stockAuj = stock;
  return {
    stockAuj, historique, last, sorties: totSort,
    rupture: historique && rupture ? enChaine(rupture) : null,
    jours: historique && rupture ? Math.max(0, rupture - auj) : null
  };
}
