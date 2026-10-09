// Articles de stock au sac (croquettes, litière…) : suivi par « sac fini », prévision d'après le poids des sacs.
import { jour, liste } from "./prevision.js";

const ORDRE = { compte: 0, achat: 1, ouvert: 2, fini: 3 };

// Tous les mouvements d'un article, dans l'ordre chronologique
function mouvements(a) {
  const m = [];
  liste(a.achats).forEach(x => m.push({ t: "achat", id: x.id, j: jour(x.date), ts: +x.ts || 0, n: Math.round(+x.n || 0), p: +x.poids || +a.poids || 0 }));
  liste(a.comptages).forEach(x => m.push({ t: "compte", id: x.id, j: jour(x.date), ts: +x.ts || 0, n: Math.max(0, Math.round(+x.n || 0)), entame: !!x.entame, p: +a.poids || 0 }));
  liste(a.evts).forEach(x => m.push({ t: x.type === "ouvert" ? "ouvert" : "fini", id: x.id, j: jour(x.date), ts: +x.ts || 0 }));
  return m.filter(x => Number.isFinite(x.j)).sort((x, y) => x.j - y.j || (x.ts && y.ts ? x.ts - y.ts : ORDRE[x.t] - ORDRE[y.t]));
}

// Rejoue l'historique : file des sacs en stock (poids de chacun), durée de chaque sac fini, consommation moyenne
export function suivi(a, auj) {
  const mv = mouvements(a), queue = [], sacs = [], hist = [];
  let debut = null, dernierFini = null, ouvertLe = null;
  for (const e of mv) {
    if (e.t === "achat") for (let i = 0; i < e.n; i++) queue.push(e.p);
    else if (e.t === "compte") {
      while (queue.length > e.n) queue.pop();
      while (queue.length < e.n) queue.push(e.p);
      debut = null; ouvertLe = e.entame ? e.j : null; if (e.entame) debut = e.j;
    } else if (e.t === "ouvert") { debut = e.j; ouvertLe = e.j; }
    else {
      const p = queue.length ? queue.shift() : +a.poids || 0;
      if (debut !== null && e.j > debut) sacs.push({ du: debut, au: e.j, p });
      debut = e.j; dernierFini = e.j; ouvertLe = null;
    }
    hist.push({ j: e.j, n: queue.length, t: e.t });
  }
  const recents = sacs.slice(-5), jours = recents.reduce((s, x) => s + (x.au - x.du), 0);
  const aPoids = recents.length && recents.every(x => x.p > 0);
  const poidsSac = x => (x > 0 ? x : 1); // sans poids renseigné, on raisonne en sacs
  const rate = recents.length && jours > 0 ? recents.reduce((s, x) => s + poidsSac(x.p), 0) / jours : null; // poids (ou sacs) par jour
  const kgJour = rate && aPoids ? rate : null;
  // sac en cours : part déjà consommée d'après la durée écoulée depuis son début
  let consomme = 0;
  if (queue.length && rate && debut !== null && auj > debut) consomme = Math.min(poidsSac(queue[0]) * 0.95, rate * (auj - debut));
  const resteBrut = queue.reduce((s, x) => s + poidsSac(x), 0), reste = Math.max(0, resteBrut - consomme);
  const sacsEquiv = queue.length ? queue.length - consomme / poidsSac(queue[0]) : 0;
  const joursRestants = rate ? Math.max(0, Math.floor(reste / rate)) : null;
  return {
    queue, nb: queue.length, sacsEquiv, hist, sacs, rate, kgJour, reste, jours: joursRestants,
    rupture: rate ? auj + joursRestants : null, debut, dernierFini, ouvertLe, entame: ouvertLe !== null || (debut !== null && consomme > 0),
    nbSacs: sacs.length, resteKg: queue.length && queue.every(x => x > 0) ? reste : null
  };
}
