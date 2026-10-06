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

// Une sortie compte si elle est datée après le comptage, ou le même jour mais saisie après lui
export const sortieApres = (s, c) => { const j = jour(s.date), lj = jour(c.date); return j > lj || (j === lj && (+s.ts || 0) > (+c.ts || 0)); };

// Consommation par mois (clé AAAA-MM) : réelle entre comptages, puis sorties notées depuis le dernier comptage
export function consoMensuelle(f) {
  const m = {};
  for (const p of periodes(f)) {
    if (p.conso < 0) continue;
    for (let j = jour(p.du) + 1; j <= jour(p.au); j++) { const k = enChaine(j).slice(0, 7); m[k] = (m[k] || 0) + p.rate; }
  }
  const cs = comptages(f);
  if (cs.length) {
    const last = cs[cs.length - 1];
    liste(f.foin?.sorties).filter(s => sortieApres(s, last)).forEach(s => { const k = s.date.slice(0, 7); m[k] = (m[k] || 0) + (+s.balles || 0); });
  }
  return m;
}

// Prévision : consommation par jour observée sur le même mois lors des comptages passés
export function prevision(f, auj) {
  const cs = comptages(f); if (!cs.length) return null;
  const last = cs[cs.length - 1], lj = jour(last.date);
  const livs = {};
  liste(f.foin?.livraisons).forEach(l => { const j = jour(l.date); livs[j] = (livs[j] || 0) + (+l.balles || 0); });
  // Sorties notées depuis le dernier comptage : si elles existent, elles remplacent la consommation estimée jusqu'à aujourd'hui
  const sort = {}; let nbSort = 0, totSort = 0;
  liste(f.foin?.sorties).filter(s => sortieApres(s, last)).forEach(s => { const j = jour(s.date); { sort[j] = (sort[j] || 0) + (+s.balles || 0); nbSort++; if (j <= auj) totSort += +s.balles || 0; } });
  const reel = nbSort > 0;
  const { historique, taux } = tauxMois(f);
  let stock = (+last.balles || 0) - (lj <= auj ? (sort[lj] || 0) : 0), stockAuj = lj >= auj ? stock : null, rupture = null;
  for (let i = 0; i < 1500; i++) {
    const j = lj + 1 + i;
    const conso = reel && j <= auj ? (sort[j] || 0) : (historique ? taux(new Date(j * 864e5).getUTCMonth()) : 0);
    stock += (livs[j] || 0) - conso;
    if (stock < 0) { rupture = j; if (stockAuj === null) stockAuj = 0; break; }
    if (j === auj) stockAuj = stock;
  }
  if (stockAuj === null) stockAuj = stock;
  return {
    stockAuj, historique, last, sorties: totSort, reel,
    rupture: historique && rupture ? enChaine(rupture) : null,
    jours: historique && rupture ? Math.max(0, rupture - auj) : null
  };
}

// Taux de consommation par jour, mois par mois, d'après les comptages passés
function tauxMois(f) {
  const sum = Array(12).fill(0), n = Array(12).fill(0); let tot = 0, totN = 0;
  for (const p of periodes(f)) {
    if (p.conso < 0) continue;
    for (let j = jour(p.du) + 1; j <= jour(p.au); j++) { const m = new Date(j * 864e5).getUTCMonth(); sum[m] += p.rate; n[m]++; tot += p.rate; totN++; }
  }
  // Consommation réelle notée depuis le dernier comptage (jour par jour, jusqu'à la dernière sortie)
  const cs = comptages(f);
  if (cs.length) {
    const last = cs[cs.length - 1], lj = jour(last.date), sort = {};
    liste(f.foin?.sorties).filter(s => sortieApres(s, last)).forEach(s => { const j = jour(s.date); sort[j] = (sort[j] || 0) + (+s.balles || 0); });
    const js = Object.keys(sort).map(Number);
    if (js.length) for (let j = lj + 1; j <= Math.max(...js); j++) { const m = new Date(j * 864e5).getUTCMonth(); sum[m] += sort[j] || 0; n[m]++; tot += sort[j] || 0; totN++; }
  }
  const moy = totN ? tot / totN : 0;
  return { historique: totN > 0, taux: m => (n[m] ? sum[m] / n[m] : moy) };
}

// Balles à prévoir sur les N prochains jours (null s'il n'y a pas encore d'historique)
export function consoPrevue(f, auj, jours) {
  const { historique, taux } = tauxMois(f); if (!historique) return null;
  let t = 0; for (let i = 1; i <= jours; i++) t += taux(new Date((auj + i) * 864e5).getUTCMonth());
  return t;
}

// Dépenses par mois (clé AAAA-MM) : { foin, copeaux }
export function depensesMensuelles(f) {
  const m = {}, prix = l => +l.prixTotal || (+l.prixBalle || 0) * (+l.balles || 0);
  const ajouter = (l, k) => { if (!l.date || !prix(l)) return; const c = l.date.slice(0, 7); (m[c] = m[c] || { foin: 0, copeaux: 0 })[k] += prix(l); };
  liste(f.foin?.livraisons).forEach(l => ajouter(l, "foin"));
  liste(f.copeaux?.livraisons).forEach(l => ajouter(l, "copeaux"));
  return m;
}

// Courbe du stock : historique reconstitué (comptages, livraisons, sorties) + deux projections sans nouvelle livraison
export function courbeStock(f, auj) {
  const cs = comptages(f); if (!cs.length) return null;
  const { historique, taux } = tauxMois(f);
  const livs = {}; liste(f.foin?.livraisons).forEach(l => { const j = jour(l.date); livs[j] = (livs[j] || 0) + (+l.balles || 0); });
  const comp = cs.map(c => ({ j: jour(c.date), s: +c.balles || 0 })), per = periodes(f), last = cs[cs.length - 1], lj = comp[comp.length - 1].j;
  const hist = [{ j: comp[0].j, s: comp[0].s }];
  for (let i = 1; i < cs.length; i++) {
    const a = comp[i - 1], b = comp[i]; if (b.j <= a.j) continue;
    const seg = liste(f.foin?.sorties).filter(x => sortieApres(x, cs[i - 1]) && !sortieApres(x, cs[i]));
    if (seg.length) {
      // Consommation notée : le stock suit les sorties, le comptage ne fait que rectifier
      const so = {}; seg.forEach(x => { const j = jour(x.date); so[j] = (so[j] || 0) + (+x.balles || 0); });
      let s = a.s - (so[a.j] || 0); hist[hist.length - 1] = { j: a.j, s: Math.max(0, s) };
      for (let j = a.j + 1; j <= b.j; j++) {
        s += (livs[j] || 0) - (so[j] || 0);
        if (j === b.j) { comp[i].avant = s; s = b.s; }
        hist.push({ j, s: Math.max(0, s) });
      }
      continue;
    }
    const pr = per.find(x => x.idFin === cs[i].id), rate = pr ? Math.max(0, pr.rate) : 0; let s = a.s;
    for (let j = a.j + 1; j <= b.j; j++) { s += (livs[j] || 0) - rate; if (j === b.j) s = b.s; hist.push({ j, s: Math.max(0, s) }); }
  }
  const sort = {}; liste(f.foin?.sorties).filter(x => sortieApres(x, last)).forEach(x => { const j = jour(x.date); sort[j] = (sort[j] || 0) + (+x.balles || 0); });
  const reel = Object.keys(sort).length > 0;
  let s = comp[comp.length - 1].s - (lj <= auj ? (sort[lj] || 0) : 0);
  hist[hist.length - 1] = { j: lj, s: Math.max(0, s) };
  for (let j = lj + 1; j <= auj; j++) {
    s += (livs[j] || 0) - (reel ? (sort[j] || 0) : (historique ? taux(new Date(j * 864e5).getUTCMonth()) : 0));
    hist.push({ j, s: Math.max(0, s) });
  }
  const fin = hist[hist.length - 1], sAuj = fin.s, jAuj = fin.j;
  const proj = (rateDe) => { const pts = [{ j: jAuj, s: sAuj }]; let v = sAuj, rupture = null; for (let i = 1; i <= 366; i++) { const j = jAuj + i; v -= rateDe(j); if (v <= 0) { pts.push({ j, s: 0 }); rupture = j; break; } pts.push({ j, s: v }); } return { pts, rupture }; };
  const A = historique && sAuj > 0 ? proj(j => taux(new Date(j * 864e5).getUTCMonth())) : null;
  // Consommation actuelle : moyenne des 30 derniers jours (au moins 7 jours d'historique)
  const idx = Object.fromEntries(hist.map(h => [h.j, h.s])), W = Math.min(30, jAuj - hist[0].j);
  let B = null, rateB = null;
  if (W >= 7 && sAuj > 0) {
    const liv = Object.entries(livs).filter(([j]) => +j > jAuj - W && +j <= jAuj).reduce((t, [, n]) => t + n, 0);
    rateB = ((idx[jAuj - W] ?? hist[0].s) + liv - sAuj) / W;
    if (rateB > 0.005) B = proj(() => rateB); else rateB = null;
  }
  return { hist, comp, livraisons: Object.entries(livs).map(([j, n]) => ({ j: +j, n })).filter(l => l.j >= hist[0].j && l.j <= jAuj), A, B, rateB, fenetre: W, sAuj, jAuj, taux };
}
