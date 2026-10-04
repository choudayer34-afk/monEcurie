import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, remove, update, onValue }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { jour, enChaine, liste, comptages, periodes, prevision, consoMensuelle } from "./prevision.js";
import { TYPES, libelleSoin, echeance, joursAvant } from "./soins.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const S = { user: null, fid: null, foyer: null, vue: "accueil", annee: new Date().getFullYear(), filtre: "tous", install: null };

/* ---------- Icônes ---------- */
const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  fer: '<path d="M5 21V10a7 7 0 0 1 14 0v11h-4V10a3 3 0 0 0-6 0v11z"/>',
  blé: '<path d="M12 21V9"/><path d="M12 9c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5zM12 9c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5zM12 15c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5zM12 15c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5z"/>',
  croix: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c3 0 5 1.5 5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  droite: '<path d="M9 6l6 6-6 6"/>',
  gauche: '<path d="M15 6l-6 6 6 6"/>',
  fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  reglage: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  vaccin: '<path d="M15 4l5 5M13 6l5 5-8 8-5-5zM8 14l-4 6M17 3l4 4"/>',
  pilule: '<path d="M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7z"/><path d="M8.5 8.5l7 7"/>',
  dent: '<path d="M9 3c-2.5 0-4 2-4 4.5 0 2 1 3.5 1.5 5.5.5 2.5.5 8 2.5 8 1.8 0 1.5-5 3-5s1.2 5 3 5c2 0 2-5.5 2.5-8 .5-2 1.5-3.5 1.5-5.5C19 5 17.5 3 15 3c-1.5 0-2 1-3 1S10.5 3 9 3z"/>',
  sapin: '<path d="M12 3l6 8h-3.5l4.5 7H5l4.5-7H6z"/><path d="M12 18v3"/>',
  crayon: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  retour: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  copie: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sortie: '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M16 8l4 4-4 4M20 12H9"/>'
};
const ic = (n, c = "") => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const ICONE_SOIN = { vaccin: "vaccin", vermifuge: "pilule", dentiste: "dent", ferrure: "fer" };
const ICONE_ROLE = { "Fournisseur de foin": "blé", "Vétérinaire": "croix", "Maréchal-ferrant": "fer", "Autre": "user" };

/* ---------- Dates, quantités, prix ---------- */
const aujourdhui = () => { const d = new Date(); return jour(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); };
const ajd = () => enChaine(aujourdhui());
const fr = d => d ? d.split("-").reverse().join("/") : "";
const frCourt = d => d ? new Date(d + "T12:00").toLocaleDateString("fr-FR", d.slice(0, 4) === String(new Date().getFullYear()) ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }) : "";
const parseQte = t => {
  t = String(t ?? "").trim().replace(",", ".");
  const m = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (m) return (+m[1] || 0) + (+m[2]) / (+m[3]);
  const n = parseFloat(t); return isNaN(n) ? 0 : n;
};
const fmtQte = n => {
  const w = Math.floor(n + 1e-9), f = n - w;
  for (const [a, b] of [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]]) if (Math.abs(f - a / b) < 0.012) return (w ? w + " " : "") + a + "/" + b;
  return String(Math.round(n * 100) / 100).replace(".", ",");
};
const taux = n => String(Math.round(n * 100) / 100).replace(".", ",");
const balles = n => `${fmtQte(n)} balle${n >= 2 ? "s" : ""}`;
const num = t => parseFloat(String(t ?? "").replace(",", ".")) || 0;
const arr = n => Math.round(n * 100) / 100;
const euro = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const infoPrix = l => [l.prixBalle ? `${euro(l.prixBalle)}/balle` : "", l.prixTotal ? `total ${euro(l.prixTotal)}` : ""].filter(Boolean).join(" · ");
const age = n => {
  if (!n) return "";
  const m = Math.floor((Date.now() - new Date(n).getTime()) / 2629800000);
  return m < 24 ? `${Math.max(m, 0)} mois` : `${Math.floor(m / 12)} ans`;
};
const quand = j => (j < 0 ? `en retard de ${-j} j` : j === 0 ? "aujourd'hui" : j === 1 ? "demain" : `dans ${j} j`);
const base = p => ref(db, `foyers/${S.fid}/${p}`);
const nomCheval = id => S.foyer?.chevaux?.[id]?.nom || "Cheval supprimé";
const lire = k => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrireLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };
const vite = p => Promise.race([Promise.resolve(p), new Promise(r => setTimeout(r, 1200))]); // ne bloque pas l'écran hors réseau
const vibre = () => navigator.vibrate?.(12);
const qui = () => S.foyer?.membres?.[S.user.uid]?.nom || (S.user.email.split("@")[0].replace(/^./, c => c.toUpperCase()));
function journaliser(texte, type) {
  const r = push(base("journal"));
  vite(set(r, { ts: Date.now(), uid: S.user.uid, qui: qui(), texte, type }));
  return r;
}
const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ---------- Authentification et foyer ---------- */
let initFait = false, minuteurHors;
function demarrer() {
  $("#nav").hidden = false; $("#rech").hidden = false; $("#foyerNom").textContent = S.foyer.nom || "";
  rendre();
  if (initFait) return; initFait = true;
  const q = new URLSearchParams(location.search);
  if (q.get("vue") && vues[q.get("vue")]) { S.vue = q.get("vue"); rendre(); }
  if (q.get("action") && actions[q.get("action")]) setTimeout(() => actions[q.get("action")](), 350);
  if (location.search) history.replaceState(null, "", location.pathname);
  if (!lire("ecurie-intro")) setTimeout(intro, 800);
}
onAuthStateChanged(auth, async u => {
  S.user = u;
  if (!u) return ecranConnexion();
  let fid = lire(`ecurie-fid-${u.uid}`);
  if (!fid) {
    const r = await get(ref(db, `users/${u.uid}/foyerId`));
    if (!r.exists()) return ecranFoyer();
    fid = r.val(); ecrireLocal(`ecurie-fid-${u.uid}`, fid);
  }
  S.fid = fid;
  const cache = lire(`ecurie-foyer-${fid}`);
  if (cache) { try { S.foyer = JSON.parse(cache); demarrer(); } catch { /* cache illisible */ } }
  onValue(ref(db, `foyers/${fid}`), snap => { S.foyer = snap.val() || {}; ecrireLocal(`ecurie-foyer-${fid}`, JSON.stringify(S.foyer)); demarrer(); },
    () => { try { localStorage.removeItem(`ecurie-fid-${u.uid}`); } catch { /* rien */ } $("#vue").innerHTML = `<div class="carte alerte">Accès au foyer refusé.</div>`; });
  onValue(ref(db, ".info/connected"), s => {
    clearTimeout(minuteurHors);
    if (s.val() === false) minuteurHors = setTimeout(() => { $("#hors").hidden = false; }, 3500); else $("#hors").hidden = true;
  });
});

const accroche = (titre, sous) => `<div class="accueil-log"><div class="logo">${ic("fer")}</div><h2>${titre}</h2><p>${sous}</p></div>`;

function ecranConnexion() {
  $("#nav").hidden = true; $("#titre").textContent = "Écurie"; $("#sous").textContent = ""; $("#foyerNom").textContent = "";
  $("#vue").innerHTML = accroche("Bienvenue", "Foin, soins et rappels de l'écurie, partagés en famille.") + `<div class="carte">
    <label for="em">E-mail</label><input id="em" type="email" autocomplete="email" inputmode="email">
    <label for="mp">Mot de passe</label><input id="mp" type="password" autocomplete="current-password">
    <p id="err" class="alerte petit"></p>
    <button class="btn plein" id="ent">Se connecter</button>
    <button class="btn sec plein" id="cree" style="margin-top:8px">Créer un compte</button></div>`;
  const go = fn => async () => { try { await fn(auth, $("#em").value.trim(), $("#mp").value); } catch (e) { $("#err").textContent = "Échec : " + e.code; } };
  $("#ent").onclick = go(signInWithEmailAndPassword);
  $("#cree").onclick = go(createUserWithEmailAndPassword);
}

function ecranFoyer() {
  $("#nav").hidden = true; $("#titre").textContent = "Ton foyer"; $("#sous").textContent = "";
  $("#vue").innerHTML = accroche("Ton foyer", "Toute la famille partage les mêmes données.") + `<div class="carte"><h3>Créer le foyer</h3>
      <label for="fn">Nom du foyer</label><input id="fn" placeholder="Famille …"><button class="btn plein" id="cf">Créer</button></div>
    <div class="carte"><h3>Rejoindre un foyer</h3>
      <label for="cd">Code d'invitation</label><input id="cd" maxlength="6" class="code" autocapitalize="characters">
      <p id="err" class="alerte petit"></p><button class="btn sec plein" id="rf">Rejoindre</button></div>`;
  $("#cf").onclick = async () => {
    const nom = $("#fn").value.trim(); if (!nom) return;
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    const fid = push(ref(db, "foyers")).key;
    await set(ref(db, `codes/${code}`), fid);
    await set(ref(db, `foyers/${fid}`), { nom, code, membres: { [S.user.uid]: { code, email: S.user.email } }, foin: { seuilJours: 14 } });
    await set(ref(db, `users/${S.user.uid}/foyerId`), fid);
    location.reload();
  };
  $("#rf").onclick = async () => {
    const code = $("#cd").value.trim().toUpperCase();
    const r = await get(ref(db, `codes/${code}`));
    if (!r.exists()) return ($("#err").textContent = "Code inconnu.");
    try {
      await set(ref(db, `foyers/${r.val()}/membres/${S.user.uid}`), { code, email: S.user.email });
      await set(ref(db, `users/${S.user.uid}/foyerId`), r.val());
      location.reload();
    } catch { $("#err").textContent = "Impossible de rejoindre ce foyer."; }
  };
}

/* ---------- Composants ---------- */
const AVATARS = 6;
const teinte = t => [...String(t)].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATARS;
const avatar = nom => `<span class="avatar a${teinte(nom)}">${esc((nom || "?").trim().charAt(0).toUpperCase())}</span>`;
const bulle = (icone, classe = "") => `<span class="bulle ${classe}">${ic(icone)}</span>`;
const entete = (titre, droite = "") => `<div class="entete"><h2>${titre}</h2><div class="droite">${droite}</div></div>`;
const bouton = (icone, a, extra = "", label = "") => `<button class="ib" data-a="${a}" ${extra} aria-label="${label}" title="${label}">${ic(icone)}</button>`;
const rangee = ({ gauche, titre, sous = "", a, id = "", droite = "", classe = "" }) =>
  `<div class="rangee ${classe}" ${a ? `data-a="${a}" data-id="${id}"` : ""}>${gauche}<div class="corps"><div class="titre">${titre}</div>${sous ? `<div class="petit">${sous}</div>` : ""}</div>${droite || (a ? `<span class="chev">${ic("droite")}</span>` : "")}</div>`;
const vide = (icone, texte, cta = "") => `<div class="vide">${bulle(icone, "grande")}<p>${texte}</p>${cta}</div>`;

/* ---------- Vues ---------- */
document.querySelectorAll("nav button").forEach(b => b.onclick = () => { S.vue = b.dataset.v; window.scrollTo(0, 0); rendre(); });
const vues = { accueil, chevaux, soins, foin, contacts, reglages, journal };
const TITRES = { accueil: "Accueil", chevaux: "Chevaux", soins: "Soins", foin: "Stock", contacts: "Contacts", reglages: "Foyer", journal: "Activité" };

function rendre() {
  if (!S.foyer) return;
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("actif", b.dataset.v === S.vue));
  const nbC = liste(S.foyer.chevaux).filter(c => c.actif !== false).length;
  $("#titre").textContent = TITRES[S.vue];
  $("#sous").textContent = {
    accueil: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    chevaux: `${nbC} ${nbC > 1 ? "chevaux actifs" : "cheval actif"}`,
    soins: "Vaccins, ferrure, dentiste…",
    foin: "Foin et copeaux",
    contacts: "Fournisseurs et soignants",
    reglages: "Partage et compte",
    journal: "Ce que fait la famille"
  }[S.vue];
  const y = window.scrollY;
  $("#vue").innerHTML = vues[S.vue]();
  window.scrollTo(0, y);
}

/* --- Accueil --- */
function hero(p, seuil) {
  if (!p) return `<section class="hero"><div class="hero-t">${ic("blé")}<span>Foin</span></div><div class="hero-n">Aucun comptage</div>
    <p class="hero-s">Compte tes balles pour démarrer le suivi du stock.</p><button class="btn or" data-a="inventaire">Premier comptage</button></section>`;
  const prev = p.historique, bas = prev && p.jours !== null && p.jours <= seuil, mid = prev && !bas && p.jours !== null && p.jours <= seuil * 2;
  const etat = !prev ? "Prévision après un 2e comptage" : bas ? "Commande à prévoir" : mid ? "À surveiller" : "Stock confortable";
  const pct = !prev ? 100 : p.jours === null ? 100 : Math.min(100, p.jours / (seuil * 4) * 100);
  return `<section class="hero ${bas ? "bas" : mid ? "mid" : ""}">
    <div class="hero-t">${ic("blé")}<span>Foin</span><span class="etat">${etat}</span></div>
    ${prev ? `<div class="hero-n">${p.jours === null ? "4 ans +" : p.jours}<small>${p.jours === null ? "" : p.jours <= 1 ? " jour" : " jours"}</small></div>
      <p class="hero-s">${p.rupture ? `Rupture prévue le <b>${fr(p.rupture)}</b>` : "Aucune rupture prévue"} · environ <b>${balles(p.stockAuj)}</b></p>
      <div class="jauge"><i style="width:${pct}%"></i><b style="left:25%" title="Seuil d'alerte"></b></div>`
    : `<div class="hero-n">${fmtQte(p.stockAuj)}<small> balles</small></div><p class="hero-s">Au comptage du ${fr(p.last.date)}, livraisons comprises.</p>`}
  </section>`;
}

function statistiques(nbC, plan) {
  const retard = plan.filter(s => s.j !== null && s.j < 0).length, bientot = plan.filter(s => s.j !== null && s.j >= 0 && s.j <= 30).length;
  const mois = consoMensuelle(S.foyer)[new Date().toISOString().slice(0, 7)];
  const tuile = (v, l, c = "") => `<div class="stat ${c}"><b>${v}</b><span>${l}</span></div>`;
  return `<div class="stats">${tuile(nbC, "chevaux actifs")}${tuile(retard + bientot, "soins à prévoir", retard ? "alerte-t" : "")}${tuile(mois == null ? "–" : Math.round(mois), "balles ce mois")}</div>`;
}

function rapide(p) {
  const reste = p.stockAuj - Math.floor(p.stockAuj + 1e-6);
  const entamee = p.reel && reste > 0.01 && reste < 0.99
    ? `<button class="btn or plein" data-a="finirBalle">${ic("check")} Balle entamée finie <small>(reste ${fmtQte(reste)})</small></button>` : "";
  const tuiles = [["1", "1"], ["1/2", "½"], ["1/3", "⅓"], ["1/4", "¼"]].map(([q, t]) => `<button class="tuile" data-a="retirer" data-q="${q}"><b>− ${t}</b><span>balle</span></button>`).join("");
  return `<div class="carte">${entete("Sortie rapide", bouton("reglage", "params", "", "Seuil d'alerte"))}
    ${entamee}<div class="tuiles">${tuiles}</div>
    <div class="duo"><button class="btn sec" data-a="retirer" data-q="autre">Autre quantité…</button><button class="btn sec" data-a="inventaire">${ic("check")} Comptage</button></div></div>`;
}

function accueil() {
  const p = prevision(S.foyer, aujourdhui()), seuil = +(S.foyer.foin?.seuilJours) || 14;
  const nbC = liste(S.foyer.chevaux).filter(c => c.actif !== false).length, plan = soinsPrevus();
  const urgents = plan.filter(s => s.j !== null && s.j <= 30);
  return hero(p, seuil) + statistiques(nbC, plan) + (p ? rapide(p) : "") +
    (plan.length ? `<div class="carte">${entete("Soins à prévoir", bouton("droite", "vue", 'data-v="soins"', "Tous les soins"))}
      ${urgents.length ? urgents.slice(0, 5).map(ligneSoin).join("") : `<p class="petit sobre">Rien à prévoir dans les 30 jours.</p>`}
      ${urgents.length > 5 ? `<button class="btn sec plein" data-a="vue" data-v="soins">Voir les ${urgents.length} soins</button>` : ""}</div>` : "") + activiteRecente();
}

/* --- Activité de la famille --- */
const ICONE_JOURNAL = { sortie: "blé", soin: "croix", livraison: "blé", comptage: "check", cheval: "fer", copeaux: "sapin" };
const heure = ts => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const journalListe = () => liste(S.foyer.journal).filter(j => j.ts).sort((x, y) => y.ts - x.ts);
const ligneJournal = j => rangee({ gauche: avatar(j.qui), titre: `<b>${esc(j.qui)}</b> ${esc(j.texte)}`, sous: `${heure(j.ts)} · <span class="doux-i">${ic(ICONE_JOURNAL[j.type] || "check")}</span>` });
function jourLibelle(ts) {
  const d = new Date(ts), n = new Date(), hier = new Date(Date.now() - 864e5), meme = (x, y) => x.toDateString() === y.toDateString();
  return meme(d, n) ? "Aujourd'hui" : meme(d, hier) ? "Hier" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function activiteRecente() {
  const l = journalListe().slice(0, 4); if (!l.length) return "";
  return `<div class="carte">${entete("Activité récente", bouton("droite", "vue", 'data-v="journal"', "Toute l'activité"))}${l.map(ligneJournal).join("")}</div>`;
}
function journal() {
  const l = journalListe().slice(0, 150);
  let html = `<div class="chips"><button class="chip" data-a="vue" data-v="accueil">${ic("gauche")} Accueil</button></div>`;
  if (!l.length) return html + vide("check", "Rien pour l'instant. Les retraits de balles, soins et livraisons notés par la famille apparaîtront ici.");
  let dernier = "", ouvert = false;
  for (const j of l) {
    const lib = jourLibelle(j.ts);
    if (lib !== dernier) { if (ouvert) html += `</div>`; html += `<h3 class="groupe">${lib}</h3><div class="carte liste">`; dernier = lib; ouvert = true; }
    html += ligneJournal(j);
  }
  return html + `</div>`;
}

/* --- Soins --- */
function soinsPrevus() {
  const auj = aujourdhui();
  return liste(S.foyer.soins).filter(s => S.foyer.chevaux?.[s.chevalId])
    .map(s => { const ech = echeance(s); return { ...s, ech, j: joursAvant(ech, auj) }; })
    .sort((x, y) => (x.ech === null) - (y.ech === null) || (x.ech || "").localeCompare(y.ech || ""));
}
const urgence = j => (j === null ? "neutre" : j < 0 ? "retard" : j <= 30 ? "bientot" : "ok");
function ligneSoin(s) {
  return `<div class="glisse"><div class="fond">${ic("check")} Fait</div>` + rangee({
    gauche: bulle(ICONE_SOIN[s.type] || "croix", urgence(s.j)), classe: `u-${urgence(s.j)}`, a: "soin", id: s.id,
    titre: `${esc(libelleSoin(s))} · ${esc(S.foyer.chevaux[s.chevalId].nom)}`,
    sous: s.j === null ? "À planifier" : `<span class="q ${urgence(s.j)}">${quand(s.j)}</span> · ${frCourt(s.ech)}${s.dernier ? ` · fait le ${frCourt(s.dernier)}` : ""}`,
    droite: `<button class="fait" data-a="soinFait" data-id="${s.id}" aria-label="Marquer comme fait" title="Fait aujourd'hui">${ic("check")}</button>`
  }) + `</div>`;
}
function soins() {
  const tous = soinsPrevus(), l = S.filtre === "tous" ? tous : tous.filter(s => s.type === S.filtre);
  const chips = [["tous", "Tous", ""], ...Object.entries(TYPES).map(([k, t]) => [k, t.nom, ICONE_SOIN[k]])]
    .map(([k, t, i]) => `<button class="chip ${S.filtre === k ? "actif" : ""}" data-a="filtre" data-f="${k}">${i ? ic(i) : ""}${t}</button>`).join("");
  const groupes = [["En retard", s => s.j !== null && s.j < 0], ["Dans les 30 jours", s => s.j !== null && s.j >= 0 && s.j <= 30], ["Plus tard", s => s.j !== null && s.j > 30], ["À planifier", s => s.j === null]];
  const blocs = groupes.map(([t, f]) => { const g = l.filter(f); return g.length ? `<h3 class="groupe">${t} <span>${g.length}</span></h3><div class="carte liste">${g.map(ligneSoin).join("")}</div>` : ""; }).join("");
  return `<div class="chips">${chips}</div>` + (tous.length ? `<p class="petit astuce">Astuce : glisse une ligne vers la droite pour la valider.</p>` : "") + (blocs || vide("croix", "Aucun soin suivi pour l'instant.", `<button class="btn" data-a="soin">${ic("plus")} Ajouter un soin</button>`)) +
    `<button class="fab" data-a="soin" aria-label="Ajouter un soin" title="Ajouter un soin">${ic("plus")}</button>`;
}

/* --- Chevaux --- */
function chevaux() {
  const l = liste(S.foyer.chevaux).sort((a, b) => (b.actif !== false) - (a.actif !== false) || (a.nom || "").localeCompare(b.nom || ""));
  const plan = soinsPrevus();
  return (l.length ? `<div class="carte liste">${l.map(c => {
    const prochain = plan.find(s => s.chevalId === c.id && s.j !== null);
    return rangee({
      gauche: avatar(c.nom), classe: c.actif === false ? "inactif" : "", a: "cheval", id: c.id, titre: esc(c.nom),
      sous: [esc(c.robe || ""), age(c.naissance), c.sire ? "SIRE " + esc(c.sire) : "", c.actif === false ? "inactif" : ""].filter(Boolean).join(" · ") || "Fiche à compléter",
      droite: prochain ? `<span class="badge ${urgence(prochain.j)}">${ic(ICONE_SOIN[prochain.type])}${quand(prochain.j)}</span>` : `<span class="chev">${ic("droite")}</span>`
    });
  }).join("")}</div>` : vide("fer", "Ajoute ton premier cheval.", `<button class="btn" data-a="cheval">${ic("plus")} Ajouter un cheval</button>`)) +
    `<button class="fab" data-a="cheval" aria-label="Ajouter un cheval" title="Ajouter un cheval">${ic("plus")}</button>`;
}

/* --- Stock --- */
function graphique() {
  const m = consoMensuelle(S.foyer), an = S.annee, cle = (y, i) => `${y}-${String(i + 1).padStart(2, "0")}`;
  const sel = [...Array(12)].map((_, i) => m[cle(an, i)]), prev = [...Array(12)].map((_, i) => m[cle(an - 1, i)]);
  const max = Math.max(1, ...sel.filter(x => x != null), ...prev.filter(x => x != null));
  const haut = 100, bas = 124, moisCourant = new Date().getFullYear() === an ? new Date().getMonth() : -1;
  const tot = t => Math.round(t.reduce((s, x) => s + (x || 0), 0)), tS = tot(sel), tP = tot(prev);
  let svg = [0.5, 1].map(f => `<line x1="0" x2="340" y1="${bas - f * haut}" y2="${bas - f * haut}" class="grille"/>`).join("") + `<text class="axe" x="0" y="${bas - haut - 3}">${Math.round(max)}</text>`;
  "JFMAMJJASOND".split("").forEach((l, i) => {
    const x = i * 28 + 6;
    if (prev[i] != null) { const h = Math.max(2, prev[i] / max * haut); svg += `<rect class="b1" x="${x}" y="${bas - h}" width="10" height="${h}" rx="3"/>`; }
    if (sel[i] != null) { const h = Math.max(2, sel[i] / max * haut); svg += `<rect class="b2" x="${x + 12}" y="${bas - h}" width="10" height="${h}" rx="3"/><text class="val" x="${x + 17}" y="${bas - h - 4}">${Math.round(sel[i])}</text>`; }
    svg += `<text class="mois ${i === moisCourant ? "cour" : ""}" x="${x + 11}" y="142">${l}</text>`;
  });
  const delta = tS && tP ? Math.round((tS - tP) / tP * 100) : null;
  return `<div class="carte">${entete("Consommation", `<div class="annee">${bouton("gauche", "annee", 'data-d="-1"', "Année précédente")}<b>${an}</b>${bouton("droite", "annee", 'data-d="1"', "Année suivante")}</div>`)}
    <div class="chiffres"><div><b>${tS}</b><span>balles en ${an}</span></div><div><b class="doux">${tP}</b><span>en ${an - 1}</span></div>${delta !== null ? `<div><b class="${delta > 0 ? "hausse" : "baisse"}">${delta > 0 ? "+" : ""}${delta} %</b><span>vs ${an - 1}</span></div>` : ""}</div>
    <svg viewBox="0 0 340 148" class="graph" role="img" aria-label="Balles consommées par mois">${svg}</svg>
    <div class="legende"><span><i class="b2"></i>${an}</span><span><i class="b1"></i>${an - 1}</span><span class="petit">balles entières par mois</span></div></div>`;
}

function foin() {
  const f = S.foyer.foin || {}, cop = S.foyer.copeaux || {};
  const cs = comptages(S.foyer).reverse(), per = Object.fromEntries(periodes(S.foyer).map(p => [p.idFin, p]));
  const livs = liste(f.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const livC = liste(cop.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const nomC = id => esc(S.foyer.contacts?.[id]?.nom || "");
  const lignesLiv = (l, a) => l.map(x => rangee({
    gauche: bulle(a === "livraison" ? "blé" : "sapin", "or"), a, id: x.id, titre: `${balles(+x.balles || 0)} <span class="date">${frCourt(x.date)}</span>`,
    sous: [x.poidsBalle ? `${x.poidsBalle} kg/balle (≈ ${Math.round(x.balles * x.poidsBalle)} kg)` : "", infoPrix(x), nomC(x.contactId), esc(x.note || "")].filter(Boolean).join(" · ")
  })).join("");
  return graphique() +
    `<div class="carte">${entete("Comptages du foin", bouton("reglage", "params", "", "Seuil d'alerte") + bouton("plus", "inventaire", "", "Nouveau comptage"))}
      ${cs.length ? cs.map(c => { const p = per[c.id]; return rangee({
        gauche: bulle("check", "vert"), a: "inventaire", id: c.id, titre: `${balles(+c.balles || 0)} <span class="date">${frCourt(c.date)}</span>`,
        sous: p ? (p.conso < 0 ? `<span class="q retard">Incohérent : livraison oubliée ?</span>` : `${balles(Math.round(p.conso * 100) / 100)} consommées en ${p.jours} j (${taux(p.rate)}/jour)`) : "Premier comptage"
      }); }).join("") : `<p class="petit sobre">Aucun comptage. Tu peux saisir ceux des années passées pour affiner la prévision.</p>`}</div>
    <div class="carte">${entete("Livraisons de foin", bouton("plus", "livraison", "", "Nouvelle livraison"))}${livs.length ? lignesLiv(livs, "livraison") : `<p class="petit sobre">Aucune livraison notée.</p>`}</div>
    <div class="carte">${entete("Copeaux de bois", bouton("check", "inventaireCopeaux", "", "Comptage") + bouton("plus", "livraisonCopeaux", "", "Nouvelle livraison"))}
      <p class="petit sobre">${cop.inventaire ? `Dernier comptage : <b>${balles(+cop.inventaire.balles || 0)}</b> le ${fr(cop.inventaire.date)}` : "Aucun comptage."}</p>${lignesLiv(livC, "livraisonCopeaux")}</div>`;
}

/* --- Contacts --- */
function contacts() {
  const l = liste(S.foyer.contacts).sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  const act = (i, href, label) => `<a class="ib rond" href="${href}" aria-label="${label}" title="${label}" target="${href.startsWith("http") ? "_blank" : "_self"}" rel="noopener">${ic(i)}</a>`;
  return (l.length ? `<div class="carte liste">${l.map(c => rangee({
    gauche: bulle(ICONE_ROLE[c.role] || "user", "vert"), a: "contact", id: c.id, titre: esc(c.nom),
    sous: [esc(c.role || ""), esc(c.adresse || "")].filter(Boolean).join(" · "),
    droite: `<span class="actions-r">${c.tel ? act("tel", "tel:" + esc(c.tel), "Appeler") : ""}${c.email ? act("mail", "mailto:" + esc(c.email), "Écrire") : ""}${c.adresse ? act("pin", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.adresse), "Itinéraire") : ""}</span>`
  })).join("")}</div>` : vide("user", "Ajoute ton fournisseur de foin, ton vétérinaire, ton maréchal…", `<button class="btn" data-a="contact">${ic("plus")} Ajouter un contact</button>`)) +
    `<button class="fab" data-a="contact" aria-label="Ajouter un contact" title="Ajouter un contact">${ic("plus")}</button>`;
}

/* --- Foyer --- */
function reglages() {
  const m = liste(S.foyer.membres), ios = /iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone;
  return `<div class="carte centre"><div class="petit">Code d'invitation de « ${esc(S.foyer.nom)} »</div>
      <div class="code-grand">${esc(S.foyer.code)}</div>
      <button class="btn sec" data-a="copier">${ic("copie")} Copier le code</button></div>
    <div class="carte">${entete("Membres", bouton("crayon", "prenom", "", "Modifier mon prénom"))}${m.map(x => rangee({ gauche: avatar(x.nom || x.email), titre: esc(x.nom || x.email), sous: x.nom ? esc(x.email) : "" })).join("")}</div>
    ${S.install ? `<button class="btn plein" data-a="installer">${ic("plus")} Installer l'application</button>` : ""}
    ${ios ? `<div class="carte petit">Sur iPhone : touche le bouton Partager, puis « Sur l'écran d'accueil » pour installer l'application.</div>` : ""}
    <button class="btn sec plein" data-a="intro">Revoir la présentation</button>
    <button class="btn sec plein" data-a="sortie">${ic("sortie")} Se déconnecter</button>`;
}

/* ---------- Fenêtres de saisie ---------- */
const champ = (id, lib, v = "", type = "text", extra = "") => `<div class="champ"><label for="${id}">${lib}</label><input id="${id}" type="${type}" value="${esc(v)}" ${extra}></div>`;
const val = id => $("#" + id).value.trim();
const radio = n => document.querySelector(`input[name=${n}]:checked`)?.value || "";
const pills = (nom, options, courant) => `<div class="pills">${options.map(([v, t, i]) =>
  `<label class="pill"><input type="radio" name="${nom}" value="${esc(v)}" ${v === courant ? "checked" : ""}><span>${i ? ic(i) : ""}${t}</span></label>`).join("")}</div>`;
const qte = (id, lib, v = "", chips = []) => `<label for="${id}">${lib}</label>
  <div class="pas"><button type="button" class="ib" data-a="pas" data-c="${id}" data-p="-1" aria-label="Moins">−</button>
  <input id="${id}" type="text" inputmode="decimal" value="${esc(v)}" placeholder="0"><button type="button" class="ib" data-a="pas" data-c="${id}" data-p="1" aria-label="Plus">+</button></div>
  ${chips.length ? `<div class="chips pet">${chips.map(q => `<button type="button" class="chip" data-a="chip" data-c="${id}" data-q="${q}">${q}</button>`).join("")}</div>` : ""}`;

function ouvrir(titre, corps, onOk, onSup, requis = []) {
  const d = $("#dlg");
  d.innerHTML = `<div class="poignee"></div><div class="entete"><h2>${titre}</h2><button class="ib" id="ann" aria-label="Fermer">${ic("fermer")}</button></div>
    <div class="formulaire">${corps}</div>
    <div class="barre">${onSup ? `<button class="btn danger-t" id="sup">Supprimer</button>` : ""}<button class="btn plein" id="ok">Enregistrer</button></div>`;
  $("#ann").onclick = () => d.close();
  $("#ok").onclick = async () => {
    for (const r of requis) if (!val(r)) { const e = $("#" + r); e.classList.add("invalide"); e.focus(); return; }
    $("#ok").disabled = true;
    try { await vite(onOk()); d.close(); } catch (e) { $("#ok").disabled = false; toast("Enregistrement impossible"); }
  };
  if (onSup) $("#sup").onclick = async () => {
    const b = $("#sup");
    if (!b.dataset.sur) { b.dataset.sur = "1"; b.textContent = "Confirmer la suppression"; b.classList.add("danger"); return; }
    await onSup(); d.close();
  };
  d.addEventListener("input", e => e.target.classList.remove("invalide"));
  d.showModal();
  const premier = d.querySelector("input[type=text]:not([readonly]), input[type=number]"); if (premier && !premier.value && matchMedia("(pointer:fine)").matches) premier.focus();
}
$("#dlg").addEventListener("click", e => { if (e.target === $("#dlg")) $("#dlg").close(); });

let minuteur;
function toast(msg, annuler) {
  const t = $("#toast");
  t.innerHTML = `<span>${msg}</span>${annuler ? `<button id="tann">${ic("retour")} Annuler</button>` : ""}`;
  t.classList.add("visible");
  if (annuler) $("#tann").onclick = async () => { t.classList.remove("visible"); await annuler(); };
  clearTimeout(minuteur); minuteur = setTimeout(() => t.classList.remove("visible"), 6000);
}

const prixChamps = l => `<div class="duo">${champ("pb", "Prix par balle (€)", l.prixBalle || "", "text", 'inputmode="decimal"')}${champ("pt", "Prix total (€)", l.prixTotal || "", "text", 'inputmode="decimal"')}</div>
  <p class="petit">Renseigne l'un des deux : l'autre se calcule.</p>`;
function lierPrix(dernier) {
  const b = $("#b"), pb = $("#pb"), pt = $("#pt"), q = () => parseQte(b.value);
  pb.oninput = () => { dernier = "pb"; pt.value = pb.value.trim() && q() ? arr(num(pb.value) * q()) : ""; };
  pt.oninput = () => { dernier = "pt"; pb.value = pt.value.trim() && q() ? arr(num(pt.value) / q()) : ""; };
  b.oninput = () => {
    if (dernier === "pt" && pt.value.trim()) pb.value = q() ? arr(num(pt.value) / q()) : "";
    else if (pb.value.trim()) pt.value = q() ? arr(num(pb.value) * q()) : "";
  };
}
const options = (liste_, sel, lib = x => esc(x.nom)) => liste_.map(c => `<option value="${c.id}" ${sel === c.id ? "selected" : ""}>${lib(c)}</option>`).join("");

function noterSortie(q, date = ajd(), texte) {
  if (!(q > 0)) return;
  vibre();
  const r = push(base("foin/sorties")), j = journaliser(texte || `a retiré ${balles(q)}`, "sortie");
  vite(set(r, { date, balles: q, ts: Date.now() }));
  toast(`− ${balles(q)} noté`, () => { remove(r); remove(j); });
}

/* ---------- Actions ---------- */
const actions = {
  cheval(id) {
    const c = id ? S.foyer.chevaux[id] : { actif: true };
    ouvrir(id ? "Modifier le cheval" : "Nouveau cheval",
      champ("n", "Nom", c.nom, "text", 'autocomplete="off"') +
      `<div class="duo">${champ("r", "Robe", c.robe)}${champ("na", "Naissance", c.naissance, "date")}</div>` +
      champ("si", "N° SIRE", c.sire, "text", 'autocapitalize="characters" autocomplete="off"') +
      `<label class="interrupteur"><input type="checkbox" id="ac" ${c.actif !== false ? "checked" : ""}><span class="rail"></span>Cheval actif</label>` +
      `<label for="no">Notes</label><textarea id="no" rows="3">${esc(c.notes)}</textarea>`,
      () => (!id && journaliser(`a ajouté le cheval ${val("n")}`, "cheval"), set(id ? base(`chevaux/${id}`) : push(base("chevaux")), { nom: val("n"), sire: val("si").toUpperCase(), robe: val("r"), naissance: val("na"), actif: $("#ac").checked, notes: val("no") })),
      id && (() => update(ref(db, `foyers/${S.fid}`), Object.fromEntries([[`chevaux/${id}`, null], ...liste(S.foyer.soins).filter(s => s.chevalId === id).map(s => [`soins/${s.id}`, null])]))), ["n"]);
  },
  contact(id) {
    const c = id ? S.foyer.contacts[id] : { role: "Fournisseur de foin" };
    ouvrir(id ? "Modifier le contact" : "Nouveau contact",
      champ("n", "Nom", c.nom) + `<label>Rôle</label>` + pills("ro", Object.keys(ICONE_ROLE).map(r => [r, r.replace("Fournisseur de foin", "Foin").replace("Maréchal-ferrant", "Maréchal"), ICONE_ROLE[r]]), c.role || "Autre") +
      `<div class="duo">${champ("t", "Téléphone", c.tel, "tel", 'inputmode="tel"')}${champ("e", "E-mail", c.email, "email", 'inputmode="email"')}</div>` +
      champ("ad", "Adresse", c.adresse, "text", 'autocomplete="street-address"') + `<label for="no">Notes</label><textarea id="no" rows="2">${esc(c.notes)}</textarea>`,
      () => set(id ? base(`contacts/${id}`) : push(base("contacts")), { nom: val("n"), role: radio("ro"), tel: val("t"), email: val("e"), adresse: val("ad"), notes: val("no") }),
      id && (() => remove(base(`contacts/${id}`))), ["n"]);
  },
  livraison(id) {
    const l = id ? S.foyer.foin.livraisons[id] : { date: ajd() };
    ouvrir(id ? "Modifier la livraison" : "Livraison de foin",
      champ("d", "Date", l.date, "date") + qte("b", "Nombre de balles", l.balles === undefined ? "" : fmtQte(l.balles)) +
      champ("p", "Poids moyen d'une balle (kg, facultatif)", l.poidsBalle || "", "number", 'min="0" step="0.5" inputmode="decimal"') + prixChamps(l) +
      `<label for="c">Fournisseur</label><select id="c"><option value="">—</option>${options(liste(S.foyer.contacts), l.contactId)}</select>` + champ("no", "Note", l.note),
      () => (!id && journaliser(`a noté une livraison de ${balles(parseQte(val("b")))}`, "livraison"), set(id ? base(`foin/livraisons/${id}`) : push(base("foin/livraisons")), { date: val("d"), balles: parseQte(val("b")), poidsBalle: +val("p") || 0, prixBalle: num(val("pb")), prixTotal: num(val("pt")), contactId: val("c"), note: val("no") })),
      id && (() => remove(base(`foin/livraisons/${id}`))), ["d", "b"]);
    lierPrix(l.prixTotal ? "pt" : "pb");
  },
  livraisonCopeaux(id) {
    const l = id ? S.foyer.copeaux.livraisons[id] : { date: ajd() };
    ouvrir(id ? "Modifier la livraison" : "Livraison de copeaux",
      champ("d", "Date", l.date, "date") + qte("b", "Nombre de balles", l.balles === undefined ? "" : fmtQte(l.balles)) + prixChamps(l) +
      `<label for="c">Fournisseur</label><select id="c"><option value="">—</option>${options(liste(S.foyer.contacts), l.contactId)}</select>` + champ("no", "Note", l.note),
      () => (!id && journaliser(`a noté une livraison de ${balles(parseQte(val("b")))} de copeaux`, "copeaux"), set(id ? base(`copeaux/livraisons/${id}`) : push(base("copeaux/livraisons")), { date: val("d"), balles: parseQte(val("b")), prixBalle: num(val("pb")), prixTotal: num(val("pt")), contactId: val("c"), note: val("no") })),
      id && (() => remove(base(`copeaux/livraisons/${id}`))), ["d", "b"]);
    lierPrix(l.prixTotal ? "pt" : "pb");
  },
  retirer(_id, d) {
    if (d?.q && d.q !== "autre") return noterSortie(parseQte(d.q));
    ouvrir("Retirer du stock", qte("b", "Quantité retirée (balles)", "", ["1/4", "1/3", "1/2", "2/3", "1", "2"]) + champ("d", "Date", ajd(), "date"),
      () => noterSortie(parseQte(val("b")), val("d") || ajd()), null, ["b"]);
  },
  finirBalle() {
    const p = prevision(S.foyer, aujourdhui()); if (!p) return;
    const r = p.stockAuj - Math.floor(p.stockAuj + 1e-6);
    if (r > 0.01 && r < 0.99) return noterSortie(r, ajd(), "a fini la balle entamée");
  },
  pas: (_i, d) => { const e = $("#" + d.c); e.value = fmtQte(Math.max(0, parseQte(e.value) + +d.p)); e.dispatchEvent(new Event("input", { bubbles: true })); },
  chip: (_i, d) => { const e = $("#" + d.c); e.value = d.q; e.dispatchEvent(new Event("input", { bubbles: true })); },
  vue: (_id, d) => { S.vue = d.v; window.scrollTo(0, 0); rendre(); },
  filtre: (_id, d) => { S.filtre = d.f; rendre(); },
  annee: (_id, d) => { S.annee += +d.d; rendre(); },
  soinFait(id) {
    const s = S.foyer.soins[id], jr = ajd(), avant = s.dernier || "", r = push(base(`soins/${id}/passages`));
    vibre();
    const j = journaliser(`a noté ${libelleSoin(s)} · ${nomCheval(s.chevalId)}`, "soin");
    vite(update(base(`soins/${id}`), { dernier: jr })); vite(set(r, { date: jr, ts: Date.now() }));
    toast(`${esc(libelleSoin(s))} noté, prochain ${fr(echeance({ ...s, dernier: jr }))}`, () => { update(base(`soins/${id}`), { dernier: avant }); remove(r); remove(j); });
  },
  soin(id) {
    const chev = liste(S.foyer.chevaux).filter(c => c.actif !== false || c.id === S.foyer.soins?.[id]?.chevalId).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
    const s = id ? S.foyer.soins[id] : { type: "vaccin", n: TYPES.vaccin.n, unite: TYPES.vaccin.unite };
    ouvrir(id ? "Modifier le soin" : "Nouveau soin",
      `<label for="ch">Cheval</label><select id="ch">${id ? "" : '<option value="*">Tous les chevaux actifs</option>'}${options(chev, s.chevalId)}</select>
       <label>Type de soin</label>${pills("ty", Object.entries(TYPES).map(([k, t]) => [k, t.nom, ICONE_SOIN[k]]), s.type)}` +
      champ("li", "Précision (ex. Grippe, Tétanos)", s.libelle) +
      `<label>Périodicité : tous les</label><div class="duo"><input id="pn" type="number" min="1" inputmode="numeric" value="${s.n || 1}"><select id="pu"><option value="sem" ${s.unite === "sem" ? "selected" : ""}>semaines</option><option value="mois" ${s.unite !== "sem" ? "selected" : ""}>mois</option></select></div>` +
      `<div class="duo">${champ("de", "Dernier passage", s.dernier, "date")}${champ("pr", "1re échéance", s.premiere, "date")}</div><p class="petit">La 1re échéance sert tant qu'aucun passage n'est noté.</p>` +
      `<label for="co">Intervenant</label><select id="co"><option value="">—</option>${options(liste(S.foyer.contacts), s.contactId, c => `${esc(c.nom)} (${esc(c.role || "")})`)}</select>` + champ("no", "Note", s.note),
      async () => {
        const o = { type: radio("ty"), libelle: val("li"), n: +val("pn") || 1, unite: val("pu"), dernier: val("de"), premiere: val("pr"), contactId: val("co"), note: val("no") };
        if (id) return update(base(`soins/${id}`), { ...o, chevalId: val("ch") });
        const cibles = val("ch") === "*" ? chev.filter(c => c.actif !== false).map(c => c.id) : [val("ch")];
        for (const cid of cibles) await set(push(base("soins")), { ...o, chevalId: cid });
      },
      id && (() => remove(base(`soins/${id}`))));
    document.querySelectorAll("input[name=ty]").forEach(r => r.onchange = () => { if (!id) { const t = TYPES[radio("ty")]; $("#pn").value = t.n; $("#pu").value = t.unite; } });
  },
  inventaire(id) {
    const i = id ? comptages(S.foyer).find(x => x.id === id) : { date: ajd() };
    const chemin = id === "legacy" ? "foin/inventaire" : `foin/inventaires/${id}`;
    ouvrir(id ? "Modifier le comptage" : "Comptage du foin", champ("d", "Date du comptage", i.date, "date") + qte("b", "Balles en stock", i.balles === undefined ? "" : fmtQte(i.balles)),
      () => { const o = { date: val("d"), balles: parseQte(val("b")) }; if (!id) o.ts = Date.now(); else if (i.ts) o.ts = i.ts; if (!id) journaliser(`a compté ${balles(o.balles)} en stock`, "comptage"); return set(id ? base(chemin) : push(base("foin/inventaires")), o); },
      id && (() => remove(base(chemin))), ["d", "b"]);
  },
  inventaireCopeaux() {
    const i = S.foyer.copeaux?.inventaire || { date: ajd() };
    ouvrir("Comptage des copeaux", champ("d", "Date du comptage", i.date, "date") + qte("b", "Balles en stock", i.balles === undefined ? "" : fmtQte(i.balles)),
      () => (journaliser(`a compté ${balles(parseQte(val("b")))} de copeaux`, "copeaux"), set(base("copeaux/inventaire"), { date: val("d"), balles: parseQte(val("b")) })), null, ["b"]);
  },
  params() {
    const f = S.foyer.foin || {};
    ouvrir("Seuil d'alerte", `<p class="petit">L'accueil passe en alerte quand il reste moins de ce nombre de jours de foin.</p>` + champ("s", "Alerte quand il reste (jours)", f.seuilJours || 14, "number", 'min="1" inputmode="numeric"'),
      () => update(base("foin"), { seuilJours: +val("s") || 14 }));
  },
  prenom() {
    ouvrir("Mon prénom", `<p class="petit">Affiché dans l'activité de la famille.</p>` + champ("pr", "Prénom", S.foyer.membres?.[S.user.uid]?.nom || "", "text", 'autocomplete="given-name"'),
      () => update(base(`membres/${S.user.uid}`), { nom: val("pr") }), null, ["pr"]);
  },
  res: (id, d) => { $("#drech").close(); actions[d.t](id); },
  intro: () => intro(),
  installer: async () => { if (S.install) { S.install.prompt(); await S.install.userChoice; S.install = null; rendre(); } },
  copier: () => navigator.clipboard?.writeText(S.foyer.code).then(() => toast("Code copié")),
  sortie: () => {
    try { Object.keys(localStorage).filter(k => k.startsWith("ecurie-fid-") || k.startsWith("ecurie-foyer-")).forEach(k => localStorage.removeItem(k)); } catch { /* rien */ }
    return signOut(auth).then(() => location.reload());
  }
};

document.addEventListener("click", e => {
  if (e.target.closest("a:not([data-a])") || Date.now() - bloque < 400) return;
  const el = e.target.closest("[data-a]");
  if (!el || !S.foyer) return;
  e.stopPropagation(); e.preventDefault();
  actions[el.dataset.a]?.(el.dataset.id, el.dataset);
});

/* ---------- Recherche ---------- */
function chercher() {
  const d = $("#drech");
  d.innerHTML = `<div class="poignee"></div><div class="entete"><h2>Rechercher</h2><button class="ib" id="rfer" aria-label="Fermer">${ic("fermer")}</button></div>
    <div class="formulaire"><input id="rq" type="search" placeholder="Cheval, soin, contact…" autocomplete="off" enterkeyhint="search"><div id="rres"></div></div>`;
  $("#rfer").onclick = () => d.close();
  const index = [
    ...liste(S.foyer.chevaux).map(c => ({ t: "cheval", id: c.id, g: avatar(c.nom), titre: esc(c.nom), sous: [esc(c.robe || ""), c.sire ? "SIRE " + esc(c.sire) : ""].filter(Boolean).join(" · "), mots: norm([c.nom, c.robe, c.sire, c.notes].join(" ")) })),
    ...liste(S.foyer.contacts).map(c => ({ t: "contact", id: c.id, g: bulle(ICONE_ROLE[c.role] || "user", "vert"), titre: esc(c.nom), sous: esc(c.role || ""), mots: norm([c.nom, c.role, c.adresse, c.tel, c.email, c.notes].join(" ")) })),
    ...liste(S.foyer.soins).filter(s => S.foyer.chevaux?.[s.chevalId]).map(s => ({ t: "soin", id: s.id, g: bulle(ICONE_SOIN[s.type] || "croix"), titre: `${esc(libelleSoin(s))} · ${esc(nomCheval(s.chevalId))}`, sous: "Soin", mots: norm([libelleSoin(s), nomCheval(s.chevalId), s.note].join(" ")) }))
  ];
  const maj = () => {
    const mots = norm($("#rq").value).split(/\s+/).filter(Boolean);
    const r = mots.length ? index.filter(x => mots.every(m => x.mots.includes(m))).slice(0, 20) : [];
    $("#rres").innerHTML = r.length ? r.map(x => rangee({ gauche: x.g, titre: x.titre, sous: x.sous, a: "res", id: x.id }).replace('data-a="res"', `data-a="res" data-t="${x.t}"`)).join("")
      : `<p class="petit sobre">${mots.length ? "Aucun résultat." : "Tape un nom de cheval, un type de soin ou un contact."}</p>`;
  };
  $("#rq").oninput = maj; maj();
  d.showModal(); $("#rq").focus();
}
$("#rech").onclick = chercher;
$("#drech").addEventListener("click", e => { if (e.target === $("#drech")) $("#drech").close(); });

/* ---------- Présentation au premier lancement ---------- */
function intro() {
  const etapes = [
    ["blé", "Retire une balle en un geste", "Sur l'accueil, touche − 1, − ½, − ⅓ ou − ¼ : le stock est mis à jour pour toute la famille. Tu peux annuler juste après."],
    ["check", "Glisse pour valider un soin", "Dans Soins, glisse une ligne vers la droite quand c'est fait. La prochaine échéance se calcule toute seule."],
    ["users", "Toute la famille voit tout", "Chacun voit en direct ce que les autres notent. Sans réseau, l'application reste utilisable et envoie les changements au retour du réseau."]
  ];
  let n = 0; const d = $("#intro");
  const dessiner = () => {
    const [i, t, p] = etapes[n];
    d.innerHTML = `<div class="intro-c">${bulle(i, "grande")}<h2>${t}</h2><p>${p}</p>
      <div class="points">${etapes.map((_, k) => `<i class="${k === n ? "actif" : ""}"></i>`).join("")}</div>
      <button class="btn plein" id="isuiv">${n < etapes.length - 1 ? "Suivant" : "C'est parti"}</button>
      ${n < etapes.length - 1 ? `<button class="btn sec plein" id="ipasser" style="margin-top:8px">Passer</button>` : ""}</div>`;
    $("#isuiv").onclick = () => { if (n < etapes.length - 1) { n++; dessiner(); } else fin(); };
    if ($("#ipasser")) $("#ipasser").onclick = fin;
  };
  const fin = () => { ecrireLocal("ecurie-intro", "1"); d.close(); };
  dessiner(); d.showModal();
}

/* ---------- Glisser pour valider un soin ---------- */
let geste = null, bloque = 0;
document.addEventListener("pointerdown", e => {
  const r = e.target.closest(".glisse .rangee");
  if (!r || e.target.closest("button,a")) return;
  geste = { r, x: e.clientX, y: e.clientY, dx: 0, actif: false };
});
document.addEventListener("pointermove", e => {
  if (!geste) return;
  const dx = e.clientX - geste.x, dy = e.clientY - geste.y;
  if (!geste.actif && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) { geste.actif = true; geste.r.setPointerCapture?.(e.pointerId); }
  if (geste.actif) { geste.dx = Math.max(0, dx); geste.r.style.transition = "none"; geste.r.style.transform = `translateX(${geste.dx}px)`; }
});
const finGeste = () => {
  if (!geste) return;
  const { r, dx, actif } = geste; geste = null;
  r.style.transition = "";
  if (!actif) return;
  bloque = Date.now();
  if (dx > 110) { r.style.transform = "translateX(110%)"; actions.soinFait(r.dataset.id); } else r.style.transform = "";
};
document.addEventListener("pointerup", finGeste); document.addEventListener("pointercancel", finGeste);

/* ---------- Installation ---------- */
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); S.install = e; if (S.foyer) rendre(); });
