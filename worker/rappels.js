// Rappels quotidiens : soins à prévoir et stocks bas, envoyés à chaque appareil à l'heure choisie.
import { firebaseConfig } from "../public/firebase-config.js";
import { jour, liste, prevision } from "../public/prevision.js";
import { prochaine, rdvActif, libelleSoin } from "../public/soins.js";
import { suivi } from "../public/stocks.js";
import { envoyer } from "./push.js";

// Canal ntfy : le message passe par le serveur public ntfy.sh (JSON, compatible accents) ; le nom du sujet sert de mot de passe
async function envoyerNtfy(n, m) {
  const corps = { topic: n.ntfy, title: m.titre, message: m.corps, tags: ["horse"] };
  if (n.site) { try { corps.click = new URL(m.url || "./", n.site).href; } catch { /* adresse invalide : pas de lien */ } }
  const r = await fetch("https://ntfy.sh/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  return r.status;
}
// Envoie sur les canaux de l'appareil ; renvoie 410 si l'abonnement web n'existe plus, sinon le meilleur code obtenu
async function diffuser(n, m, env) {
  let meilleur = 0, expire = false;
  if (n.sub?.endpoint) { const st = await envoyer(n.sub, m, env); if (st === 404 || st === 410) expire = true; else meilleur = st; }
  if (n.ntfy) { const st = await envoyerNtfy(n, m); if (!meilleur || (st < 300 && meilleur >= 300)) meilleur = st; }
  return { st: meilleur, expire };
}

export function maintenant(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, heure: +p.hour };
}

async function fb(env, chemin, { methode = "GET", corps, shallow } = {}) {
  const r = await fetch(`${firebaseConfig.databaseURL}/${chemin}.json?auth=${env.FIREBASE_SECRET}${shallow ? "&shallow=true" : ""}`, { method: methode, body: corps === undefined ? undefined : JSON.stringify(corps) });
  if (!r.ok) throw new Error(`Firebase ${r.status}`);
  return methode === "GET" ? r.json() : null;
}

const groupe = (titre, l) => (l.length ? `${titre} : ${l.slice(0, 3).join(", ")}${l.length > 3 ? ` + ${l.length - 3}` : ""}` : "");
// Alerte de stock : au passage du seuil, puis chaque semaine
const alerteStock = (jours, seuil, auj) => jours !== null && jours !== undefined && jours <= seuil && (jours <= 0 ? auj % 7 === 0 : (seuil - jours) % 7 === 0 || jours === 3);
const duree = j => (j <= 0 ? "stock épuisé d'après la prévision" : `environ ${j} jour${j > 1 ? "s" : ""} restant${j > 1 ? "s" : ""}`);

export function composer(f, n, auj) {
  const lignes = []; let soinsOk = false, stocksOk = false;
  if (n.soins !== false) {
    const g = { 0: [], 1: [], 7: [], retard: [] };
    liste(f.soins).forEach(s => {
      const c = f.chevaux?.[s.chevalId]; if (!c || c.actif === false) return;
      if (n.sansTypes?.[s.type] || n.sansAnimaux?.[s.chevalId]) return;
      const ech = prochaine(s); if (!ech) return;
      const rdv = rdvActif(s), d = jour(ech) - auj, nom = `${rdv ? "RDV " : ""}${libelleSoin(s)} · ${c.nom}`;
      if (d === 0 && n.rappelJour !== false) g[0].push(nom);
      else if (d === 7 && n.rappel7 !== false) g[7].push(nom);
      else if (d === 1 && rdv && n.rappel7 !== false) g[1].push(nom);
      else if (d < 0 && (-d) % 3 === 0 && n.rappelRetard !== false) g.retard.push(`${nom} (${-d} j)`);
    });
    [groupe("Aujourd'hui", g[0]), groupe("Demain", g[1]), groupe("Dans 7 jours", g[7]), groupe("En retard", g.retard)].filter(Boolean).forEach(x => { lignes.push(x); soinsOk = true; });
  }
  if (n.stocks !== false) {
    const p = prevision(f, auj);
    if (p && !n.sansStocks?.foin && alerteStock(p.jours, +f.foin?.seuilJours || 14, auj)) { lignes.push(`Foin : ${duree(p.jours)}, pense à commander`); stocksOk = true; }
    liste(f.stocks).filter(x => x.actif !== false && !n.sansStocks?.[x.id]).forEach(x => {
      const r = suivi(x, auj);
      if (alerteStock(r.jours, +x.seuilJours || 14, auj)) { lignes.push(`${x.nom} : ${duree(r.jours)}`); stocksOk = true; }
    });
  }
  if (!lignes.length) return null;
  return { titre: "Écurie", corps: lignes.join("\n"), url: soinsOk && !stocksOk ? "./?vue=soins" : stocksOk && !soinsOk ? "./?vue=foin" : "./", tag: "ecurie-rappel" };
}

export async function lancer(env, quand = maintenant()) {
  const auj = jour(quand.date), foyers = Object.keys((await fb(env, "foyers", { shallow: true })) || {});
  for (const fid of foyers) {
    try {
      const notifs = (await fb(env, `foyers/${fid}/notifs`)) || {};
      const cibles = Object.entries(notifs).filter(([, n]) => (n?.sub?.endpoint || n?.ntfy) && n.actif !== false && (n.heure === undefined ? 7 : +n.heure) === quand.heure && n.envoye !== quand.date);
      if (!cibles.length) continue;
      const foyer = (await fb(env, `foyers/${fid}`)) || {};
      for (const [k, n] of cibles) {
        try {
          const msg = composer(foyer, n, auj);
          if (msg) {
            const { st, expire } = await diffuser(n, msg, env);
            if (expire && !n.ntfy) { await fb(env, `foyers/${fid}/notifs/${k}`, { methode: "PUT", corps: null }); continue; }
            if (expire) await fb(env, `foyers/${fid}/notifs/${k}/sub`, { methode: "PUT", corps: null });
            if (!expire && st >= 300) continue;
          }
          await fb(env, `foyers/${fid}/notifs/${k}/envoye`, { methode: "PUT", corps: quand.date });
        } catch { /* un appareil en échec ne bloque pas les autres */ }
      }
    } catch { /* un foyer en échec ne bloque pas les autres */ }
  }
}

// Notification de test demandée depuis l'application (identité vérifiée auprès de Firebase Authentication)
export async function test(req, env) {
  const { idToken, fid, appareil } = await req.json().catch(() => ({}));
  if (!idToken || !fid || !appareil) return { code: 400, erreur: "Demande incomplète" };
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
  const uid = r.ok ? (await r.json()).users?.[0]?.localId : null;
  if (!uid || !appareil.startsWith(uid + "_")) return { code: 403, erreur: "Non autorisé" };
  if (!(await fb(env, `foyers/${fid}/membres/${uid}`))) return { code: 403, erreur: "Non autorisé" };
  const n = await fb(env, `foyers/${fid}/notifs/${appareil}`);
  if (!n?.sub?.endpoint && !n?.ntfy) return { code: 404, erreur: "Appareil non enregistré" };
  if (n.sub?.endpoint && !n.ntfy && (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE)) return { code: 503, erreur: "Clés d'envoi absentes de Cloudflare" };
  const sansCles = n.sub?.endpoint && (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE);
  const { st } = await diffuser(sansCles ? { ...n, sub: null } : n, { titre: "Écurie", corps: "Notification de test : tout fonctionne.", url: "./", tag: "ecurie-test" }, env);
  return st > 0 && st < 300 ? { code: 200, ok: true } : { code: 502, erreur: `Refus du service de notification (${st || "aucun envoi"})` };
}
