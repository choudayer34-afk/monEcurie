import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, update, onValue }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { jour, enChaine, liste, sortieApres, comptages, periodes, prevision, consoMensuelle, consoPrevue, depensesMensuelles, courbeStock, pointFoin } from "./prevision.js";
import { suivi } from "./stocks.js";
import { TYPES, libelleSoin, echeance, prochaine, rdvActif, joursAvant, ponctuel, soinPourEspece } from "./soins.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const S = { article: null, user: null, fid: null, foyer: null, vue: "accueil", annee: new Date().getFullYear(), filtre: "tous", install: null, cheval: null, stockPrec: null, ghost: null };

/* ---------- Icônes ---------- */
const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  fer: '<path d="M5 21V10a7 7 0 0 1 14 0v11h-4V10a3 3 0 0 0-6 0v11z"/>',
  blé: '<path d="M12 21V9"/><path d="M12 9c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5zM12 9c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5zM12 15c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5zM12 15c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5z"/>',
  croix: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  cloche: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
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
  soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
  lune: '<path d="M20 14.500A8 8 0 1 1 9.500 4a6.500 6.500 0 0 0 10.500 10.500z"/>',
  patte: '<circle cx="6.500" cy="10" r="2"/><circle cx="10" cy="5.500" r="2"/><circle cx="14.500" cy="5.500" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-5.500 3-5.500 5.500 0 2 1.500 2.500 3 2 1-.400 1.500-.600 2.500-.600s1.500.200 2.500.600c1.500.500 3 0 3-2C17.500 15 15 12 12 12z"/>',
  sac: '<path d="M7 4h10l1.500 4v11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V8z"/><path d="M7 4L5.500 8h13M9.500 13.500h5"/>',
  photo: '<path d="M4 8h3l1.500-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.500"/>',
  retour: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  copie: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sortie: '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M16 8l4 4-4 4M20 12H9"/>'
};
const ic = (n, c = "") => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const ICONE_SOIN = { vaccin: "vaccin", vermifuge: "pilule", dentiste: "dent", ferrure: "fer", antiparasitaire: "pilule", autre: "croix" };
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
const ESPECES = { cheval: ["Cheval", "fer"], chat: ["Chat", "patte"], chien: ["Chien", "patte"], autre: ["Autre", "patte"] };
const espece = c => (ESPECES[c?.espece] ? c.espece : "cheval");
const multi = () => liste(S.foyer?.chevaux).some(c => espece(c) !== "cheval");
const MOTS = () => (multi() ? { pl: "Animaux", actifs: "animaux actifs", actif: "animal actif", tous: "Tous les animaux" } : { pl: "Chevaux", actifs: "chevaux actifs", actif: "cheval actif", tous: "Tous les chevaux" });
const libAnimal = (esp, nom) => (esp === "autre" ? `l'animal ${nom}` : `le ${ESPECES[esp][0].toLowerCase()} ${nom}`);
const nomCheval = id => S.foyer?.chevaux?.[id]?.nom || "Cheval supprimé";
const lire = k => { try { return localStorage.getItem(k); } catch { return null; } };
S.vuPrec = (() => { try { return +localStorage.getItem("ecurie-vu") || null; } catch { return null; } })();
const ecrireLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };
if (!S.vuPrec) ecrireLocal("ecurie-vu", String(Date.now()));
S.rapide = lire("ecurie-rapide") === "1";
const sync = { attente: 0, derniere: null, enLigne: true };
function textSync() {
  const h = d => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), n = sync.attente;
  if (!sync.enLigne) return n ? `Hors réseau : ${n} modification${n > 1 ? "s" : ""} à envoyer au retour du réseau` : "Hors réseau : tes modifications seront envoyées au retour du réseau";
  return n ? "Envoi en cours…" : `À jour${sync.derniere ? ` (dernière synchronisation à ${h(sync.derniere)})` : ""}`;
}
function majSync() {
  const e = $("#sync"); if (!e) return;
  e.className = "sync " + (!sync.enLigne ? "hors" : sync.attente ? "envoi" : "ok");
  e.title = e.ariaLabel = textSync();
  if (!$("#hors").hidden) $("#hors").textContent = textSync();
}
function suivreEnvoi(p) {
  sync.attente++; majSync();
  Promise.resolve(p).catch(() => { /* échec signalé ailleurs */ }).finally(() => { sync.attente = Math.max(0, sync.attente - 1); if (!sync.attente && sync.enLigne) sync.derniere = Date.now(); majSync(); });
  return vite(p);
}
const vite = p => Promise.race([Promise.resolve(p), new Promise(r => setTimeout(r, 1200))]); // ne bloque pas l'écran hors réseau
const vibre = () => navigator.vibrate?.(12);
const qui = () => S.foyer?.membres?.[S.user.uid]?.nom || (S.user.email.split("@")[0].replace(/^./, c => c.toUpperCase()));
/* Toute modification passe par modif() : elle garde l'état d'avant dans l'activité, ce qui permet de l'annuler (et d'annuler l'annulation). */
const valeurDe = chemin => chemin.split("/").reduce((o, k) => (o == null ? o : o[k]), S.foyer) ?? null;
function modif(chg, texte, type = "modif") {
  const cle = push(base("journal")).key, annul = Object.keys(chg).map(c => { const v = valeurDe(c); return v === null ? { c } : { c, v }; });
  const m = { ...chg, [`journal/${cle}`]: { ts: Date.now(), uid: S.user.uid, qui: qui(), texte, type, annul } };
  liste(S.foyer.journal).filter(j => j.ts).sort((x, y) => y.ts - x.ts).slice(149).forEach(j => { m[`journal/${j.id}`] = null; });
  suivreEnvoi(update(ref(db, `foyers/${S.fid}`), m));
  return cle;
}
// Actions faites avant la mise à jour : on retrouve la donnée créée grâce à l'heure d'enregistrement
function reconstruire(e) {
  if (e.annul || e.annule || !e.ts) return null;
  const proche = t => Math.abs((+t || 0) - e.ts) < 5000;
  if (e.type === "sortie") { const x = liste(S.foyer.foin?.sorties).find(x => proche(x.ts)); return x ? { liste: [{ c: `foin/sorties/${x.id}` }] } : null; }
  if (e.type === "comptage") { const x = liste(S.foyer.foin?.inventaires).find(x => proche(x.ts)); return x ? { liste: [{ c: `foin/inventaires/${x.id}` }] } : null; }
  if (e.type === "soin") {
    for (const so of liste(S.foyer.soins)) {
      const ps = liste(so.passages), p = ps.find(p => proche(p.ts)); if (!p) continue;
      const def = ps.filter(q => q.id !== p.id && q.date).map(q => q.date).sort().pop() || "";
      return { soin: so.id, def, liste: [{ c: `soins/${so.id}/passages/${p.id}` }] };
    }
  }
  return null;
}
function annulerEntree(id, liste_ = null) {
  const e = S.foyer.journal?.[id], l = liste_ || (e?.annul ? Object.values(e.annul) : null); if (!e || e.annule || !l) return;
  const m = {}; l.forEach(a => { m[a.c] = a.v ?? null; });
  m[`journal/${id}/annule`] = true;
  modif(m, `a annulé : ${e.texte}`, "annulation");
  vibre();
}
const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ---------- Authentification et foyer ---------- */
let initFait = false, minuteurHors;
function demarrer() {
  $("#nav").hidden = false; $("#rech").hidden = false; $("#sync").hidden = false; majSync(); $("#foyerNom").textContent = S.foyer.nom || "";
  rendre();
  if (initFait) return; initFait = true;
  const q = new URLSearchParams(location.search);
  if (q.get("vue") && Object.hasOwn(vues, q.get("vue"))) { S.vue = q.get("vue"); rendre(); }
  if (q.get("action") && Object.hasOwn(actions, q.get("action"))) setTimeout(() => actions[q.get("action")](), 350);
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
  onValue(ref(db, `foyers/${fid}`), snap => { S.foyer = snap.val() || {}; sync.derniere = Date.now(); majSync(); ecrireLocal(`ecurie-foyer-${fid}`, JSON.stringify(S.foyer)); demarrer(); },
    () => { try { localStorage.removeItem(`ecurie-fid-${u.uid}`); } catch { /* rien */ } $("#vue").innerHTML = `<div class="carte alerte">Accès au foyer refusé.</div>`; });
  onValue(ref(db, ".info/connected"), s => {
    clearTimeout(minuteurHors);
    if (s.val() === false) minuteurHors = setTimeout(() => { sync.enLigne = false; $("#hors").hidden = false; majSync(); }, 3500);
    else { if (!sync.enLigne && !sync.attente) sync.derniere = Date.now(); sync.enLigne = true; $("#hors").hidden = true; majSync(); }
  });
});

const accroche = (titre, sous) => `<div class="accueil-log"><div class="logo">${ic("fer")}</div><h2>${titre}</h2><p>${sous}</p></div>`;

function ecranConnexion() {
  $("#nav").hidden = true; $("#sync").hidden = true; $("#titre").textContent = "Écurie"; $("#sous").textContent = ""; $("#foyerNom").textContent = "";
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
  $("#nav").hidden = true; $("#sync").hidden = true; $("#titre").textContent = "Ton foyer"; $("#sous").textContent = "";
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
const avatarC = (c, cls = "") => `<span class="av-w">${c.photo ? `<img class="avatar ${cls}" src="${esc(c.photo)}" alt="">` : `<span class="avatar ${cls} a${teinte(c.nom)}">${esc((c.nom || "?").trim().charAt(0).toUpperCase())}</span>`}<span class="av-esp ${cls}" title="${ESPECES[espece(c)][0]}" aria-hidden="true">${ic(ESPECES[espece(c)][1])}</span></span>`;
// Réduit une photo (recadrage centré, carré) pour la stocker dans la base sans service supplémentaire
const reduire = (fichier, taille = 320) => new Promise((ok, ko) => {
  const img = new Image(), u = URL.createObjectURL(fichier);
  img.onload = () => {
    const s = Math.min(img.width, img.height), cv = document.createElement("canvas"); cv.width = cv.height = taille;
    cv.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, taille, taille);
    URL.revokeObjectURL(u); ok(cv.toDataURL("image/jpeg", 0.78));
  };
  img.onerror = ko; img.src = u;
});
const bulle = (icone, classe = "") => `<span class="bulle ${classe}">${ic(icone)}</span>`;
const entete = (titre, droite = "") => `<div class="entete"><h2>${titre}</h2><div class="droite">${droite}</div></div>`;
const bouton = (icone, a, extra = "", label = "") => `<button class="ib" data-a="${a}" ${extra} aria-label="${label}" title="${label}">${ic(icone)}</button>`;
const rangee = ({ gauche, titre, sous = "", a, id = "", droite = "", classe = "" }) =>
  `<div class="rangee ${classe}" ${a ? `data-a="${a}" data-id="${id}"` : ""}>${gauche}<div class="corps"><div class="titre">${titre}</div>${sous ? `<div class="petit">${sous}</div>` : ""}</div>${droite || (a ? `<span class="chev">${ic("droite")}</span>` : "")}</div>`;
const vide = (icone, texte, cta = "") => `<div class="vide">${bulle(icone, "grande")}<p>${texte}</p>${cta}</div>`;

/* ---------- Vues ---------- */
document.querySelectorAll("nav button").forEach(b => b.onclick = () => { S.vue = b.dataset.v; window.scrollTo(0, 0); rendre(); });
const VERSION = "37", DATE_VERSION = "2026-10-09"; // à incrémenter à chaque mise à jour livrée
const ADMIN = "ch-houdayer@hotmail.fr";
const estAdmin = () => (S.user?.email || "").toLowerCase() === ADMIN;
const SERVICES = [
  ["Firebase — vue d'ensemble", "Projet monecurie-f3055", "https://console.firebase.google.com/project/monecurie-f3055/overview"],
  ["Firebase — Authentication", "Comptes et utilisateurs", "https://console.firebase.google.com/project/monecurie-f3055/authentication/users"],
  ["Firebase — Realtime Database", "Données et règles de sécurité", "https://console.firebase.google.com/project/monecurie-f3055/database"],
  ["Google Cloud — clés API", "Restrictions de la clé web, quotas", "https://console.cloud.google.com/apis/credentials?project=monecurie-f3055"],
  ["Cloudflare — Workers", "Application « ecurie » : site, clés et rappels par notification", "https://dash.cloudflare.com/?to=/:account/workers-and-pages"],
  ["GitHub — dépôt monEcurie", "Code source et historique", "https://github.com/choudayer34-afk/monEcurie"]
];
function admin() {
  const f = S.foyer, nb = o => liste(o).length, dern = liste(f.journal).reduce((m, j) => Math.max(m, j.ts || 0), 0);
  const lien = ([t, s, u]) => `<a class="rangee" href="${u}" target="_blank" rel="noopener"><div class="corps"><div class="titre">${t}</div><div class="petit">${s}</div></div><span class="chev">${ic("droite")}</span></a>`;
  return `<div class="chips"><button class="chip" data-a="vue" data-v="plus">${ic("gauche")} Plus</button></div>
    <div class="carte">${entete("Services")}${SERVICES.map(lien).join("")}</div>
    <div class="carte">${entete("Notifications : clés d'envoi")}
      <p class="petit">À faire une seule fois. La clé privée n'est conservée nulle part : copie-la tout de suite dans Cloudflare (secret VAPID_PRIVATE), et la clé publique dans la variable VAPID_PUBLIC. Générer de nouvelles clés oblige chacun à réactiver les notifications.</p>
      <button class="btn sec" data-a="genererCles">${ic("fer")} Générer une paire de clés</button><div id="cles"></div></div>
    <div class="carte">${entete("Diagnostic du foyer")}
      ${[["Version", `${VERSION} · ${fr(DATE_VERSION)}`], ["Compte", esc(S.user.email)], ["Identifiant", esc(S.user.uid)], ["Foyer", esc(f.nom || "")], ["Membres", nb(f.membres)], ["Chevaux", nb(f.chevaux)], ["Contacts", nb(f.contacts)], ["Soins", nb(f.soins)],
        ["Comptages de foin", nb(f.foin?.inventaires)], ["Livraisons de foin", nb(f.foin?.livraisons)], ["Sorties de foin", nb(f.foin?.sorties)], ["Entrées d'activité", nb(f.journal)],
        ["Dernière activité", dern ? new Date(dern).toLocaleString("fr-FR") : "—"], ["Connexion", $("#hors").hidden ? "En ligne" : "Hors ligne"]]
        .map(([a, b]) => rangee({ gauche: "", titre: a, droite: `<span class="petit">${b}</span>` })).join("")}</div>
    <div class="carte petit">Aucune clé ni aucun secret n'est stocké dans l'application : les accès passent par ton compte sur chaque service.</div>`;
}
const vues = { plus, routine, accueil, chevaux, soins, foin, contacts, reglages, journal, fiche, admin, bilan: bilanSante };
const TITRES = { accueil: "Accueil", chevaux: "Chevaux",  soins: "Santé", foin: "Stocks", plus: "Plus", contacts: "Contacts", reglages: "Foyer", journal: "Activité", admin: "Administration", routine: "Routine", bilan: "Bilan santé" };

const ONGLET = v => (v === "fiche" || v === "routine" ? "chevaux" : v === "bilan" ? "soins" : ["contacts", "reglages", "journal", "admin"].includes(v) ? "plus" : v);
function rendre() {
  if (!S.foyer) return;
  if (S.vue === "admin" && !estAdmin()) S.vue = "plus";
  if (S.vue === "fiche" && !S.foyer.chevaux?.[S.cheval]) S.vue = "chevaux";
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("actif", b.dataset.v === ONGLET(S.vue)));
  const nbC = liste(S.foyer.chevaux).filter(c => c.actif !== false).length;
  const nbSoins = soinsPrevus().filter(x => S.foyer.chevaux[x.chevalId].actif !== false && x.j !== null && x.j <= 0).length;
  const bs = document.querySelector("nav button[data-v=soins]");
  bs.querySelector(".pastille")?.remove();
  if (nbSoins) bs.insertAdjacentHTML("beforeend", `<span class="pastille" aria-label="${nbSoins} soins à faire">${nbSoins > 9 ? "9+" : nbSoins}</span>`);
  bs.title = nbSoins ? `Santé (${nbSoins} à faire)` : "Santé";
  try { nbSoins ? navigator.setAppBadge?.(nbSoins) : navigator.clearAppBadge?.(); } catch { /* non pris en charge */ }
  $("#titre").textContent = S.vue === "fiche" ? nomCheval(S.cheval) : S.vue === "chevaux" ? MOTS().pl : TITRES[S.vue];
  { const bc = document.querySelector("nav button[data-v=chevaux]"); bc.title = bc.ariaLabel = MOTS().pl; bc.querySelector(".lib").textContent = MOTS().pl; }
  $("#sous").textContent = {
    accueil: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    chevaux: `${nbC} ${nbC > 1 ? MOTS().actifs : MOTS().actif}`,
    soins: "Vaccins, ferrure, dentiste…",
    plus: "Contacts, activité, réglages",
    foin: "Foin, copeaux et autres stocks",
    contacts: "Fournisseurs et soignants",
    reglages: "Partage et notifications",
    journal: "Ce que fait la famille",
    admin: "Services et diagnostic",
    routine: "Consignes du matin et du soir",
    bilan: "Où en est chaque animal",
    fiche: "Fiche du cheval"
  }[S.vue];
  if (S.vue === "fiche") { const e = espece(S.foyer.chevaux[S.cheval]); $("#sous").textContent = e === "autre" ? "Fiche de l'animal" : `Fiche du ${ESPECES[e][0].toLowerCase()}`; }
  const y = window.scrollY;
  $("#vue").innerHTML = vues[S.vue]();
  window.scrollTo(0, y);
}

/* --- Accueil --- */
const balleSvg = (f = 1, cl = "", st = "") => `<svg class="bl ${cl}" ${st} viewBox="0 0 28 18" aria-hidden="true"><rect class="bv" x="1" y="1" width="26" height="16" rx="3.500"/>${f >= 0.04 ? `<rect class="bp" x="1" y="1" width="${(26 * Math.min(f, 1)).toFixed(1)}" height="16" rx="3.500"/>` : ""}${[9, 19].filter(x => x < 26 * f).map(x => `<path class="bs" d="M${x} 1v16"/>`).join("")}</svg>`;
const TAS = 10;
const tasSvg = () => { let r = ""; [[4, 22], [3, 15.500], [2, 9], [1, 2.500]].forEach(([n, y]) => { const x0 = (43 - (n * 10 + (n - 1))) / 2 + 0.500; for (let i = 0; i < n; i++) r += `<rect class="bp" x="${(x0 + i * 11).toFixed(1)}" y="${y}" width="10" height="6" rx="1.800"/>`; }); return `<svg class="tas" viewBox="0 0 44 30" aria-hidden="true">${r}</svg>`; };
function pile(stock, g) {
  const s = Math.max(0, stock), groupe = s > 20, tas = groupe ? Math.floor(s / TAS + 1e-9) : 0, reste = s - tas * TAS, entiers = Math.floor(reste + 1e-9), frac = reste - entiers;
  let h = ""; for (let i = 0; i < tas; i++) h += tasSvg();
  for (let i = 0; i < entiers; i++) h += balleSvg(1);
  if (frac > 0.04) h += balleSvg(frac);
  if (g) for (let i = 0; i < g.n; i++) h += balleSvg(1, "fantome", `style="animation-delay:-${g.ecoule}ms"`);
  return `<div class="pile" role="img" aria-label="${fmtQte(stock)} balles en stock">${h}</div>${groupe ? `<p class="legende-h">1 tas = ${TAS} balles</p>` : ""}`;
}
function majStock(p) {
  const auj = aujourdhui(), f = S.foyer.foin || {}, d = p.last.date;
  const so = liste(f.sorties).filter(x => sortieApres(x, p.last) && x.date <= auj_ch(auj)).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.ts || 0) - (a.ts || 0));
  const nl = liste(f.livraisons).filter(l => l.date > d && l.date <= auj_ch(auj)).length;
  const dern = so[0] ? ` · dernière sortie le <b>${fr(so[0].date)}</b>` : " · aucune sortie depuis";
  const liv = nl ? ` · ${nl} livraison${nl > 1 ? "s" : ""} ajoutée${nl > 1 ? "s" : ""}` : "";
  return `<p class="hero-m">Calculé depuis le comptage du <b>${fr(d)}</b> (${fmtQte(+p.last.balles || 0)})${dern}${so.length > 1 ? ` (${so.length} sorties)` : ""}${liv}</p>`;
}
const auj_ch = enChaine;
function hero(p, seuil, g, court = false) {
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
    : `<div class="hero-n">${fmtQte(p.stockAuj)}<small> balles</small></div>`}
  ${court ? `<div class="pile-r">${pile(p.stockAuj, g)}</div><button class="btn or plein" data-a="inventaire">${ic("check")} Faire le point</button>` : pile(p.stockAuj, g) + majStock(p)}
  </section>`;
}

function carteCommande(p) {
  if (!p?.historique) return "";
  const f = S.foyer.foin || {}, seuil = +f.seuilJours || 14, N = +f.couvertureJours || 90, auj = aujourdhui();
  const besoin = consoPrevue(S.foyer, auj, N); if (besoin == null) return "";
  const manque = besoin - p.stockAuj, qte = Math.ceil(Math.max(0, manque) / 5) * 5;
  const avant = p.rupture ? enChaine(Math.max(auj, jour(p.rupture) - seuil)) : null;
  const livs = liste(f.livraisons).sort((x, y) => (y.date || "").localeCompare(x.date || ""));
  const dernier = livs.find(l => l.contactId && S.foyer.contacts?.[l.contactId]), four = (dernier && S.foyer.contacts[dernier.contactId]) || liste(S.foyer.contacts).find(c => c.role === "Fournisseur de foin");
  const pl = livs.find(l => +l.prixBalle || (+l.prixTotal && +l.balles)), prixBalle = pl ? (+pl.prixBalle || +pl.prixTotal / +pl.balles) : 0;
  if (manque <= 0) return `<div class="carte commande ok">${bulle("check", "vert")}<div><b>Stock suffisant pour ${N} jours</b><div class="petit">Consommation prévue : environ ${Math.round(besoin)} balles.</div></div></div>`;
  return `<div class="carte commande">${entete("Commande conseillée", bouton("reglage", "params", "", "Réglages du stock"))}
    <div class="grand-q">≈ ${qte} <small>balles</small></div>
    <p class="petit">pour tenir ${N} jours${avant ? `, à commander avant le <b>${fr(avant)}</b>` : ""}${prixBalle ? ` · environ ${euro(prixBalle * qte)} (${euro(prixBalle)}/balle)` : ""}</p>
    <div class="duo">${four?.tel ? `<a class="btn sec" href="tel:${esc(four.tel)}">${ic("tel")} ${esc(four.nom)}</a>` : `<span></span>`}<button class="btn" data-a="livraison">${ic("plus")} Livraison</button></div></div>`;
}

function statistiques(nbC, plan) {
  const retard = plan.filter(s => s.j !== null && s.j < 0).length, bientot = plan.filter(s => s.j !== null && s.j >= 0 && s.j <= 30).length;
  const mois = consoMensuelle(S.foyer)[new Date().toISOString().slice(0, 7)];
  const tuile = (v, l, c = "") => `<div class="stat ${c}"><b>${v}</b><span>${l}</span></div>`;
  return `<div class="stats">${tuile(nbC, MOTS().actifs)}${tuile(retard + bientot, "soins à prévoir", retard ? "alerte-t" : "")}${tuile(mois == null ? "–" : Math.round(mois), "balles ce mois")}</div>`;
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
  const now = Date.now();
  if (p && S.stockPrec != null && S.stockPrec - p.stockAuj > 0.05 && S.stockPrec - p.stockAuj < 6) S.ghost = { n: Math.min(3, Math.ceil(S.stockPrec - p.stockAuj - 1e-6)), t: now };
  if (p) S.stockPrec = p.stockAuj;
  const ghost = S.ghost && now - S.ghost.t < 1100 ? { n: S.ghost.n, ecoule: now - S.ghost.t } : null;
  return hero(p, seuil, ghost, true) + carteSurveiller() +
    (plan.length ? `<div class="carte">${entete("Prochains soins", bouton("droite", "vue", 'data-v="soins"', "Tous les soins"))}
      ${urgents.length ? urgents.slice(0, 3).map(ligneSoin).join("") : `<p class="petit sobre">Rien à prévoir dans les 30 jours.</p>`}
      ${urgents.length > 3 ? `<button class="btn sec plein" data-a="vue" data-v="soins">Voir les ${urgents.length} soins</button>` : ""}</div>` : "") + carteDepuisVisite() + carteRoutine();
}

/* --- À surveiller (supervision) --- */
const nbNonSuivis = () => liste(S.foyer.chevaux).filter(c => c.actif !== false).reduce((n, c) => n + TYPES_CARNET().filter(t => soinPourEspece(t, c.espece) && !liste(S.foyer.soins).some(s => s.chevalId === c.id && s.type === t)).length, 0);
function surveiller() {
  const auj = aujourdhui(), f = S.foyer.foin || {}, seuil = +f.seuilJours || 14, seuilC = +f.comptageJours || 21, l = [], pl = (k, m, p = m + "s") => (k > 1 ? p : m);
  const pt = pointFoin(S.foyer, auj);
  if (!pt) { if (liste(S.foyer.chevaux).length) l.push({ n: 2, i: "blé", t: "Foin : aucun comptage", s: "Compte tes balles pour démarrer le suivi", a: "inventaire" }); }
  else {
    const p = pt.p;
    if (p.historique && p.jours !== null && p.jours <= seuil) l.push({ n: p.jours <= seuil / 2 ? 0 : 1, i: "blé", t: `Foin : ${p.jours} ${pl(p.jours, "jour")} de stock`, s: `Rupture prévue le ${fr(p.rupture)}${pt.aCommander12 ? ` · à commander ≈ ${Math.round(pt.aCommander12)} balles` : ""}`, a: "aller", id: "foin" });
    if (pt.jDepuis >= seuilC) l.push({ n: 1, i: "check", t: `Comptage de foin ancien : il y a ${pt.jDepuis} jours`, s: "Un nouveau comptage affine la prévision", a: "inventaire" });
    const liv = pt.aVenir[0]; if (liv && jour(liv.date) - auj <= 14) l.push({ n: 2, i: "blé", t: `Livraison de foin : ${balles(+liv.balles || 0)}`, s: `Prévue ${quand(jour(liv.date) - auj)} (${frCourt(liv.date)})`, a: "livraison", id: liv.id });
  }
  const plan = soinsPrevus().filter(s => S.foyer.chevaux[s.chevalId].actif !== false && s.j !== null), noms = g => g.slice(0, 3).map(s => esc(`${libelleSoin(s)} · ${S.foyer.chevaux[s.chevalId].nom}`)).join(", ") + (g.length > 3 ? ` + ${g.length - 3}` : "");
  const retard = plan.filter(s => s.j < 0), sem = plan.filter(s => s.j >= 0 && s.j <= 7);
  if (retard.length) l.push({ n: 0, i: "croix", t: `${retard.length} ${pl(retard.length, "soin")} en retard`, s: noms(retard), a: "aller", id: "soins" });
  if (sem.length) l.push({ n: 1, i: "calendrier", t: `${sem.length} ${pl(sem.length, "soin")} cette semaine`, s: noms(sem), a: "aller", id: "soins" });
  const ns = nbNonSuivis(); if (ns) l.push({ n: 2, i: "croix", t: `${ns} ${pl(ns, "soin")} non ${pl(ns, "suivi")}`, s: "Renseigne le carnet pour déclencher les rappels", a: "aller", id: "bilan" });
  articlesListe().forEach(x => { const r = suivi(x, auj); if (etatArticle(x, r).u === "retard") l.push({ n: 0, i: "sac", t: `${x.nom} : à commander`, s: r.nb ? `Environ ${r.jours} jours` : "Stock vide", a: "voirArticle", id: x.id }); });
  const jr = journalListe(); if (jr.length) { const d0 = Math.floor((Date.now() - jr[0].ts) / 864e5); if (d0 >= 7) l.push({ n: 2, i: "retour", t: `Aucune activité notée depuis ${d0} jours`, s: "Les sorties et les soins ne sont peut-être plus notés", a: "aller", id: "journal" }); }
  return l.sort((x, y) => x.n - y.n).slice(0, 6);
}
function carteSurveiller() {
  if (!liste(S.foyer.chevaux).length) return "";
  const l = surveiller();
  if (!l.length) return `<div class="carte commande ok">${bulle("check", "vert")}<div><b>Tout est à jour</b><div class="petit">Rien d'urgent côté foin, soins et stocks.</div></div></div>`;
  return `<div class="carte">${entete("À surveiller")}${l.map(x => rangee({ gauche: bulle(x.i, x.n === 0 ? "retard" : x.n === 1 ? "bientot" : "neutre"), titre: x.t, sous: x.s, a: x.a, id: x.id || "" })).join("")}</div>`;
}
function carteDepuisVisite() {
  if (!S.vuPrec) return "";
  const l = journalListe().filter(j => j.uid && j.uid !== S.user.uid && j.ts > S.vuPrec && !j.annule);
  if (!l.length) return "";
  const par = {}; l.forEach(j => { par[j.qui] = (par[j.qui] || 0) + 1; });
  return `<div class="carte">${entete("Depuis ta dernière visite", bouton("droite", "aller", 'data-id="journal"', "Toute l'activité"))}
    <p class="petit">${Object.entries(par).map(([q, n]) => `${esc(q)} : ${n} action${n > 1 ? "s" : ""}`).join(" · ")}</p>${l.slice(0, 4).map(j => ligneJournal(j)).join("")}</div>`;
}

/* --- Activité de la famille --- */
const ICONE_JOURNAL = { stock: "sac", routine: "soleil", modif: "crayon", annulation: "retour", sortie: "blé", soin: "croix", livraison: "blé", comptage: "check", cheval: "fer", copeaux: "sapin" };
const heure = ts => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const journalListe = () => liste(S.foyer.journal).filter(j => j.ts).sort((x, y) => y.ts - x.ts);
const ligneJournal = (j, avecBouton = false) => rangee({ gauche: avatar(j.qui), classe: j.annule ? "annule" : "",
  titre: `<b>${esc(j.qui)}</b> ${esc(j.texte)}`, sous: `${heure(j.ts)} · <span class="doux-i">${ic(ICONE_JOURNAL[j.type] || "check")}</span>${j.annule ? " · annulé" : ""}`,
  droite: avecBouton && !j.annule && (j.annul || reconstruire(j)) ? `<button class="btn sec petit-b" data-a="defaire" data-id="${j.id}">${j.type === "annulation" ? "Rétablir" : "Annuler"}</button>` : "" });
function jourLibelle(ts) {
  const d = new Date(ts), n = new Date(), hier = new Date(Date.now() - 864e5), meme = (x, y) => x.toDateString() === y.toDateString();
  return meme(d, n) ? "Aujourd'hui" : meme(d, hier) ? "Hier" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function activiteRecente() {
  const l = journalListe().slice(0, 4); if (!l.length) return "";
  return `<div class="carte">${entete("Activité récente", bouton("droite", "vue", 'data-v="journal"', "Toute l'activité"))}${l.map(j => ligneJournal(j)).join("")}</div>`;
}
function journal() {
  const l = journalListe().slice(0, 150);
  let html = `<div class="chips"><button class="chip" data-a="vue" data-v="plus">${ic("gauche")} Plus</button></div>`;
  if (!l.length) return html + vide("check", "Rien pour l'instant. Les retraits de balles, soins et livraisons notés par la famille apparaîtront ici.");
  html += `<p class="petit astuce">Chaque action peut être annulée ici. Une annulation peut elle-même être rétablie.</p>`;
  let dernier = "", ouvert = false;
  for (const j of l) {
    const lib = jourLibelle(j.ts);
    if (lib !== dernier) { if (ouvert) html += `</div>`; html += `<h3 class="groupe">${lib}</h3><div class="carte liste">`; dernier = lib; ouvert = true; }
    html += ligneJournal(j, true);
  }
  return html + `</div>`;
}

/* --- Onglets internes --- */
const segment = (actif, l) => `<div class="segment" role="tablist">${l.map(([v, t]) => `<button role="tab" aria-selected="${v === actif}" class="${v === actif ? "actif" : ""}" data-a="vue" data-v="${v}">${t}</button>`).join("")}</div>`;
const segSante = a => segment(a, [["soins", "À faire"], ["bilan", "Par animal"]]);
const segAnimaux = a => segment(a, [["chevaux", "Fiches"], ["routine", "Routine"]]);

/* --- Soins --- */
function soinsPrevus() {
  const auj = aujourdhui();
  return liste(S.foyer.soins).filter(s => S.foyer.chevaux?.[s.chevalId] && !(ponctuel(s) && s.dernier))
    .map(s => { const ech = prochaine(s); return { ...s, ech, rdvOk: rdvActif(s), theo: echeance(s), j: joursAvant(ech, auj) }; })
    .sort((x, y) => (x.ech === null) - (y.ech === null) || (x.ech || "").localeCompare(y.ech || ""));
}
const urgence = j => (j === null ? "neutre" : j < 0 ? "retard" : j <= 30 ? "bientot" : "ok");
function ligneSoin(s, avecCheval = true) {
  return `<div class="glisse"><div class="fond">${ic("check")} Fait</div>` + rangee({
    gauche: bulle(ICONE_SOIN[s.type] || "croix", urgence(s.j)), classe: `u-${urgence(s.j)}`, a: "soin", id: s.id,
    titre: `${esc(libelleSoin(s))}${avecCheval ? " · " + esc(S.foyer.chevaux[s.chevalId].nom) : ""}`,
    sous: s.j === null ? "À planifier" : `<span class="q ${urgence(s.j)}">${quand(s.j)}</span> · ${s.rdvOk ? "RDV " : ""}${frCourt(s.ech)}${s.rdvOk && s.theo && s.theo !== s.ech ? ` · échéance ${frCourt(s.theo)}` : ""}${ponctuel(s) ? " · ponctuel" : s.dernier ? ` · fait le ${frCourt(s.dernier)}` : ""}`,
    droite: `<button class="fait" data-a="soinFait" data-id="${s.id}" aria-label="Marquer comme fait" title="Fait aujourd'hui">${ic("check")}</button>`
  }) + `</div>`;
}
function soins() {
  const tous = soinsPrevus(), l = S.filtre === "tous" ? tous : tous.filter(s => s.type === S.filtre);
  const chips = [["tous", "Tous", ""], ...Object.entries(TYPES).map(([k, t]) => [k, t.nom, ICONE_SOIN[k]])]
    .map(([k, t, i]) => `<button class="chip ${S.filtre === k ? "actif" : ""}" data-a="filtre" data-f="${k}">${i ? ic(i) : ""}${t}</button>`).join("");
  const groupes = [["En retard", s => s.j !== null && s.j < 0], ["Dans les 30 jours", s => s.j !== null && s.j >= 0 && s.j <= 30], ["Plus tard", s => s.j !== null && s.j > 30], ["À planifier", s => s.j === null]];
  const blocs = groupes.map(([t, f]) => { const g = l.filter(f); return g.length ? `<h3 class="groupe">${t} <span>${g.length}</span></h3><div class="carte liste">${g.map(ligneSoin).join("")}</div>` : ""; }).join("");
  return segSante("soins") + `<div class="chips passe">${chips}</div>` + (tous.length ? `<div class="duo actions-soins"><button class="btn sec" data-a="rdvGroupe" data-t="${S.filtre === "tous" ? "" : S.filtre}">${ic("calendrier")} RDV groupé</button><button class="btn sec" data-a="faitGroupe" data-t="${S.filtre === "tous" ? "" : S.filtre}">${ic("check")} Fait groupé</button>${tous.some(x => x.ech) ? `<button class="btn sec" data-a="agenda">${ic("calendrier")} Agenda</button>` : ""}</div>` : "") + (tous.length ? `<p class="petit astuce">Astuce : glisse une ligne vers la droite pour la valider.</p>` : "") + (blocs || vide("croix", "Aucun soin suivi pour l'instant.", `<button class="btn" data-a="soin">${ic("plus")} Ajouter un soin</button>`)) +
    `<button class="fab" data-a="soin" aria-label="Ajouter un soin" title="Ajouter un soin">${ic("plus")}</button>`;
}

/* --- Bilan santé --- */
const TYPES_CARNET = () => Object.keys(TYPES).filter(t => t !== "autre");
function bilanSante() {
  const betes = liste(S.foyer.chevaux).filter(c => c.actif !== false).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
  const plan = soinsPrevus(), n = { retard: 0, bientot: 0, ok: 0, non: 0 };
  const cartes = betes.map(c => {
    const mes = plan.filter(s => s.chevalId === c.id);
    const lignes = mes.map(s => {
      const u = urgence(s.j); if (s.j !== null) n[u === "retard" ? "retard" : u === "bientot" ? "bientot" : "ok"]++;
      return rangee({ gauche: bulle(ICONE_SOIN[s.type] || "croix", u), a: "soin", id: s.id, titre: esc(libelleSoin(s)),
        sous: ponctuel(s) ? `Ponctuel · ${s.ech ? frCourt(s.ech) : "à planifier"}` : `${s.dernier ? "Fait le " + frCourt(s.dernier) : "Jamais noté"} · ${s.rdvOk ? "RDV " : "prochain "}${s.ech ? frCourt(s.ech) : "à planifier"}`,
        droite: s.j === null ? `<span class="badge neutre">À planifier</span>` : `<span class="badge ${u}">${quand(s.j)}</span>` });
    });
    const manquants = TYPES_CARNET().filter(t => soinPourEspece(t, c.espece) && !liste(S.foyer.soins).some(s => s.chevalId === c.id && s.type === t));
    manquants.forEach(t => { n.non++; lignes.push(rangee({ gauche: bulle(ICONE_SOIN[t] || "croix", "neutre"), a: "carnet", id: c.id, titre: TYPES[t].nom, sous: "Non suivi : touche pour renseigner", droite: `<span class="badge neutre">?</span>` })); });
    return `<div class="carte">${entete(`<span class="nom-bilan">${avatarC(c)} ${esc(c.nom)}</span>`, `<button class="btn sec petit-b" data-a="carnet" data-id="${c.id}">${ic("plus")} Carnet</button>`)}${lignes.join("")}</div>`;
  });
  const tuile = (v, l, c = "") => `<div class="stat ${c}"><b>${v}</b><span>${l}</span></div>`;
  return segSante("bilan") + `
    ${betes.length ? `<div class="stats">${tuile(n.retard, "en retard", n.retard ? "alerte-t" : "")}${tuile(n.bientot, "sous 30 jours")}${tuile(n.non, "non suivis")}</div>` : ""}
    ${n.non ? `<p class="petit astuce">Les soins « non suivis » ne déclenchent aucun rappel : renseigne la date du dernier passage d'après le carnet pour les suivre.</p>` : ""}
    ${cartes.join("") || vide("fer", "Ajoute d'abord un animal.")}`;
}

/* --- Chevaux --- */
function chevaux() {
  const l = liste(S.foyer.chevaux).sort((a, b) => (b.actif !== false) - (a.actif !== false) || (a.nom || "").localeCompare(b.nom || ""));
  const plan = soinsPrevus();
  return segAnimaux("chevaux") + (l.length ? `<div class="carte liste">${l.map(c => {
    const prochain = plan.find(s => s.chevalId === c.id && s.j !== null);
    return rangee({
      gauche: avatarC(c), classe: c.actif === false ? "inactif" : "", a: "fiche", id: c.id, titre: esc(c.nom),
      sous: [ESPECES[espece(c)][0], esc(c.robe || ""), age(c.naissance), c.sire ? (espece(c) === "cheval" ? "SIRE " : "Puce ") + esc(c.sire) : "", c.actif === false ? "inactif" : ""].filter(Boolean).join(" · ") || "Fiche à compléter",
      droite: prochain ? `<span class="badge ${urgence(prochain.j)}">${ic(ICONE_SOIN[prochain.type])}${quand(prochain.j)}</span>` : `<span class="chev">${ic("droite")}</span>`
    });
  }).join("")}</div>` : vide("fer", "Ajoute ton premier animal.", `<button class="btn" data-a="cheval">${ic("plus")} Ajouter un animal</button>`)) +
    `<button class="fab" data-a="cheval" aria-label="Ajouter un animal" title="Ajouter un animal">${ic("plus")}</button>`;
}

function fiche() {
  const c = S.foyer.chevaux[S.cheval], plan = soinsPrevus().filter(s => s.chevalId === S.cheval);
  const hist = [];
  liste(S.foyer.soins).filter(s => s.chevalId === S.cheval).forEach(s => {
    const dates = new Set();
    liste(s.passages).forEach(p => { if (p.date) { dates.add(p.date); hist.push({ date: p.date, s }); } });
    if (s.dernier && !dates.has(s.dernier)) hist.push({ date: s.dernier, s });
  });
  hist.sort((x, y) => y.date.localeCompare(x.date));
  const infos = [ESPECES[espece(c)][0], c.robe && esc(c.robe), c.naissance && `${age(c.naissance)} (né le ${fr(c.naissance)})`, c.sire && (espece(c) === "cheval" ? "SIRE " : "Puce ") + esc(c.sire), c.actif === false && "inactif"].filter(Boolean);
  return `<div class="chips"><button class="chip" data-a="vue" data-v="chevaux">${ic("gauche")} ${MOTS().pl}</button></div>
    <div class="carte fiche-t">${avatarC(c, "grand")}
      <div class="corps"><h2>${esc(c.nom)}</h2><div class="petit">${infos.join(" · ") || "Fiche à compléter"}</div></div>
      ${bouton("crayon", "cheval", `data-id="${S.cheval}"`, "Modifier la fiche")}</div>
    <div class="carte">${entete("Soins à prévoir", `<button class="btn sec petit-b" data-a="soin" data-cheval="${S.cheval}">${ic("plus")} Soin</button>`)}
      ${plan.length ? plan.map(s => ligneSoin(s, false)).join("") : `<p class="petit sobre">Aucun soin suivi pour ${esc(c.nom)}.</p>`}</div>
    ${routineCheval(S.cheval)}${stocksAnimal(S.cheval)}
    <div class="carte">${entete("Historique des soins")}
      ${hist.length ? hist.slice(0, 40).map(h => rangee({ gauche: bulle(ICONE_SOIN[h.s.type] || "croix"), titre: esc(libelleSoin(h.s)), sous: fr(h.date) })).join("") : `<p class="petit sobre">Les passages notés avec le bouton ✓ apparaîtront ici.</p>`}</div>
    ${c.notes ? `<div class="carte">${entete("Notes")}<p>${esc(c.notes)}</p></div>` : ""}`;
}

/* --- Routine quotidienne (consignes du matin et du soir) --- */
const MOMENTS = { matin: ["Matin", "soleil"], soir: ["Soir", "lune"] };
S.moment = new Date().getHours() < 15 ? "matin" : "soir";
const routineListe = m => liste(S.foyer.routine).filter(r => r.moment === m).sort((a, b) => (a.ts || 0) - (b.ts || 0));
const concerne = (r, id) => (r.tous ? !r.sauf?.[id] : !!r.chevaux?.[id]);
function cibleTexte(r) {
  const noms = o => Object.keys(o || {}).filter(id => S.foyer.chevaux?.[id]).map(nomCheval);
  if (r.tous) { const x = noms(r.sauf); return x.length ? `Tous sauf ${esc(x.join(", "))}` : MOTS().tous; }
  return esc(noms(r.chevaux).join(", ")) || "Aucun cheval";
}
const ligneRoutine = (r, avecCible = true, edition = false) => rangee({ gauche: bulle(MOMENTS[r.moment]?.[1] || "check", "or"), a: edition ? "routineEdit" : "", id: r.id,
  titre: `${esc(r.libelle)}${r.qte ? ` <span class="date">${esc(r.qte)}</span>` : ""}`, sous: [avecCible ? cibleTexte(r) : "", esc(r.note || "")].filter(Boolean).join(" · ") });
function routine() {
  const bloc = m => { const l = routineListe(m);
    return `<div class="carte">${entete(`${MOMENTS[m][0]}`, `<button class="btn sec petit-b" data-a="routineEdit" data-m="${m}">${ic("plus")} Ligne</button>`)}
      ${l.length ? l.map(r => ligneRoutine(r, true, true)).join("") : `<p class="petit sobre">Rien de prévu le ${MOMENTS[m][0].toLowerCase()}.</p>`}</div>`; };
  return segAnimaux("routine") + bloc("matin") + bloc("soir") +
    `<p class="petit astuce">Ce sont des consignes : rien à valider. Elles s'affichent sur l'accueil et sur la fiche de chaque cheval concerné.</p>`;
}
function carteRoutine() {
  if (!liste(S.foyer.routine).length) return "";
  const l = routineListe(S.moment), chip = m => `<button class="chip ${S.moment === m ? "actif" : ""}" data-a="momentRoutine" data-m="${m}">${ic(MOMENTS[m][1])}${MOMENTS[m][0]}</button>`;
  return `<div class="carte">${entete("Routine du moment", bouton("droite", "vue", 'data-v="routine"', "Modifier la routine"))}<div class="chips pet">${chip("matin")}${chip("soir")}</div>
    ${l.length ? l.map(r => ligneRoutine(r)).join("") : `<p class="petit sobre">Rien de prévu.</p>`}</div>`;
}
function routineCheval(id) {
  const lignes = liste(S.foyer.routine).filter(r => concerne(r, id)); if (!lignes.length) return "";
  const bloc = m => { const l = lignes.filter(r => r.moment === m).sort((a, b) => (a.ts || 0) - (b.ts || 0)); return l.length ? `<h3 class="groupe">${MOMENTS[m][0]}</h3>${l.map(r => ligneRoutine(r, false)).join("")}` : ""; };
  return `<div class="carte">${entete("Routine", bouton("crayon", "vue", 'data-v="routine"', "Modifier la routine"))}${bloc("matin")}${bloc("soir")}</div>`;
}


/* --- Autres stocks : articles au sac (croquettes, litière…) --- */
const articlesListe = () => liste(S.foyer.stocks).filter(x => x.actif !== false).sort((x, y) => (x.ts || 0) - (y.ts || 0));
const uniteA = x => x.unite || "sac";
const nbU = (x, n) => `${fmtQte(n)} ${uniteA(x)}${n >= 2 && !/s$/.test(uniteA(x)) ? "s" : ""}`;
const sacSvg = (cl = "") => `<svg class="sac ${cl}" viewBox="0 0 22 26" aria-hidden="true"><path class="sp" d="M5 3h12l1.500 4.500v14a2.500 2.500 0 0 1-2.500 2.500H6a2.500 2.500 0 0 1-2.500-2.500v-14z"/><path class="ss" d="M5 3L3.500 7.500h15M8 14h6"/></svg>`;
function etatArticle(x, r) {
  const seuil = +x.seuilJours || 14;
  if (!r.nb) return { cl: "bas", txt: "À commander", u: "retard" };
  if (r.jours === null) return { cl: "", txt: "Suivi en cours", u: "neutre" };
  return r.jours <= seuil ? { cl: "bas", txt: "À commander", u: "retard" } : r.jours <= seuil * 2 ? { cl: "mid", txt: "À surveiller", u: "bientot" } : { cl: "", txt: "Stock confortable", u: "ok" };
}
const lignePrevisionA = (x, r) => `${nbU(x, r.nb)}${r.jours !== null ? ` · environ ${r.jours} j` : ""}`;
function carteStocks() {
  const l = articlesListe(); if (!l.length) return "";
  const auj = aujourdhui();
  return `<div class="carte">${entete("Autres stocks", bouton("droite", "vue", 'data-v="foin"', "Voir les stocks"))}${l.map(x => {
    const r = suivi(x, auj), e = etatArticle(x, r);
    return rangee({ gauche: bulle("sac", "or"), a: "voirArticle", id: x.id, titre: esc(x.nom), sous: lignePrevisionA(x, r),
      droite: `${r.jours !== null || !r.nb ? `<span class="badge ${e.u}">${r.nb ? r.jours + " j" : "vide"}</span>` : ""}<button class="fait" data-a="articleFini" data-id="${x.id}" aria-label="Sac fini" title="Sac fini">${ic("check")}</button>` });
  }).join("")}</div>`;
}
function stocksAnimal(id) {
  const l = articlesListe().filter(x => x.animaux?.[id]); if (!l.length) return "";
  const auj = aujourdhui();
  return `<div class="carte">${entete("Stocks")}${l.map(x => rangee({ gauche: bulle("sac", "or"), a: "voirArticle", id: x.id, titre: esc(x.nom), sous: lignePrevisionA(x, suivi(x, auj)) })).join("")}</div>`;
}
function selecteurStock() {
  const l = articlesListe();
  return `<div class="chips passe"><button class="chip ${!S.article ? "actif" : ""}" data-a="choisirStock" data-id="">${ic("blé")}Foin</button>${l.map(x =>
    `<button class="chip ${S.article === x.id ? "actif" : ""}" data-a="choisirStock" data-id="${x.id}">${ic("sac")}${esc(x.nom)}</button>`).join("")}<button class="chip" data-a="articleEdit" data-id="" title="Nouvel article">${ic("plus")}${l.length ? "" : "Autre stock"}</button></div>`;
}
function courbeArticle(x, r, auj) {
  const W = 340, H = 170, gauche = 30, droite = 10, haut = 12, bas = 24, hh = H - haut - bas;
  const premier = r.hist.length ? r.hist[0].j : auj - 30, jmin = Math.max(premier - 3, auj - 365);
  const jmax = r.rupture ? Math.min(auj + 365, r.rupture + 20) : auj + 45;
  const pts = r.hist.filter(h => h.j >= jmin);
  const maxV = Math.max(1, ...pts.map(h => h.n), r.nb), pas = maxV <= 6 ? 1 : maxV <= 12 ? 2 : maxV <= 30 ? 5 : 10, ymax = Math.ceil(maxV * 1.1 / pas) * pas;
  const X = j => gauche + (j - jmin) / (jmax - jmin) * (W - gauche - droite), Y = v => haut + hh - Math.min(v, ymax) / ymax * hh;
  let svg = "";
  for (let v = 0; v <= ymax; v += pas) svg += `<line x1="${gauche}" x2="${W - droite}" y1="${Y(v)}" y2="${Y(v)}" class="grille"/><text class="axe" x="${gauche - 5}" y="${Y(v) + 3.500}" text-anchor="end">${v}</text>`;
  const d0 = new Date(jmin * 864e5), nbMois = Math.round((jmax - jmin) / 30.400), cad = Math.max(1, Math.ceil(nbMois / 6)); let k = 0;
  for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth() + (d0.getUTCDate() > 1 ? 1 : 0); ; m++) {
    const j = Math.floor(Date.UTC(y, m, 1) / 864e5); if (j > jmax) break; if (j < jmin) continue;
    const mm = ((m % 12) + 12) % 12; svg += `<line x1="${X(j)}" x2="${X(j)}" y1="${haut + hh}" y2="${haut + hh + 4}" class="grille"/>`;
    if (k++ % cad === 0) svg += `<text class="axe" x="${X(j)}" y="${H - 6}" text-anchor="middle">${MOIS_C[mm]}${mm === 0 || k === 1 ? " " + String(new Date(j * 864e5).getUTCFullYear()).slice(2) : ""}</text>`;
  }
  svg += `<line x1="${X(auj)}" x2="${X(auj)}" y1="${haut}" y2="${haut + hh}" class="cv-auj"/><text class="axe" x="${X(auj) + 4}" y="${haut + 8}">auj.</text>`;
  // historique en escalier jusqu'à aujourd'hui
  let d = "", prev = null;
  pts.forEach(h => { d += prev === null ? `M${X(h.j).toFixed(1)} ${Y(h.n).toFixed(1)}` : `L${X(h.j).toFixed(1)} ${Y(prev).toFixed(1)}L${X(h.j).toFixed(1)} ${Y(h.n).toFixed(1)}`; prev = h.n; });
  if (prev !== null) d += `L${X(auj).toFixed(1)} ${Y(prev).toFixed(1)}`;
  if (d) svg += `<path d="${d}" class="cv-h"/>`;
  if (r.rupture) svg += `<path d="M${X(auj).toFixed(1)} ${Y(r.sacsEquiv).toFixed(1)}L${X(r.rupture).toFixed(1)} ${Y(0)}" class="cv-a"/><circle cx="${X(r.rupture).toFixed(1)}" cy="${Y(0)}" r="4" class="cv-fin cv-a-t"/><text class="val cv-a-t" x="${(X(r.rupture) > W - 52 ? X(r.rupture) + 4 : X(r.rupture)).toFixed(1)}" y="${Y(0) - 9}" text-anchor="${X(r.rupture) > W - 52 ? "end" : "middle"}">${fr(enChaine(r.rupture)).slice(0, 5)}</text>`;
  pts.filter(h => h.t === "achat").forEach(h => { svg += `<circle cx="${X(h.j).toFixed(1)}" cy="${Y(h.n).toFixed(1)}" r="4" class="cv-liv"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" class="courbe" role="img" aria-label="Évolution du stock en ${uniteA(x)}s">${svg}</svg>
    <div class="legende"><span><i class="l h"></i>Stock</span>${r.rupture ? `<span><i class="l a"></i>Projection</span>` : ""}<span><i class="pt liv"></i>Achat</span></div>`;
}
function articleVue(id) {
  const x = S.foyer.stocks[id], auj = aujourdhui(), r = suivi(x, auj), e = etatArticle(x, r), seuil = +x.seuilJours || 14;
  const pour = Object.keys(x.animaux || {}).filter(k => S.foyer.chevaux?.[k]).map(nomCheval);
  const max = 14, pile = r.nb ? `<div class="pile sacs" role="img" aria-label="${nbU(x, r.nb)} en stock">${[...Array(Math.min(r.nb, max))].map((_, i) => sacSvg(i === 0 && r.entame ? "entame" : "")).join("")}</div>${r.nb > max ? `<p class="legende-h">+ ${r.nb - max} autres</p>` : ""}` : "";
  const pct = r.jours === null ? 100 : Math.min(100, r.jours / (seuil * 4) * 100);
  const evts = liste(x.evts).sort((p, q) => (q.date || "").localeCompare(p.date || "") || (q.ts || 0) - (p.ts || 0)).slice(0, 15);
  const achats = liste(x.achats).sort((p, q) => (q.date || "").localeCompare(p.date || "") || (q.ts || 0) - (p.ts || 0));
  const comptes = liste(x.comptages).sort((p, q) => (q.date || "").localeCompare(p.date || "") || (q.ts || 0) - (p.ts || 0)).slice(0, 5);
  const nomC = k => esc(S.foyer.contacts?.[k]?.nom || "");
  const moy = r.nbSacs ? Math.round(r.sacs.slice(-5).reduce((s, b) => s + (b.au - b.du), 0) / Math.min(5, r.nbSacs)) : null;
  return `<section class="hero ${e.cl}">
      <div class="hero-t">${ic("sac")}<span>${esc(x.nom)}</span><span class="etat">${e.txt}</span></div>
      <div class="hero-n">${r.nb}<small> ${uniteA(x)}${r.nb >= 2 && !/s$/.test(uniteA(x)) ? "s" : ""}</small></div>
      <p class="hero-s">${r.jours !== null ? `Environ <b>${r.jours} jour${r.jours > 1 ? "s" : ""}</b> · fin vers le <b>${fr(enChaine(r.rupture))}</b>` : "La prévision apparaît après deux sacs finis."}${r.resteKg ? ` · ≈ ${Math.round(r.resteKg)} kg` : ""}</p>
      ${r.jours !== null ? `<div class="jauge"><i style="width:${pct}%"></i><b style="left:25%" title="Seuil d'alerte"></b></div>` : ""}
      ${pile}
      <p class="hero-m">${[moy ? `Un ${uniteA(x)} dure environ ${moy} jours${r.kgJour ? ` (${String(Math.round(r.kgJour * 100) / 100).replace(".", ",")} kg/jour)` : ""}` : "", r.dernierFini ? `dernier ${uniteA(x)} fini le ${fr(enChaine(r.dernierFini))}` : "", pour.length ? `pour ${esc(pour.join(", "))}` : ""].filter(Boolean).join(" · ")}</p>
    </section>
    <div class="duo"><button class="btn plein" data-a="articleFini" data-id="${id}">${ic("check")} ${uniteA(x)[0].toUpperCase() + uniteA(x).slice(1)} fini</button>
      <button class="btn sec" data-a="articleOuvert" data-id="${id}">Entamé</button></div>
    <p class="petit astuce">« Entamé » est facultatif : il précise le début d'un ${uniteA(x)} et affine l'estimation.</p>
    <div class="carte cv-carte">${entete("Évolution", `<div class="chips pet"><button class="chip" data-a="comptageArt" data-id="">${ic("check")} Comptage</button><button class="chip" data-a="articleEdit" data-id="${id}">${ic("crayon")} Article</button></div>`)}
      ${courbeArticle(x, r, auj)}</div>
    <div class="carte">${entete("Achats", bouton("plus", "achat", 'data-id=""', "Nouvel achat"))}${achats.length ? achats.map(b => rangee({ gauche: bulle("sac", "or"), a: "achat", id: b.id,
      titre: `${nbU(x, +b.n || 0)} <span class="date">${frCourt(b.date)}</span>`, sous: [b.poids ? `${b.poids} kg chacun` : "", [b.prixUnite ? `${euro(b.prixUnite)}/${uniteA(x)}` : "", b.prixTotal ? `total ${euro(b.prixTotal)}` : ""].filter(Boolean).join(" · "), nomC(b.contactId), esc(b.note || "")].filter(Boolean).join(" · ") })).join("") : `<p class="petit sobre">Aucun achat noté.</p>`}</div>
    <div class="carte">${entete("Historique")}${evts.length || comptes.length ? evts.map(v => rangee({ gauche: bulle(v.type === "ouvert" ? "sac" : "check", v.type === "ouvert" ? "or" : "vert"), a: "evtArt", id: v.id,
      titre: v.type === "ouvert" ? `${uniteA(x)[0].toUpperCase() + uniteA(x).slice(1)} entamé` : `${uniteA(x)[0].toUpperCase() + uniteA(x).slice(1)} fini`, sous: frCourt(v.date) })).join("") + comptes.map(c => rangee({ gauche: bulle("check", "vert"), a: "comptageArt", id: c.id,
      titre: `Comptage : ${nbU(x, +c.n || 0)}${c.entame ? " dont un entamé" : ""}`, sous: frCourt(c.date) })).join("") : `<p class="petit sobre">Note « ${uniteA(x)} fini » à chaque ${uniteA(x)} terminé.</p>`}</div>`;
}

/* --- Stock --- */
function svgBarres(sel, prev, max, nom = "") {
  const haut = 100, bas = 124, moisCourant = new Date().getFullYear() === S.annee ? new Date().getMonth() : -1;
  let svg = [0.5, 1].map(f => `<line x1="0" x2="340" y1="${bas - f * haut}" y2="${bas - f * haut}" class="grille"/>`).join("") + `<text class="axe" x="0" y="${bas - haut - 3}">${Math.round(max)}</text>`;
  "JFMAMJJASOND".split("").forEach((l, i) => {
    const x = i * 28 + 6;
    if (prev[i] != null) { const h = Math.max(2, prev[i] / max * haut); svg += `<rect class="b1" x="${x}" y="${bas - h}" width="10" height="${h}" rx="3"/>`; }
    if (sel[i] != null) { const h = Math.max(2, sel[i] / max * haut); svg += `<rect class="b2 ${nom}" x="${x + 12}" y="${bas - h}" width="10" height="${h}" rx="3"/><text class="val" x="${x + 17}" y="${bas - h - 4}">${Math.round(sel[i])}</text>`; }
    svg += `<text class="mois ${i === moisCourant ? "cour" : ""}" x="${x + 11}" y="142">${l}</text>`;
  });
  return svg;
}
const selecteurAnnee = an => `<div class="annee">${bouton("gauche", "annee", 'data-d="-1"', "Année précédente")}<b>${an}</b>${bouton("droite", "annee", 'data-d="1"', "Année suivante")}</div>`;
const serie = (m, an, f = x => x) => [...Array(12)].map((_, i) => { const v = m[`${an}-${String(i + 1).padStart(2, "0")}`]; return v == null ? null : f(v); });
const total = t => Math.round(t.reduce((s, x) => s + (x || 0), 0));
const evolution = (a, b) => a && b ? Math.round((a - b) / b * 100) : null;
const chiffre = (v, l, c = "") => `<div><b class="${c}">${v}</b><span>${l}</span></div>`;

const MOIS_C = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
S.hist = 365;
function courbe() {
  const auj = aujourdhui(), c = courbeStock(S.foyer, auj); if (!c) return "";
  const W = 340, H = 196, gauche = 30, droite = 10, haut = 14, bas = 24, hh = H - haut - bas;
  const ruptures = [c.A?.rupture, c.B?.rupture].filter(Boolean);
  const proche = !c.A && !c.B ? 60 : Math.min(365, Math.max(60, ...ruptures.map(r => r - c.jAuj + 25), ...c.livFutures.map(l => l.j - c.jAuj + 20), ...(ruptures.length < [c.A, c.B].filter(Boolean).length ? [365] : [0])));
  const jmin = S.hist ? Math.max(c.hist[0].j, c.jAuj - S.hist) : c.hist[0].j, jmax = c.jAuj + proche;
  const vis = c.hist.filter(h => h.j >= jmin);
  const maxVu = Math.max(1, ...vis.map(h => h.s), c.sAuj, ...[c.A, c.B].filter(Boolean).flatMap(x => x.pts.filter(q => q.j <= jmax).map(q => q.s)));
  const pas = maxVu <= 12 ? 2 : maxVu <= 30 ? 5 : maxVu <= 60 ? 10 : maxVu <= 120 ? 20 : maxVu <= 300 ? 50 : 100, ymax = Math.ceil(maxVu * 1.08 / pas) * pas;
  const X = j => gauche + (j - jmin) / (jmax - jmin) * (W - gauche - droite), Y = v => haut + hh - Math.min(v, ymax) / ymax * hh;
  const chemin = pts => pts.map((q, i) => `${i ? "L" : "M"}${X(q.j).toFixed(1)} ${Y(q.s).toFixed(1)}`).join("");
  let svg = "";
  for (let v = 0; v <= ymax; v += pas) svg += `<line x1="${gauche}" x2="${W - droite}" y1="${Y(v)}" y2="${Y(v)}" class="grille"/><text class="axe" x="${gauche - 5}" y="${Y(v) + 3.500}" text-anchor="end">${v}</text>`;
  // repères de mois
  const d0 = new Date(jmin * 864e5), nbMois = Math.round((jmax - jmin) / 30.400), cadence = Math.max(1, Math.ceil(nbMois / 6));
  let k = 0;
  for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth() + (d0.getUTCDate() > 1 ? 1 : 0); ; m++, k++) {
    const j = Math.floor(Date.UTC(y, m, 1) / 864e5); if (j > jmax) break;
    if (j < jmin) continue;
    const mm = ((m % 12) + 12) % 12, an = new Date(j * 864e5).getUTCFullYear();
    svg += `<line x1="${X(j)}" x2="${X(j)}" y1="${haut + hh}" y2="${haut + hh + 4}" class="grille"/>`;
    if (k % cadence === 0) svg += `<text class="axe" x="${X(j)}" y="${H - 6}" text-anchor="middle">${MOIS_C[mm]}${mm === 0 || k === 0 ? " " + String(an).slice(2) : ""}</text>`;
  }
  svg += `<path d="${chemin(vis)}L${X(c.jAuj).toFixed(1)} ${Y(0)}L${X(vis[0].j).toFixed(1)} ${Y(0)}Z" class="cv-aire"/>`;
  svg += `<line x1="${X(c.jAuj)}" x2="${X(c.jAuj)}" y1="${haut}" y2="${haut + hh}" class="cv-auj"/><text class="axe" x="${X(c.jAuj) + 4}" y="${haut + 8}">auj.</text>`;
  if (c.A) svg += `<path d="${chemin(c.A.pts)}" class="cv-a"/>`;
  if (c.B) svg += `<path d="${chemin(c.B.pts)}" class="cv-b"/>`;
  svg += `<path d="${chemin(vis)}" class="cv-h"/>`;
  c.livraisons.filter(l => l.j >= jmin).forEach(l => { const q = c.hist.find(h => h.j === l.j); if (q) svg += `<circle cx="${X(l.j).toFixed(1)}" cy="${Y(q.s).toFixed(1)}" r="4" class="cv-liv"/>`; });
  c.livFutures.forEach(l => { const q = (c.A || c.B)?.pts.filter(x => x.j === l.j).pop(); if (q) svg += `<circle cx="${X(l.j).toFixed(1)}" cy="${Y(q.s).toFixed(1)}" r="4" class="cv-liv"/>`; });
  c.comp.filter(q => q.j >= jmin).forEach(q => { svg += `<circle cx="${X(q.j).toFixed(1)}" cy="${Y(q.s).toFixed(1)}" r="2.800" class="cv-cpt"/>`; });
  [[c.A, "cv-a-t", -9], [c.B, "cv-b-t", -21]].forEach(([pr, cl, dy]) => { if (!pr?.rupture) return; const x = X(pr.rupture), fin = x > W - 52; svg += `<circle cx="${x.toFixed(1)}" cy="${Y(0)}" r="4" class="cv-fin ${cl}"/><text class="val ${cl}" x="${(fin ? x + 4 : x).toFixed(1)}" y="${Y(0) + dy}" text-anchor="${fin ? "end" : "middle"}">${fr(enChaine(pr.rupture)).slice(0, 5)}</text>`; });
  svg += `<line id="cvx" class="cv-croix" y1="${haut}" y2="${haut + hh}" x1="0" x2="0"/>`;
  S.cv = { c, jmin, jmax, gauche, droite, W };
  const dans = pr => pr?.rupture ? `rupture le <b>${fr(enChaine(pr.rupture))}</b> (dans ${pr.rupture - c.jAuj} j)` : `<b>pas de rupture</b> dans les 12 mois`;
  const lignes = [
    c.A ? `<div class="cv-l"><i class="k a"></i><span>Années précédentes : ${dans(c.A)}</span></div>` : "",
    c.B ? `<div class="cv-l"><i class="k b"></i><span>Consommation actuelle (${taux(c.rateB)} balle/j sur ${c.fenetre} j) : ${dans(c.B)}</span></div>` : "",
    !c.A ? `<p class="petit sobre">La courbe « années précédentes » apparaîtra quand tu auras au moins deux comptages d'écart (idéalement sur une année complète).</p>` : "",
    c.A || c.B ? `<p class="petit sobre">${c.livFutures.length ? "Projections avec les livraisons programmées." : "Projections sans nouvelle livraison."}</p>` : (c.A ? "" : `<p class="petit sobre">La projection sur la consommation actuelle apparaîtra après une semaine de sorties notées.</p>`)
  ].join("");
  const chip = (v, t) => `<button class="chip ${S.hist === v ? "actif" : ""}" data-a="histo" data-h="${v}">${t}</button>`;
  return `<div class="carte cv-carte">${entete("Évolution du stock", `<div class="chips pet">${chip(180, "6 mois")}${chip(365, "1 an")}${chip(0, "Tout")}</div>`)}
    <svg viewBox="0 0 ${W} ${H}" class="courbe" role="img" aria-label="Évolution du stock de foin en balles, avec projections">${svg}</svg>
    <div class="tip" id="cvtip" hidden></div>
    <div class="legende"><span><i class="l h"></i>Stock</span>${c.A ? `<span><i class="l a"></i>Années préc.</span>` : ""}${c.B ? `<span><i class="l b"></i>Conso actuelle</span>` : ""}${c.livraisons.length || c.livFutures.length ? `<span><i class="pt liv"></i>Livraison</span>` : ""}<span><i class="pt cpt"></i>Comptage</span></div>
    <div class="cv-res">${lignes}</div></div>`;
}
document.addEventListener("pointermove", e => {
  const sv = e.target.closest?.(".courbe"), tip = $("#cvtip"); if (!sv || !S.cv || !tip) return;
  const { c, jmin, jmax, gauche, droite, W } = S.cv, r = sv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
  const j = Math.round(jmin + (x - gauche) / (W - gauche - droite) * (jmax - jmin)); if (j < jmin || j > jmax) return;
  const cp = c.comp.find(q => q.j === j), h = c.hist.find(q => q.j === j), a = c.A?.pts.find(q => q.j === j), b = c.B?.pts.find(q => q.j === j);
  const ap = j > c.jAuj && c.A && !a ? 0 : a?.s, bp = j > c.jAuj && c.B && !b ? 0 : b?.s;
  const cr = $("#cvx"); cr.setAttribute("x1", gauche + (j - jmin) / (jmax - jmin) * (W - gauche - droite)); cr.setAttribute("x2", cr.getAttribute("x1")); cr.style.display = "block";
  const v = n => `${Math.round(n * 10) / 10}`.replace(".", ",");
  tip.innerHTML = `<b>${frCourt(enChaine(j))} ${enChaine(j).slice(0, 4)}</b>` + (h ? `<div>Stock : ${v(h.s)} balles</div>` : "") + (cp ? `<div>Comptage : ${v(cp.s)}${cp.avant != null && Math.abs(cp.avant - cp.s) >= 0.05 ? ` (calculé ${v(cp.avant)})` : ""}</div>` : "") + (ap != null && j >= c.jAuj ? `<div><i class="k a"></i>Années préc. : ${v(ap)}</div>` : "") + (bp != null && j >= c.jAuj ? `<div><i class="k b"></i>Conso actuelle : ${v(bp)}</div>` : "");
  tip.hidden = false; const pc = (e.clientX - r.left) / r.width; tip.style.left = `${Math.min(Math.max(pc * 100, 22), 78)}%`;
});
document.addEventListener("pointerleave", e => { if (e.target.closest?.(".courbe")) { $("#cvtip")?.setAttribute("hidden", ""); { const x = $("#cvx"); if (x) x.style.display = "none"; } } }, true);

function graphique() {
  const m = consoMensuelle(S.foyer), an = S.annee, sel = serie(m, an), prev = serie(m, an - 1);
  const max = Math.max(1, ...sel.filter(x => x != null), ...prev.filter(x => x != null)), tS = total(sel), tP = total(prev), d = evolution(tS, tP);
  return `<div class="carte">${entete("Consommation", selecteurAnnee(an))}
    <div class="chiffres">${chiffre(tS, `balles en ${an}`)}${chiffre(tP, `en ${an - 1}`, "doux")}${d !== null ? chiffre(`${d > 0 ? "+" : ""}${d} %`, `vs ${an - 1}`, d > 0 ? "hausse" : "baisse") : ""}</div>
    <svg viewBox="0 0 340 148" class="graph" role="img" aria-label="Balles consommées par mois">${svgBarres(sel, prev, max)}</svg>
    <div class="legende"><span><i class="b2"></i>${an}</span><span><i class="b1"></i>${an - 1}</span><span class="petit">balles entières par mois</span></div></div>`;
}

function budget() {
  const dep = depensesMensuelles(S.foyer), an = S.annee, tout = x => (x ? x.foin + x.copeaux : null);
  const cle = y => Object.keys(dep).filter(k => k.startsWith(y + "-"));
  if (!Object.keys(dep).length) return `<div class="carte">${entete("Budget")}<p class="petit sobre">Note le prix dans tes livraisons de foin et de copeaux pour suivre tes dépenses.</p></div>`;
  const sel = serie(dep, an, tout), prev = serie(dep, an - 1, tout), max = Math.max(1, ...sel.filter(x => x != null), ...prev.filter(x => x != null));
  const tS = total(sel), tP = total(prev), d = evolution(tS, tP);
  const foinAn = cle(an).reduce((s, k) => s + dep[k].foin, 0), copAn = cle(an).reduce((s, k) => s + dep[k].copeaux, 0);
  const ballesAn = liste(S.foyer.foin?.livraisons).filter(l => l.date?.startsWith(an + "-") && (+l.prixTotal || +l.prixBalle)).reduce((s, l) => s + (+l.balles || 0), 0);
  return `<div class="carte">${entete("Budget", selecteurAnnee(an))}
    <div class="chiffres">${chiffre(euro(tS).replace(",00", ""), `dépensés en ${an}`)}${chiffre(euro(tP).replace(",00", ""), `en ${an - 1}`, "doux")}${d !== null ? chiffre(`${d > 0 ? "+" : ""}${d} %`, `vs ${an - 1}`, d > 0 ? "hausse" : "baisse") : ""}</div>
    <svg viewBox="0 0 340 148" class="graph" role="img" aria-label="Dépenses par mois en euros">${svgBarres(sel, prev, max, "or")}</svg>
    <div class="legende"><span><i class="b2 or"></i>${an}</span><span><i class="b1"></i>${an - 1}</span><span class="petit">euros par mois</span></div>
    <p class="petit" style="margin-top:8px">${[foinAn ? `Foin ${euro(foinAn).replace(",00", "")}` : "", copAn ? `Copeaux ${euro(copAn).replace(",00", "")}` : "", ballesAn && foinAn ? `${euro(foinAn / ballesAn)} la balle en moyenne` : ""].filter(Boolean).join(" · ")}</p></div>`;
}

function cartePointFoin() {
  const auj = aujourdhui(), pt = pointFoin(S.foyer, auj); if (!pt) return "";
  const { p } = pt, r = pt.rythme, ligne = (a, b) => rangee({ gauche: "", titre: a, droite: `<span class="petit">${b}</span>` });
  const frais = pt.jDepuis > 21 ? `<span class="q retard">il y a ${pt.jDepuis} jours : recompte pour fiabiliser</span>` : `il y a ${pt.jDepuis} jour${pt.jDepuis > 1 ? "s" : ""}`;
  const mois = r == null ? null : Math.round(r * 30.4);
  return `<div class="carte point">${entete("Mon point foin", bouton("check", "inventaire", "", "Nouveau comptage"))}
    <p class="point-t">Il reste environ <b>${balles(Math.round(p.stockAuj))}</b>${p.rupture && p.jours <= 365 ? `, de quoi tenir jusqu'au <b>${fr(p.rupture)}</b> (${p.jours} jour${p.jours > 1 ? "s" : ""})` : p.rupture ? ", de quoi tenir plus d'un an" : p.historique ? " et aucune rupture n'est prévue" : ""}.</p>
    <div class="chiffres">${chiffre(r == null ? "–" : taux(r), "balles/jour")}${chiffre(mois == null ? "–" : mois, "balles/mois")}${chiffre(pt.depuis == null ? "–" : taux(pt.depuis), "sorties notées")}</div>
    <p class="petit">Dernier comptage le ${fr(pt.last.date)} (${frais}).</p>
    ${pt.besoin12 == null ? `<p class="petit sobre">Le besoin sur 12 mois apparaît après deux comptages.</p>` : `<h3 class="groupe">Sur 12 mois</h3>
      ${ligne("Besoin prévu", `≈ ${Math.round(pt.besoin12)} balles`)}${ligne("En stock aujourd'hui", `≈ ${Math.round(p.stockAuj)} balles`)}
      ${pt.stockAVenir ? ligne("Livraisons programmées", `${Math.round(pt.stockAVenir)} balles`) : ""}${ligne("<b>À commander pour tenir 12 mois</b>", `<b>≈ ${Math.round(pt.aCommander12)} balles</b>`)}
      ${pt.jours12 >= 300 ? ligne("Consommé sur les 12 derniers mois", `≈ ${Math.round(pt.conso12)} balles`) : ""}`}
    ${pt.aVenir.length ? `<h3 class="groupe">Livraisons programmées</h3>${pt.aVenir.map(l => rangee({ gauche: bulle("blé", "or"), a: "livraison", id: l.id, titre: `${balles(+l.balles || 0)} <span class="date">${frCourt(l.date)}</span>`, sous: "Touche pour modifier" })).join("")}` : ""}</div>`;
}
function bilanComptage(f2, date, calcule) {
  const auj = Math.max(aujourdhui(), jour(date)), pt = pointFoin(f2, auj); if (!pt) return;
  const { p } = pt, per = periodes(f2).find(x => x.au === date), ecart = calcule == null ? null : Math.round((p.last.date === date ? +p.last.balles || 0 : 0) - calcule);
  const l = [];
  if (ecart !== null) l.push(Math.abs(ecart) < 2 ? `Le calcul annonçait ≈ ${Math.round(calcule)} balles : c'est cohérent.` : `Le calcul annonçait ≈ ${Math.round(calcule)} balles, soit ${ecart > 0 ? "+" : "−"}${Math.abs(ecart)} d'écart : ${ecart > 0 ? "une livraison non notée ?" : "des sorties non notées ?"}`);
  if (per) l.push(per.conso < 0 ? "Consommation incohérente depuis le comptage précédent : une livraison oubliée ?" : `Depuis le comptage du ${fr(per.du)} : <b>${balles(Math.round(per.conso * 10) / 10)}</b> consommées en ${per.jours} jours (${taux(per.rate)} par jour).`);
  l.push(p.rupture && p.jours > 365 ? "À ce rythme, tu tiens plus d'un an." : p.rupture ? `À ce rythme, tu tiens jusqu'au <b>${fr(p.rupture)}</b> (${p.jours} jour${p.jours > 1 ? "s" : ""}).` : p.historique ? "Aucune rupture prévue." : "La prévision apparaîtra après deux comptages.");
  if (pt.besoin12 != null) l.push(`Sur 12 mois : besoin ≈ <b>${Math.round(pt.besoin12)} balles</b>, à commander ≈ <b>${Math.round(pt.aCommander12)} balles</b>${pt.stockAVenir ? ` (livraisons programmées déduites)` : ""}.`);
  ouvrir("Résultat du comptage", `<p>Comptage enregistré : <b>${balles(+p.last.balles || 0)}</b> le ${fr(date)}.</p>${l.map(x => `<p>${x}</p>`).join("")}`, () => {}, null, [], "Fermer");
}

function foin() {
  if (S.article && !S.foyer.stocks?.[S.article]) S.article = null;
  return selecteurStock() + (S.article ? articleVue(S.article) : foinVue());
}
function foinVue() {
  const f = S.foyer.foin || {}, cop = S.foyer.copeaux || {};
  const cs = comptages(S.foyer).reverse(), per = Object.fromEntries(periodes(S.foyer).map(p => [p.idFin, p]));
  const livs = liste(f.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const sorties = liste(f.sorties).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.ts || 0) - (a.ts || 0)).slice(0, 12);
  const livC = liste(cop.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const nomC = id => esc(S.foyer.contacts?.[id]?.nom || "");
  const lignesLiv = (l, a) => l.map(x => rangee({
    gauche: bulle(a === "livraison" ? "blé" : "sapin", "or"), a, id: x.id, titre: `${balles(+x.balles || 0)} <span class="date">${frCourt(x.date)}</span>`,
    sous: [jour(x.date) > aujourdhui() ? "<b>Programmée</b>" : "", x.poidsBalle ? `${x.poidsBalle} kg/balle (≈ ${Math.round(x.balles * x.poidsBalle)} kg)` : "", infoPrix(x), nomC(x.contactId), esc(x.note || "")].filter(Boolean).join(" · ")
  })).join("");
  const pf = prevision(S.foyer, aujourdhui());
  const rap = pf ? (S.rapide ? rapide(pf) : `<button class="btn sec plein" data-a="basculerRapide">${ic("retour")} Afficher la sortie rapide</button>`) : "";
  return cartePointFoin() + carteCommande(pf) + (S.rapide && pf ? rapide(pf) + `<button class="btn sec plein" data-a="basculerRapide">Masquer la sortie rapide</button>` : rap) + courbe() + graphique() + budget() +
    `<div class="carte">${entete("Comptages du foin", bouton("reglage", "params", "", "Seuil d'alerte") + bouton("plus", "inventaire", "", "Nouveau comptage"))}
      ${cs.length ? cs.map(c => { const p = per[c.id]; return rangee({
        gauche: bulle("check", "vert"), a: "inventaire", id: c.id, titre: `${balles(+c.balles || 0)} <span class="date">${frCourt(c.date)}</span>`,
        sous: p ? (p.conso < 0 ? `<span class="q retard">Incohérent : livraison oubliée ?</span>` : `${balles(Math.round(p.conso * 100) / 100)} consommées en ${p.jours} j (${taux(p.rate)}/jour)`) : "Premier comptage"
      }); }).join("") : `<p class="petit sobre">Aucun comptage. Tu peux saisir ceux des années passées pour affiner la prévision.</p>`}</div>
    <div class="carte">${entete("Sorties récentes")}${sorties.length ? sorties.map(x => rangee({
        gauche: bulle("retour", "or"), a: "sortieEdit", id: x.id, titre: `${balles(+x.balles || 0)} <span class="date">${frCourt(x.date)}</span>`, sous: "Touche pour corriger ou supprimer" })).join("") : `<p class="petit sobre">Aucune sortie notée.</p>`}</div>
    <div class="carte">${entete("Livraisons de foin", bouton("plus", "livraison", "", "Nouvelle livraison"))}${livs.length ? lignesLiv(livs, "livraison") : `<p class="petit sobre">Aucune livraison notée.</p>`}</div>
    <div class="carte">${entete("Copeaux de bois", bouton("check", "inventaireCopeaux", "", "Comptage") + bouton("plus", "livraisonCopeaux", "", "Nouvelle livraison"))}
      <p class="petit sobre">${cop.inventaire ? `Dernier comptage : <b>${balles(+cop.inventaire.balles || 0)}</b> le ${fr(cop.inventaire.date)}` : "Aucun comptage."}</p>${lignesLiv(livC, "livraisonCopeaux")}</div>`;
}

/* --- Contacts --- */
function contacts() {
  const l = liste(S.foyer.contacts).sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  const act = (i, href, label) => `<a class="ib rond" href="${href}" aria-label="${label}" title="${label}" target="${href.startsWith("http") ? "_blank" : "_self"}" rel="noopener">${ic(i)}</a>`;
  return `<div class="chips"><button class="chip" data-a="vue" data-v="plus">${ic("gauche")} Plus</button></div>` + (l.length ? `<div class="carte liste">${l.map(c => rangee({
    gauche: bulle(ICONE_ROLE[c.role] || "user", "vert"), a: "contact", id: c.id, titre: esc(c.nom),
    sous: [esc(c.role || ""), esc(c.adresse || "")].filter(Boolean).join(" · "),
    droite: `<span class="actions-r">${c.tel ? act("tel", "tel:" + esc(c.tel), "Appeler") : ""}${c.email ? act("mail", "mailto:" + esc(c.email), "Écrire") : ""}${c.adresse ? act("pin", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.adresse), "Itinéraire") : ""}</span>`
  })).join("")}</div>` : vide("user", "Ajoute ton fournisseur de foin, ton vétérinaire, ton maréchal…", `<button class="btn" data-a="contact">${ic("plus")} Ajouter un contact</button>`)) +
    `<button class="fab" data-a="contact" aria-label="Ajouter un contact" title="Ajouter un contact">${ic("plus")}</button>`;
}

/* --- Foyer --- */
function reglages() {
  const m = liste(S.foyer.membres), ios = /iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone;
  return `<div class="chips"><button class="chip" data-a="vue" data-v="plus">${ic("gauche")} Plus</button></div>
    <div class="carte centre"><div class="petit">Code d'invitation de « ${esc(S.foyer.nom)} »</div>
      <div class="code-grand">${esc(S.foyer.code)}</div>
      <button class="btn sec" data-a="copier">${ic("copie")} Copier le code</button></div>
    <div class="carte">${entete("Membres", bouton("crayon", "prenom", "", "Modifier mon prénom"))}${m.map(x => rangee({ gauche: avatar(x.nom || x.email), titre: esc(x.nom || x.email), sous: x.nom ? esc(x.email) : "" })).join("")}</div>
    ${carteNotifs()}
    ${S.install ? `<button class="btn plein" data-a="installer">${ic("plus")} Installer l'application</button>` : ""}
    ${ios ? `<div class="carte petit">Sur iPhone : touche le bouton Partager, puis « Sur l'écran d'accueil » pour installer l'application.</div>` : ""}
    <p class="petit centre version">Écurie · version ${VERSION} · ${fr(DATE_VERSION)}</p>`;
}
function plus() {
  const nc = liste(S.foyer.contacts).length, m = liste(S.foyer.membres).length;
  const ligne = (i, t, s, v) => rangee({ gauche: bulle(i, "neutre"), titre: t, sous: s, a: "vue", id: "", classe: "", droite: "" }).replace('data-a="vue"', `data-a="vue" data-v="${v}"`);
  return `<div class="carte liste">${ligne("user", "Contacts", nc ? `${nc} contact${nc > 1 ? "s" : ""} : fournisseur, vétérinaire, maréchal…` : "Fournisseur, vétérinaire, maréchal…", "contacts")}
    ${ligne("retour", "Activité et annulations", "Ce que fait la famille, annuler une action", "journal")}
    ${ligne("cloche", "Foyer et notifications", `${m} membre${m > 1 ? "s" : ""} · code d'invitation · rappels sur ce téléphone`, "reglages")}
    ${estAdmin() ? ligne("fer", "Administration", "Services et diagnostic", "admin") : ""}</div>
    <div class="carte liste"><button class="btn sec plein" data-a="intro">Revoir la présentation</button>
    <button class="btn sec plein" data-a="sortie">${ic("sortie")} Se déconnecter</button></div>
    <p class="petit centre version">Écurie · version ${VERSION} · ${fr(DATE_VERSION)}</p>`;
}

/* ---------- Notifications ---------- */
const b64u = { enc: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), dec: s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - (s.length % 4)) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); } };
const NOTIF_OK = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const cleAppareil = () => {
  let a = lire("ecurie-appareil");
  if (!a) { a = [...crypto.getRandomValues(new Uint8Array(6))].map(x => x.toString(16).padStart(2, "0")).join(""); ecrireLocal("ecurie-appareil", a); }
  return `${S.user.uid}_${a}`;
};
const nomAppareil = () => (/iphone/i.test(navigator.userAgent) ? "iPhone" : /ipad/i.test(navigator.userAgent) ? "iPad" : /android/i.test(navigator.userAgent) ? "Android" : "Ordinateur");
// Champs communs d'un appareil, sans écraser les réglages existants
const champsNotif = k => { const n = S.foyer.notifs?.[k] || {}; return { [`${k}/uid`]: S.user.uid, [`${k}/nom`]: nomAppareil(), [`${k}/actif`]: true, [`${k}/ts`]: Date.now(),
  [`${k}/heure`]: n.heure === undefined ? 7 : n.heure, [`${k}/soins`]: n.soins !== false, [`${k}/stocks`]: n.stocks !== false }; };
const refNotif = () => ref(db, `foyers/${S.fid}/notifs`);
const LIENS_NTFY = [["App Store (iPhone)", "https://apps.apple.com/us/app/ntfy/id1625396347"], ["Google Play (Android)", "https://play.google.com/store/apps/details?id=io.heckel.ntfy"], ["F-Droid (Android)", "https://f-droid.org/en/packages/io.heckel.ntfy/"]];
function carteNotifs() {
  const ios = /iphone|ipad/i.test(navigator.userAgent), k = cleAppareil(), n = S.foyer.notifs?.[k] || {};
  const permOk = NOTIF_OK() && Notification.permission === "granted", web = !!n.sub && permOk, nt = !!n.ntfy;
  const coche = (chemin, lib, on, inv) => `<label class="coche"><input type="checkbox" data-n="${chemin}" ${inv ? "data-inv" : ""} ${on ? "checked" : ""}><span>${esc(lib)}</span></label>`;
  const bloc = (cle, titre, contenu) => `<details class="notif-det" data-d="${cle}" ${S.det?.[cle] ? "open" : ""}><summary>${titre}</summary>${contenu}</details>`;
  const guide = bloc("guide", "Mode d'emploi", `<div class="petit">
      <p><b>Deux façons de recevoir les rappels</b>, au choix ou ensemble :</p>
      <p><b>A. Dans l'application</b></p>
      <ol><li>${ios ? "Sur iPhone : dans Safari, touche Partager puis « Sur l'écran d'accueil », et ouvre l'application depuis son icône." : "Sur Android : dans Chrome, menu ⋮ puis « Installer l'application »."}</li>
        <li>Ici, touche « Activer sur cet appareil » et autorise les notifications.</li>
        <li>Choisis l'heure et ce qui doit te prévenir, puis touche « Envoyer un test ».</li></ol>
      <p><b>B. Avec l'application ntfy</b> (à préférer si A n'affiche rien ou arrive en retard)</p>
      <ol><li>Télécharge ntfy avec les boutons ci-dessous.</li>
        <li>Ici, touche « Recevoir avec ntfy » : un nom de sujet personnel s'affiche.</li>
        <li>Dans ntfy, touche + et colle ce nom de sujet (serveur ntfy.sh, celui par défaut), puis « S'abonner ». Sur Android, « Ouvrir dans ntfy » le fait pour toi.</li>
        <li>Touche « Envoyer un test ».</li></ol>
      <p>Le nom du sujet joue le rôle de mot de passe : ne le partage pas. Avec ntfy, les messages (soins, noms des animaux) transitent par le serveur public ntfy.sh.</p></div>`);
  const ligne = (titre, etat, contenu) => `<div class="notif-canal"><div class="entete-c"><b>${titre}</b><span class="petit">${etat}</span></div>${contenu}</div>`;
  let webC;
  if (!NOTIF_OK()) webC = `<p class="petit">${ios ? "Sur iPhone, installe d'abord l'application sur l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »), puis rouvre-la depuis son icône." : "Ce navigateur ne permet pas les notifications."}</p>`;
  else if (Notification.permission === "denied") webC = `<p class="petit">Notifications bloquées pour l'application : autorise-les dans les réglages de l'appareil, puis reviens ici.</p>`;
  else webC = web ? `<button class="btn sec" data-a="notifRetirer" data-c="web">Retirer</button>` : `<button class="btn plein" data-a="notifActiver">${ic("cloche")} Activer sur cet appareil</button>`;
  const ntfyC = `<div class="liens-ntfy">${LIENS_NTFY.map(([t, u]) => `<a class="btn sec" href="${u}" target="_blank" rel="noopener">${ic("droite")} ${t}</a>`).join("")}</div>` + (nt
    ? `<label for="ntopic">Nom du sujet à ajouter dans ntfy</label><input id="ntopic" type="text" readonly value="${esc(n.ntfy)}" onfocus="this.select()">
       <div class="duo" style="margin-top:8px;align-items:stretch"><button class="btn sec" data-a="copierTexte" data-c="ntopic">${ic("copie")} Copier</button><a class="btn sec" href="ntfy://ntfy.sh/${esc(n.ntfy)}">Ouvrir dans ntfy</a></div>
       <button class="btn sec plein" style="margin-top:8px" data-a="notifRetirer" data-c="ntfy">Retirer</button>`
    : `<button class="btn plein" data-a="notifNtfy">${ic("cloche")} Recevoir avec ntfy</button>`);
  let reglages = "";
  if (web || nt) {
    const heure = n.heure === undefined ? 7 : +n.heure;
    const betes = liste(S.foyer.chevaux).filter(c => c.actif !== false).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
    const arts = liste(S.foyer.stocks).filter(x => x.actif !== false).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
    reglages = `<div class="champ"><label for="nh">Heure d'envoi</label><select id="nh" data-n="heure">${[...Array(17)].map((_, i) => i + 5).map(h => `<option value="${h}" ${h === heure ? "selected" : ""}>${h} h</option>`).join("")}</select></div>
      <label class="interrupteur"><input type="checkbox" data-n="soins" ${n.soins !== false ? "checked" : ""}><span class="rail"></span>Soins à prévoir</label>
      ${bloc("soins", "Choisir les soins concernés",
        `<p class="petit">Moments du rappel</p><div class="liste-coches">${coche("rappel7", "7 jours avant", n.rappel7 !== false)}${coche("rappelJour", "Le jour même", n.rappelJour !== false)}${coche("rappelRetard", "En retard (tous les 3 jours)", n.rappelRetard !== false)}</div>
         <p class="petit">Types de soin</p><div class="liste-coches">${Object.entries(TYPES).map(([c, t]) => coche(`sansTypes/${c}`, t.nom, !n.sansTypes?.[c], true)).join("")}</div>
         ${betes.length ? `<p class="petit">${MOTS().pl}</p><div class="liste-coches">${betes.map(c => coche(`sansAnimaux/${c.id}`, c.nom, !n.sansAnimaux?.[c.id], true)).join("")}</div>` : ""}`)}
      <label class="interrupteur"><input type="checkbox" data-n="stocks" ${n.stocks !== false ? "checked" : ""}><span class="rail"></span>Stocks bas</label>
      ${bloc("stocks", "Choisir les stocks concernés", `<div class="liste-coches">${coche("sansStocks/foin", "Foin", !n.sansStocks?.foin, true)}${arts.map(x => coche(`sansStocks/${x.id}`, x.nom, !n.sansStocks?.[x.id], true)).join("")}</div>`)}
      <button class="btn sec plein" style="margin-top:12px" data-a="notifTest">Envoyer un test</button>
      <p class="petit">Stocks : au passage du seuil d'alerte, puis chaque semaine. Heure et choix propres à cet appareil.</p>`;
  }
  return `<div class="carte">${entete("Notifications")}<p class="petit">Reçois les soins à prévoir et les alertes de stock, même application fermée.</p>${guide}
    ${ligne("Dans l'application", web ? "activé" : "", webC)}${nt || (!web && S.det?.ntfy) ? ligne("Avec ntfy", nt ? "activé" : "", ntfyC) : bloc("ntfy", "Ça ne marche pas ? Autre méthode (ntfy)", ligne("Avec ntfy", "", ntfyC))}${reglages}</div>`;
}
async function retirerNotif() {
  try { const reg = await navigator.serviceWorker.ready; await (await reg.pushManager.getSubscription())?.unsubscribe(); } catch { /* rien */ }
  await update(refNotif(), { [cleAppareil()]: null });
}
document.addEventListener("toggle", e => { const k = e.target.dataset?.d; if (k) (S.det ||= {})[k] = e.target.open; }, true);
document.addEventListener("change", e => {
  const el = e.target.closest?.("[data-n]"); if (!el || !S.foyer?.notifs?.[cleAppareil()]) return;
  vite(update(ref(db, `foyers/${S.fid}/notifs/${cleAppareil()}`), { [el.dataset.n]: el.type !== "checkbox" ? +el.value : "inv" in el.dataset ? (el.checked ? null : true) : el.checked })).then(() => toast("Enregistré")).catch(() => toast("Enregistrement impossible"));
});

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

function ouvrir(titre, corps, onOk, onSup, requis = [], libOk = "Enregistrer") {
  const d = $("#dlg");
  d.innerHTML = `<div class="poignee"></div><div class="entete"><h2>${titre}</h2><button class="ib" id="ann" aria-label="Fermer">${ic("fermer")}</button></div>
    <div class="formulaire">${corps}</div>
    <div class="barre">${onSup ? `<button class="btn danger-t" id="sup">Supprimer</button>` : ""}<button class="btn plein" id="ok">${libOk}</button></div>`;
  $("#ann").onclick = () => d.close();
  $("#ok").onclick = async () => {
    for (const r of requis) if (!val(r)) { const e = $("#" + r); e.classList.add("invalide"); e.focus(); return; }
    $("#ok").disabled = true;
    try { await vite(onOk()); d.close(); } catch (e) { $("#ok").disabled = false; toast(e?.avis || "Enregistrement impossible"); }
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

const prixChamps = (l, u = "balle") => `<div class="duo">${champ("pb", `Prix par ${u} (€)`, l.prixBalle || "", "text", 'inputmode="decimal"')}${champ("pt", "Prix total (€)", l.prixTotal || "", "text", 'inputmode="decimal"')}</div>
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
  const cle = modif({ [`foin/sorties/${push(base("foin/sorties")).key}`]: { date, balles: q, ts: Date.now() } }, texte || `a retiré ${balles(q)}`, "sortie");
  toast(`− ${balles(q)} noté`, () => annulerEntree(cle));
}

/* ---------- Actions ---------- */
const actions = {
  fiche: id => { S.cheval = id; S.vue = "fiche"; window.scrollTo(0, 0); rendre(); },
  cheval(id) {
    const c = id ? S.foyer.chevaux[id] : { actif: true };
    let photo = c.photo || "";
    ouvrir(id ? "Modifier la fiche" : "Nouvel animal",
      `<div class="photo-zone"><span id="phApercu">${avatarC(c, "grand")}</span><div class="photo-btns">
        <label class="btn sec petit-b" for="ph">${ic("photo")} Photo</label><input id="ph" type="file" accept="image/*" hidden>
        <button type="button" class="btn sec petit-b" id="phRetirer">Retirer</button></div></div>` +
      `<label>Espèce</label>${pills("es", Object.entries(ESPECES).map(([k, v]) => [k, v[0], v[1]]), espece(c))}` +
      champ("n", "Nom", c.nom, "text", 'autocomplete="off"') +
      `<div class="duo">${champ("r", espece(c) === "cheval" ? "Robe" : "Pelage", c.robe)}${champ("na", "Naissance", c.naissance, "date")}</div>` +
      champ("si", espece(c) === "cheval" ? "N° SIRE" : "Puce ou tatouage", c.sire, "text", 'autocapitalize="characters" autocomplete="off"') +
      `<label class="interrupteur"><input type="checkbox" id="ac" ${c.actif !== false ? "checked" : ""}><span class="rail"></span>Actif</label>` +
      `<label for="no">Notes</label><textarea id="no" rows="3">${esc(c.notes)}</textarea>`,
      () => { const k = id || push(base("chevaux")).key; modif({ [`chevaux/${k}`]: { nom: val("n"), espece: radio("es") || "cheval", sire: val("si").toUpperCase(), robe: val("r"), naissance: val("na"), actif: $("#ac").checked, notes: val("no"), photo } }, `a ${id ? "modifié" : "ajouté"} ${libAnimal(radio("es") || "cheval", val("n"))}`, "cheval"); },
      id && (() => modif(Object.fromEntries([[`chevaux/${id}`, null], ...liste(S.foyer.soins).filter(x => x.chevalId === id).map(x => [`soins/${x.id}`, null])]), `a supprimé ${libAnimal(espece(c), c.nom)}`, "cheval")), ["n"]);
    document.querySelectorAll("input[name=es]").forEach(x => x.onchange = () => {
      const ch = radio("es") === "cheval";
      $("#phApercu").innerHTML = avatarC({ nom: val("n") || c.nom || "?", photo, espece: radio("es") }, "grand");
      document.querySelector("label[for=r]").textContent = ch ? "Robe" : "Pelage"; document.querySelector("label[for=si]").textContent = ch ? "N° SIRE" : "Puce ou tatouage";
    });
    $("#ph").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { photo = await reduire(f); $("#phApercu").innerHTML = avatarC({ nom: val("n") || c.nom, photo, espece: radio("es") }, "grand"); } catch { toast("Photo illisible"); }
    };
    $("#phRetirer").onclick = () => { photo = ""; $("#phApercu").innerHTML = avatarC({ nom: val("n") || c.nom || "?", photo: "", espece: radio("es") }, "grand"); };
  },
  contact(id) {
    const c = id ? S.foyer.contacts[id] : { role: "Fournisseur de foin" };
    ouvrir(id ? "Modifier le contact" : "Nouveau contact",
      champ("n", "Nom", c.nom) + `<label>Rôle</label>` + pills("ro", Object.keys(ICONE_ROLE).map(r => [r, r.replace("Fournisseur de foin", "Foin").replace("Maréchal-ferrant", "Maréchal"), ICONE_ROLE[r]]), c.role || "Autre") +
      `<div class="duo">${champ("t", "Téléphone", c.tel, "tel", 'inputmode="tel"')}${champ("e", "E-mail", c.email, "email", 'inputmode="email"')}</div>` +
      champ("ad", "Adresse", c.adresse, "text", 'autocomplete="street-address"') + `<label for="no">Notes</label><textarea id="no" rows="2">${esc(c.notes)}</textarea>`,
      () => { modif({ [`contacts/${id || push(base("contacts")).key}`]: { nom: val("n"), role: radio("ro"), tel: val("t"), email: val("e"), adresse: val("ad"), notes: val("no") } }, `a ${id ? "modifié" : "ajouté"} le contact ${val("n")}`, "contact"); },
      id && (() => modif({ [`contacts/${id}`]: null }, `a supprimé le contact ${c.nom}`, "contact")), ["n"]);
  },
  livraison(id) {
    const l = id ? S.foyer.foin.livraisons[id] : { date: ajd() };
    ouvrir(id ? "Modifier la livraison" : "Livraison de foin",
      champ("d", "Date", l.date, "date") + `<p class="petit">Une date à venir programme la livraison : le stock et la prévision l'intègrent ce jour-là.</p>` + qte("b", "Nombre de balles", l.balles === undefined ? "" : fmtQte(l.balles)) +
      champ("p", "Poids moyen d'une balle (kg, facultatif)", l.poidsBalle || "", "number", 'min="0" step="0.5" inputmode="decimal"') + prixChamps(l) +
      `<label for="c">Fournisseur</label><select id="c"><option value="">—</option>${options(liste(S.foyer.contacts), l.contactId)}</select>` + champ("no", "Note", l.note),
      () => { modif({ [`foin/livraisons/${id || push(base("foin/livraisons")).key}`]: { date: val("d"), balles: parseQte(val("b")), poidsBalle: +val("p") || 0, prixBalle: num(val("pb")), prixTotal: num(val("pt")), contactId: val("c"), note: val("no") } }, `a ${id ? "modifié" : "noté"} une livraison de ${balles(parseQte(val("b")))}`, "livraison"); },
      id && (() => modif({ [`foin/livraisons/${id}`]: null }, `a supprimé la livraison de ${balles(+l.balles || 0)} (${frCourt(l.date)})`, "livraison")), ["d", "b"]);
    lierPrix(l.prixTotal ? "pt" : "pb");
  },
  livraisonCopeaux(id) {
    const l = id ? S.foyer.copeaux.livraisons[id] : { date: ajd() };
    ouvrir(id ? "Modifier la livraison" : "Livraison de copeaux",
      champ("d", "Date", l.date, "date") + qte("b", "Nombre de balles", l.balles === undefined ? "" : fmtQte(l.balles)) + prixChamps(l) +
      `<label for="c">Fournisseur</label><select id="c"><option value="">—</option>${options(liste(S.foyer.contacts), l.contactId)}</select>` + champ("no", "Note", l.note),
      () => { modif({ [`copeaux/livraisons/${id || push(base("copeaux/livraisons")).key}`]: { date: val("d"), balles: parseQte(val("b")), prixBalle: num(val("pb")), prixTotal: num(val("pt")), contactId: val("c"), note: val("no") } }, `a ${id ? "modifié" : "noté"} une livraison de ${balles(parseQte(val("b")))} de copeaux`, "copeaux"); },
      id && (() => modif({ [`copeaux/livraisons/${id}`]: null }, `a supprimé la livraison de ${balles(+l.balles || 0)} de copeaux (${frCourt(l.date)})`, "copeaux")), ["d", "b"]);
    lierPrix(l.prixTotal ? "pt" : "pb");
  },
  retirer(_id, d) {
    if (d?.q && d.q !== "autre") return noterSortie(parseQte(d.q));
    ouvrir("Retirer du stock", qte("b", "Quantité retirée (balles)", "", ["1/4", "1/3", "1/2", "2/3", "1", "2"]) + champ("d", "Date", ajd(), "date"),
      () => noterSortie(parseQte(val("b")), val("d") || ajd()), null, ["b"]);
  },
  sortieEdit(id) {
    const x = S.foyer.foin?.sorties?.[id]; if (!x) return;
    ouvrir("Corriger la sortie", qte("b", "Quantité retirée (balles)", fmtQte(+x.balles || 0), ["1/4", "1/3", "1/2", "2/3", "1", "2"]) + champ("d", "Date", x.date, "date"),
      () => { if (parseQte(val("b")) > 0) modif({ [`foin/sorties/${id}`]: { ...x, balles: parseQte(val("b")), date: val("d") || x.date } }, `a corrigé une sortie : ${balles(parseQte(val("b")))} (${frCourt(val("d") || x.date)})`, "sortie"); },
      () => { modif({ [`foin/sorties/${id}`]: null }, `a supprimé une sortie de ${balles(+x.balles || 0)} (${frCourt(x.date)})`, "sortie"); }, ["b"]);
  },
  finirBalle() {
    const p = prevision(S.foyer, aujourdhui()); if (!p) return;
    const r = p.stockAuj - Math.floor(p.stockAuj + 1e-6);
    if (r > 0.01 && r < 0.99) return noterSortie(r, ajd(), "a fini la balle entamée");
  },
  pas: (_i, d) => { const e = $("#" + d.c); e.value = fmtQte(Math.max(0, parseQte(e.value) + +d.p)); e.dispatchEvent(new Event("input", { bubbles: true })); },
  chip: (_i, d) => { const e = $("#" + d.c); e.value = d.q; e.dispatchEvent(new Event("input", { bubbles: true })); },
  etatSync: () => toast(textSync()),
  basculerRapide: () => { S.rapide = !S.rapide; ecrireLocal("ecurie-rapide", S.rapide ? "1" : "0"); rendre(); },
  aller: id => { if (id === "foin") S.article = null; S.vue = id; window.scrollTo(0, 0); rendre(); },
  vue: (_id, d) => { S.vue = d.v; window.scrollTo(0, 0); rendre(); },
  filtre: (_id, d) => { S.filtre = d.f; rendre(); },
  annee: (_id, d) => { S.annee += +d.d; rendre(); },
  soinFait(id) {
    const s = S.foyer.soins[id], jr = ajd();
    vibre();
    const cle = modif({ [`soins/${id}/dernier`]: jr, ...(s.rdv ? { [`soins/${id}/rdv`]: null } : {}), [`soins/${id}/passages/${push(base(`soins/${id}/passages`)).key}`]: { date: jr, ts: Date.now() } }, `a noté ${libelleSoin(s)} · ${nomCheval(s.chevalId)}`, "soin");
    toast(ponctuel(s) ? `${esc(libelleSoin(s))} fait` : `${esc(libelleSoin(s))} noté, prochain ${fr(echeance({ ...s, dernier: jr }))}`, () => annulerEntree(cle));
  },
  soin(id, d) {
    const chev = liste(S.foyer.chevaux).filter(c => c.actif !== false || c.id === S.foyer.soins?.[id]?.chevalId).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
    const s = id ? S.foyer.soins[id] : { type: "vaccin", n: TYPES.vaccin.n, unite: TYPES.vaccin.unite };
    ouvrir(id ? "Modifier le soin" : "Nouveau soin",
      `<label for="ch">${multi() ? "Animal" : "Cheval"}</label><select id="ch">${id ? "" : `<option value="*">${MOTS().tous.replace("Tous", "Tous").replace(/s$/, "s")} actifs</option>`}${options(chev, s.chevalId || d?.cheval)}</select>
       <label>Type de soin</label>${pills("ty", Object.entries(TYPES).map(([k, t]) => [k, t.nom, ICONE_SOIN[k]]), s.type)}` +
      champ("li", "Précision (ex. Grippe, Tétanos)", s.libelle) +
      `<label>Périodicité : tous les</label><div class="duo"><input id="pn" type="number" min="1" inputmode="numeric" value="${s.n || 1}"><select id="pu"><option value="sem" ${s.unite === "sem" ? "selected" : ""}>semaines</option><option value="mois" ${s.unite !== "sem" && s.unite !== "once" ? "selected" : ""}>mois</option><option value="once" ${s.unite === "once" ? "selected" : ""}>Aucune (soin ponctuel)</option></select></div>` +
      `<div class="duo">${champ("de", "Dernier passage", s.dernier, "date")}${champ("pr", "1re échéance", s.premiere, "date")}</div><p class="petit" id="aidePr">La 1re échéance sert tant qu'aucun passage n'est noté.</p>` +
      `<div id="blocRv">${champ("rv", "Rendez-vous pris (facultatif)", s.rdv, "date")}<p class="petit">Si un rendez-vous est fixé, il remplace la date calculée dans la liste et les rappels, jusqu'à ce que le soin soit noté fait.</p></div>` +
      `<label for="co">Intervenant</label><select id="co"><option value="">—</option>${options(liste(S.foyer.contacts), s.contactId, c => `${esc(c.nom)} (${esc(c.role || "")})`)}</select>` + champ("no", "Note", s.note),
      async () => {
        const uni = val("pu"), o = { type: radio("ty"), libelle: val("li"), n: +val("pn") || 1, unite: uni, dernier: uni === "once" ? (s.unite === "once" ? s.dernier || "" : "") : val("de"), premiere: val("pr"), rdv: uni === "once" ? null : (val("rv") || null), contactId: val("co"), note: val("no") };
        const lib = x => `${libelleSoin(o)} · ${nomCheval(x)}`;
        if (id) { modif(Object.fromEntries(Object.entries({ ...o, chevalId: val("ch") }).map(([k, v]) => [`soins/${id}/${k}`, v])), `a modifié ${lib(val("ch"))}`, "soin"); return; }
        const cibles = val("ch") === "*" ? chev.filter(c => c.actif !== false && soinPourEspece(radio("ty"), c.espece)).map(c => c.id) : [val("ch")];
        if (!cibles.length) { toast("Aucun animal concerné par ce soin"); return; }
        modif(Object.fromEntries(cibles.map(cid => [`soins/${push(base("soins")).key}`, { ...o, chevalId: cid }])), cibles.length > 1 ? `a ajouté ${libelleSoin(o)} pour ${cibles.length} ${MOTS().pl.toLowerCase()}` : `a ajouté ${lib(cibles[0])}`, "soin");
      },
      id && (() => modif({ [`soins/${id}`]: null }, `a supprimé ${libelleSoin(s)} · ${nomCheval(s.chevalId)}`, "soin")));
    const majPonctuel = () => {
      const p = $("#pu").value === "once";
      $("#pn").hidden = p; $("#pu").parentElement.style.gridTemplateColumns = p ? "1fr" : ""; $("#de").closest(".champ").hidden = p; $("#blocRv").hidden = p;
      $("#pr").closest(".champ").querySelector("label").textContent = p ? "Date prévue" : "1re échéance";
      $("#aidePr").textContent = p ? "Le soin disparaît des échéances une fois fait et reste dans l'historique." : "La 1re échéance sert tant qu'aucun passage n'est noté.";
    };
    $("#pu").onchange = majPonctuel; majPonctuel();
    document.querySelectorAll("input[name=ty]").forEach(r => r.onchange = () => { if (!id) { const t = TYPES[radio("ty")]; $("#pn").value = t.n; $("#pu").value = t.unite; majPonctuel(); } });
  },
  carnet(id) {
    const betes = liste(S.foyer.chevaux).filter(c => c.actif !== false).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
    if (!betes.length) return;
    const premier = id && S.foyer.chevaux[id] ? id : betes[0].id;
    const lignes = cid => {
      const c = S.foyer.chevaux[cid], deja = liste(S.foyer.soins).filter(s => s.chevalId === cid).map(s => s.type);
      const l = TYPES_CARNET().filter(t => soinPourEspece(t, c.espece) && !deja.includes(t));
      return l.length ? l.map(t => `<div class="carte-l"><label>${ICONE_SOIN[t] ? ic(ICONE_SOIN[t]) : ""} ${TYPES[t].nom}</label>
        ${t === "vaccin" ? champ(`cl_${t}`, "Précision (ex. Grippe, Tétanos)", "", "text", 'autocomplete="off"') : ""}
        ${champ(`cd_${t}`, "Date du dernier passage (d'après le carnet)", "", "date")}
        <div class="duo"><input id="cn_${t}" type="number" min="1" inputmode="numeric" value="${TYPES[t].n}"><select id="cu_${t}"><option value="sem" ${TYPES[t].unite === "sem" ? "selected" : ""}>semaines</option><option value="mois" ${TYPES[t].unite === "mois" ? "selected" : ""}>mois</option></select></div>
        <p class="petit">Périodicité : à répéter tous les… (modifiable).</p></div>`).join("")
        : `<p class="petit sobre">Tous les soins courants de ${esc(c.nom)} sont déjà suivis.</p>`;
    };
    ouvrir("Remplir depuis le carnet",
      `<p class="petit">Renseigne la date du dernier passage lue dans le carnet. Laisse vide ce que tu ne sais pas.</p><label for="cc">${multi() ? "Animal" : "Cheval"}</label><select id="cc">${options(betes, premier)}</select><div id="cl">${lignes(premier)}</div>
       <label class="interrupteur"><input type="checkbox" id="csd"><span class="rail"></span>Suivre aussi les soins sans date (à planifier)</label>`,
      () => {
        const cid = val("cc"), auj = ajd(), tous = {}; let nb = 0;
        TYPES_CARNET().forEach(t => {
          const e = $("#cd_" + t); const sans = $("#csd").checked;
          if (!e) return;
          const date = e.value.trim();
          if (date && date > auj) throw Object.assign(new Error("futur"), { avis: "Une date de passage ne peut pas être à venir : utilise un rendez-vous" });
          if (!date && !sans) return;
          const k = push(base("soins")).key, o = { chevalId: cid, type: t, libelle: $("#cl_" + t)?.value.trim() || "", n: +$("#cn_" + t).value || TYPES[t].n, unite: $("#cu_" + t).value, dernier: date, premiere: "", contactId: "", note: "" };
          if (date) o.passages = { [push(base(`soins/${k}/passages`)).key]: { date, ts: Date.now() } };
          tous[`soins/${k}`] = o; nb++;
        });
        if (!nb) throw Object.assign(new Error("vide"), { avis: "Aucune date renseignée" });
        modif(tous, `a renseigné le carnet de ${S.foyer.chevaux[cid].nom} (${nb} soin${nb > 1 ? "s" : ""})`, "soin");
      }, null, [], "Enregistrer");
    $("#cc").onchange = () => { $("#cl").innerHTML = lignes(val("cc")); };
  },
  faitGroupe(_id, d) {
    const type0 = d?.t || "ferrure";
    const candidats = t => soinsPrevus().filter(s => s.type === t && S.foyer.chevaux[s.chevalId].actif !== false).sort((x, y) => S.foyer.chevaux[x.chevalId].nom.localeCompare(S.foyer.chevaux[y.chevalId].nom));
    const lignes = t => { const l = candidats(t); return l.length ? `<div class="liste-coches">${l.map(s => `<label class="coche"><input type="checkbox" value="${s.id}" ${s.j === null || s.j <= 30 ? "checked" : ""}><span>${esc(libelleSoin(s))} · ${esc(S.foyer.chevaux[s.chevalId].nom)} <small>(${s.j === null ? "à planifier" : quand(s.j)})</small></span></label>`).join("")}</div>` : `<p class="petit sobre">Aucun soin de ce type à noter.</p>`; };
    ouvrir("Noté fait pour plusieurs",
      `<p class="petit">Un même passage pour plusieurs ${MOTS().pl.toLowerCase()} : choisis le type de soin, décoche ceux qui ne sont pas concernés, puis donne la date du passage.</p><label>Type de soin</label>${pills("ft", Object.entries(TYPES).map(([k, t]) => [k, t.nom, ICONE_SOIN[k]]), type0)}<label>Soins concernés</label><div id="fl">${lignes(type0)}</div>` +
      champ("fd", "Date du passage", ajd(), "date"),
      () => {
        const ids = [...document.querySelectorAll("#fl input:checked")].map(x => x.value), date = val("fd");
        if (!ids.length) throw Object.assign(new Error("vide"), { avis: "Aucun soin coché" });
        const o = {};
        ids.forEach(i => { o[`soins/${i}/dernier`] = date; if (S.foyer.soins[i].rdv) o[`soins/${i}/rdv`] = null; o[`soins/${i}/passages/${push(base(`soins/${i}/passages`)).key}`] = { date, ts: Date.now() }; });
        vibre();
        modif(o, `a noté ${TYPES[radio("ft")].nom.toLowerCase()} fait le ${frCourt(date)} pour ${ids.length} soin${ids.length > 1 ? "s" : ""}`, "soin");
      }, null, ["fd"], "Noter fait");
    document.querySelectorAll("input[name=ft]").forEach(r => r.onchange = () => { $("#fl").innerHTML = lignes(radio("ft")); });
  },
  rdvGroupe(_id, d) {
    const type0 = d?.t || "ferrure";
    const candidats = t => soinsPrevus().filter(s => s.type === t && S.foyer.chevaux[s.chevalId].actif !== false).sort((x, y) => S.foyer.chevaux[x.chevalId].nom.localeCompare(S.foyer.chevaux[y.chevalId].nom));
    const lignes = t => { const l = candidats(t); return l.length ? `<div class="liste-coches">${l.map(s => `<label class="coche"><input type="checkbox" value="${s.id}" checked><span>${esc(libelleSoin(s))} · ${esc(S.foyer.chevaux[s.chevalId].nom)}${s.rdvOk ? ` (RDV déjà fixé le ${frCourt(s.ech)})` : ""}</span></label>`).join("")}</div>` : `<p class="petit sobre">Aucun soin de ce type à planifier.</p>`; };
    ouvrir("Rendez-vous groupé",
      `<p class="petit">Un même rendez-vous pour plusieurs ${MOTS().pl.toLowerCase()} : choisis le type de soin, décoche ceux qui ne sont pas concernés, puis donne la date.</p><label>Type de soin</label>${pills("rt", Object.entries(TYPES).map(([k, t]) => [k, t.nom, ICONE_SOIN[k]]), type0)}<label>Soins concernés</label><div id="rl">${lignes(type0)}</div>` +
      champ("rd", "Date du rendez-vous", "", "date"),
      () => {
        const ids = [...document.querySelectorAll("#rl input:checked")].map(x => x.value), date = val("rd");
        if (!ids.length) throw Object.assign(new Error("vide"), { avis: "Aucun soin coché" });
        const o = Object.fromEntries(ids.map(i => [`soins/${i}/${ponctuel(S.foyer.soins[i]) ? "premiere" : "rdv"}`, date]));
        modif(o, `a fixé un rendez-vous de ${TYPES[radio("rt")].nom.toLowerCase()} le ${frCourt(date)} pour ${ids.length} soin${ids.length > 1 ? "s" : ""}`, "soin");
      }, null, ["rd"], "Fixer le rendez-vous");
    document.querySelectorAll("input[name=rt]").forEach(r => r.onchange = () => { $("#rl").innerHTML = lignes(radio("rt")); });
  },
  inventaire(id) {
    const i = id ? comptages(S.foyer).find(x => x.id === id) : { date: ajd() };
    const chemin = id === "legacy" ? "foin/inventaire" : `foin/inventaires/${id}`;
    ouvrir(id ? "Modifier le comptage" : "Comptage du foin", champ("d", "Date du comptage", i.date, "date") + qte("b", "Balles en stock", i.balles === undefined ? "" : fmtQte(i.balles)),
      () => {
        const o = { date: val("d"), balles: parseQte(val("b")) }; if (!id) o.ts = Date.now(); else if (i.ts) o.ts = i.ts;
        const k = id || push(base("foin/inventaires")).key, p0 = !id ? prevision(S.foyer, jour(o.date)) : null, calc = p0 && jour(o.date) > jour(p0.last.date) ? p0.stockAuj : null;
        modif({ [id ? chemin : `foin/inventaires/${k}`]: o }, `a ${id ? "modifié le comptage :" : "compté"} ${balles(o.balles)} en stock`, "comptage");
        const f2 = structuredClone(S.foyer); f2.foin ||= {}; if (id === "legacy") f2.foin.inventaire = o; else (f2.foin.inventaires ||= {})[k] = o;
        setTimeout(() => bilanComptage(f2, o.date, calc), 350);
      },
      id && (() => modif({ [chemin]: null }, `a supprimé le comptage de ${balles(+i.balles || 0)} (${frCourt(i.date)})`, "comptage")), ["d", "b"]);
  },
  inventaireCopeaux() {
    const i = S.foyer.copeaux?.inventaire || { date: ajd() };
    ouvrir("Comptage des copeaux", champ("d", "Date du comptage", i.date, "date") + qte("b", "Balles en stock", i.balles === undefined ? "" : fmtQte(i.balles)),
      () => { modif({ "copeaux/inventaire": { date: val("d"), balles: parseQte(val("b")) } }, `a compté ${balles(parseQte(val("b")))} de copeaux`, "copeaux"); }, null, ["b"]);
  },
  params() {
    const f = S.foyer.foin || {};
    ouvrir("Réglages du stock", `<p class="petit">L'accueil passe en alerte quand il reste moins de jours de foin que le seuil. La commande conseillée vise à couvrir la période choisie.</p>` +
      champ("s", "Alerte quand il reste (jours)", f.seuilJours || 14, "number", 'min="1" inputmode="numeric"') +
      champ("cv", "Période à couvrir par une commande (jours)", f.couvertureJours || 90, "number", 'min="7" inputmode="numeric"') +
      champ("cj", "Me rappeler de compter après (jours sans comptage)", f.comptageJours || 21, "number", 'min="7" inputmode="numeric"'),
      () => { modif({ "foin/seuilJours": +val("s") || 14, "foin/couvertureJours": +val("cv") || 90, "foin/comptageJours": +val("cj") || 21 }, "a modifié les réglages du stock", "modif"); });
  },
  prenom() {
    ouvrir("Mon prénom", `<p class="petit">Affiché dans l'activité de la famille.</p>` + champ("pr", "Prénom", S.foyer.membres?.[S.user.uid]?.nom || "", "text", 'autocomplete="given-name"'),
      () => { modif({ [`membres/${S.user.uid}/nom`]: val("pr") }, "a changé son prénom", "modif"); }, null, ["pr"]);
  },
  res: (id, d) => { $("#drech").close(); actions[d.t](id); },
  intro: () => intro(),
  installer: async () => { if (S.install) { S.install.prompt(); await S.install.userChoice; S.install = null; rendre(); } },
  agenda: () => {
    const pad = n => String(n).padStart(2, "0"), auj = new Date(), st = `${auj.getUTCFullYear()}${pad(auj.getUTCMonth() + 1)}${pad(auj.getUTCDate())}T${pad(auj.getUTCHours())}${pad(auj.getUTCMinutes())}00Z`;
    const txt = t => String(t).replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
    const ev = soinsPrevus().filter(x => x.ech).map(x => {
      const d = x.ech.replace(/-/g, ""), fin = enChaine(jour(x.ech) + 1).replace(/-/g, "");
      return ["BEGIN:VEVENT", `UID:${x.id}@ecurie`, `DTSTAMP:${st}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${fin}`,
        `SUMMARY:${txt((x.rdvOk ? "RDV " : "") + libelleSoin(x) + " · " + S.foyer.chevaux[x.chevalId].nom)}`, "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Soin à prévoir", "TRIGGER:-P7D", "END:VALARM", "END:VEVENT"].join("\r\n");
    });
    if (!ev.length) return toast("Aucune échéance à exporter");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ecurie//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Écurie", ...ev, "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "ecurie-soins.ics"; document.body.append(a); a.click(); a.remove();
    toast(`${ev.length} échéances exportées`);
  },
  defaire(id) {
    const e = S.foyer.journal?.[id]; if (!e) return;
    const rec = reconstruire(e);
    ouvrir(e.type === "annulation" ? "Rétablir" : "Annuler cette action", `<p><b>${esc(e.qui)}</b> ${esc(e.texte)}</p><p class="petit">Les données reviennent à ce qu'elles étaient avant cette action. Si elles ont été modifiées depuis, ces modifications seront remplacées. Tu pourras annuler cette annulation.</p>` +
      (rec?.soin ? champ("pd", "Date du soin précédent (laisser vide s'il n'y en avait pas)", rec.def, "date") : ""),
      () => { if (rec?.soin) rec.liste.push({ c: `soins/${rec.soin}/dernier`, v: val("pd") || "" }); annulerEntree(id, rec?.liste); }, null, [], e.type === "annulation" ? "Rétablir" : "Annuler l'action");
  },
  momentRoutine: (_id, d) => { S.moment = d.m; rendre(); },
  routineEdit(id, d) {
    const r = id ? S.foyer.routine[id] : { moment: d?.m || S.moment, tous: true };
    const chev = liste(S.foyer.chevaux).filter(c => c.actif !== false).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
    const mode0 = r.tous ? (Object.keys(r.sauf || {}).length ? "sauf" : "tous") : "seuls", coches = r.tous ? r.sauf || {} : r.chevaux || {};
    ouvrir(id ? "Modifier la ligne" : "Nouvelle ligne",
      `<label>Moment</label>${pills("mo", [["matin", "Matin", "soleil"], ["soir", "Soir", "lune"]], r.moment)}` +
      champ("li", "Consigne (ex. Aspégic, Granulés, Foin dans le paddock)", r.libelle, "text", 'autocomplete="off"') +
      champ("q", "Quantité (facultatif, ex. 5, 1 L, 1/2 L)", r.qte, "text", 'autocomplete="off"') +
      `<label>${MOTS().pl} concernés</label>${pills("md", [["tous", "Tous"], ["sauf", "Tous sauf…"], ["seuls", "Seulement…"]], mode0)}` +
      `<div id="zc" class="liste-coches" ${mode0 === "tous" ? "hidden" : ""}>${chev.map(c => `<label class="coche"><input type="checkbox" value="${c.id}" ${coches[c.id] ? "checked" : ""}><span>${esc(c.nom)}</span></label>`).join("")}</div>` +
      champ("no", "Précision (facultatif, ex. concassées)", r.note),
      () => {
        const mode = radio("md"), ids = Object.fromEntries([...document.querySelectorAll("#zc input:checked")].map(x => [x.value, true]));
        const o = { moment: radio("mo"), libelle: val("li"), qte: val("q"), note: val("no"), tous: mode !== "seuls", ts: r.ts || Date.now() };
        if (mode === "sauf" && Object.keys(ids).length) o.sauf = ids; else if (mode === "seuls") o.chevaux = ids;
        modif({ [`routine/${id || push(base("routine")).key}`]: o }, `a ${id ? "modifié" : "ajouté"} la routine du ${MOMENTS[o.moment][0].toLowerCase()} : ${o.libelle}`, "routine");
      },
      id && (() => modif({ [`routine/${id}`]: null }, `a supprimé la routine du ${MOMENTS[r.moment][0].toLowerCase()} : ${r.libelle}`, "routine")), ["li"]);
    document.querySelectorAll("input[name=md]").forEach(x => x.onchange = () => { $("#zc").hidden = radio("md") === "tous"; });
  },
  choisirStock: id => { S.article = id || null; rendre(); },
  voirArticle: id => { S.article = id; S.vue = "foin"; window.scrollTo(0, 0); rendre(); },
  articleEdit(id) {
    const x = id ? S.foyer.stocks[id] : { unite: "sac", seuilJours: 14 };
    const betes = liste(S.foyer.chevaux).filter(c => c.actif !== false).sort((p, q) => (p.nom || "").localeCompare(q.nom || ""));
    ouvrir(id ? "Modifier l'article" : "Nouvel article de stock",
      champ("n", "Nom (ex. Croquettes chiens, Litière chats)", x.nom, "text", 'autocomplete="off"') +
      `<label>Unité</label>${pills("un", [["sac", "Sac"], ["boîte", "Boîte"], ["bidon", "Bidon"], ["seau", "Seau"]], uniteA(x))}` +
      `<div class="duo">${champ("po", "Poids d'une unité (kg)", x.poids || "", "text", 'inputmode="decimal"')}${champ("se", "Alerte à (jours restants)", x.seuilJours || 14, "number", 'min="1" inputmode="numeric"')}</div>` +
      (betes.length ? `<label>${MOTS().pl} concernés (facultatif)</label><div class="liste-coches" id="za">${betes.map(c => `<label class="coche"><input type="checkbox" value="${c.id}" ${x.animaux?.[c.id] ? "checked" : ""}><span>${esc(c.nom)}</span></label>`).join("")}</div>` : ""),
      () => {
        const k = id || push(base("stocks")).key, ids = Object.fromEntries([...document.querySelectorAll("#za input:checked")].map(i => [i.value, true]));
        const o = { nom: val("n"), unite: radio("un") || "sac", poids: num(val("po")), seuilJours: +val("se") || 14, animaux: Object.keys(ids).length ? ids : null, actif: true, ts: x.ts || Date.now() };
        S.article = k;
        modif(Object.fromEntries(Object.entries(o).map(([f, v]) => [`stocks/${k}/${f}`, v])), `a ${id ? "modifié" : "ajouté"} l'article de stock ${o.nom}`, "stock");
      },
      id && (() => { S.article = null; modif({ [`stocks/${id}`]: null }, `a supprimé l'article de stock ${x.nom}`, "stock"); }), ["n"]);
  },
  articleFini(id) {
    const x = S.foyer.stocks?.[id]; if (!x) return; vibre();
    const cle = modif({ [`stocks/${id}/evts/${push(base(`stocks/${id}/evts`)).key}`]: { type: "fini", date: ajd(), ts: Date.now() } }, `a fini un ${uniteA(x)} : ${x.nom}`, "stock");
    toast(`${esc(x.nom)} : ${uniteA(x)} fini`, () => annulerEntree(cle));
  },
  articleOuvert(id) {
    const x = S.foyer.stocks?.[id]; if (!x) return; vibre();
    const cle = modif({ [`stocks/${id}/evts/${push(base(`stocks/${id}/evts`)).key}`]: { type: "ouvert", date: ajd(), ts: Date.now() } }, `a entamé un ${uniteA(x)} : ${x.nom}`, "stock");
    toast(`${esc(x.nom)} : ${uniteA(x)} entamé`, () => annulerEntree(cle));
  },
  evtArt(id) {
    const A = S.article, x = S.foyer.stocks[A], v = x.evts?.[id]; if (!v) return;
    ouvrir("Corriger", `<label>Événement</label>${pills("ev", [["fini", `${uniteA(x)[0].toUpperCase() + uniteA(x).slice(1)} fini`, "check"], ["ouvert", `${uniteA(x)[0].toUpperCase() + uniteA(x).slice(1)} entamé`, "sac"]], v.type)}` + champ("d", "Date", v.date, "date"),
      () => { modif({ [`stocks/${A}/evts/${id}`]: { ...v, type: radio("ev"), date: val("d") || v.date } }, `a corrigé un événement : ${x.nom}`, "stock"); },
      () => { modif({ [`stocks/${A}/evts/${id}`]: null }, `a supprimé un événement : ${x.nom} (${frCourt(v.date)})`, "stock"); }, ["d"]);
  },
  achat(id) {
    const A = S.article, x = S.foyer.stocks[A], b = id ? x.achats[id] : { date: ajd(), poids: x.poids };
    ouvrir(id ? "Modifier l'achat" : "Achat", champ("d", "Date", b.date, "date") + qte("b", `Nombre de ${uniteA(x)}s`, b.n === undefined ? "" : fmtQte(b.n)) +
      champ("p", "Poids d'une unité (kg, facultatif)", b.poids || "", "text", 'inputmode="decimal"') + prixChamps({ prixBalle: b.prixUnite, prixTotal: b.prixTotal }, uniteA(x)) +
      `<label for="c">Fournisseur</label><select id="c"><option value="">—</option>${options(liste(S.foyer.contacts), b.contactId)}</select>` + champ("no", "Note", b.note),
      () => { modif({ [`stocks/${A}/achats/${id || push(base(`stocks/${A}/achats`)).key}`]: { date: val("d"), n: parseQte(val("b")), poids: num(val("p")), prixUnite: num(val("pb")), prixTotal: num(val("pt")), contactId: val("c"), note: val("no"), ts: b.ts || Date.now() } }, `a ${id ? "modifié" : "noté"} un achat de ${nbU(x, parseQte(val("b")))} : ${x.nom}`, "stock"); },
      id && (() => modif({ [`stocks/${A}/achats/${id}`]: null }, `a supprimé un achat : ${x.nom} (${frCourt(b.date)})`, "stock")), ["d", "b"]);
    lierPrix(b.prixTotal ? "pt" : "pb");
  },
  comptageArt(id) {
    const A = S.article, x = S.foyer.stocks[A], c = id ? x.comptages[id] : { date: ajd(), n: undefined };
    ouvrir(id ? "Modifier le comptage" : "Comptage", champ("d", "Date", c.date, "date") + qte("b", `${uniteA(x)[0].toUpperCase() + uniteA(x).slice(1)}s en stock`, c.n === undefined ? "" : fmtQte(c.n)) +
      `<label class="interrupteur"><input type="checkbox" id="en" ${c.entame ? "checked" : ""}><span class="rail"></span>Dont un ${uniteA(x)} entamé</label><p class="petit">Facultatif. Le comptage sert à rectifier le stock calculé.</p>`,
      () => { modif({ [`stocks/${A}/comptages/${id || push(base(`stocks/${A}/comptages`)).key}`]: { date: val("d"), n: parseQte(val("b")), entame: $("#en").checked, ts: c.ts || Date.now() } }, `a compté ${nbU(x, parseQte(val("b")))} : ${x.nom}`, "stock"); },
      id && (() => modif({ [`stocks/${A}/comptages/${id}`]: null }, `a supprimé un comptage : ${x.nom} (${frCourt(c.date)})`, "stock")), ["d", "b"]);
  },
  async notifActiver() {
    try {
      if (await Notification.requestPermission() !== "granted") { toast("Notifications refusées"); rendre(); return; }
      const { cle } = await (await fetch("/api/cle")).json();
      if (!cle) { toast("Serveur d'envoi pas encore configuré"); return; }
      const octets = b64u.dec(cle), reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (sub && (!sub.options?.applicationServerKey || b64u.enc(sub.options.applicationServerKey) !== cle)) { await sub.unsubscribe(); sub = null; }
      sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octets });
      const j = sub.toJSON(), k = cleAppareil();
      await vite(update(refNotif(), { ...champsNotif(k), [`${k}/sub`]: { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } } }));
      toast("Notifications activées"); rendre();
    } catch { toast("Activation impossible"); }
  },
  async notifNtfy() {
    try {
      const k = cleAppareil(), sujet = "ecurie-" + [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
      await vite(update(refNotif(), { ...champsNotif(k), [`${k}/ntfy`]: sujet, [`${k}/site`]: location.origin }));
      toast("Sujet créé : ajoute-le dans ntfy");
    } catch { toast("Activation impossible"); }
  },
  async notifRetirer(_id, d) {
    try {
      const k = cleAppareil(), n = S.foyer.notifs?.[k] || {}, web = d.c === "web";
      if (web) { try { const reg = await navigator.serviceWorker.ready; await (await reg.pushManager.getSubscription())?.unsubscribe(); } catch { /* rien */ } }
      const reste = web ? !!n.ntfy : !!n.sub;
      await vite(update(refNotif(), reste ? { [`${k}/${web ? "sub" : "ntfy"}`]: null } : { [k]: null }));
      toast("Notifications retirées");
    } catch { toast("Retrait impossible"); }
  },
  copierTexte: (_id, d) => { const e = $("#" + d.c); e.select(); navigator.clipboard?.writeText(e.value).then(() => toast("Copié")).catch(() => toast("Sélectionné : copie-le à la main")); },
  async notifTest() {
    try {
      const r = await fetch("/api/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: await S.user.getIdToken(), fid: S.fid, appareil: cleAppareil() }) });
      const j = await r.json().catch(() => ({}));
      toast(r.ok ? "Test envoyé : il arrive dans quelques secondes" : `Test impossible : ${esc(j.erreur || r.status)}`);
    } catch { toast("Test impossible : pas de réseau"); }
  },
  async genererCles() {
    const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]), j = await crypto.subtle.exportKey("jwk", k.privateKey);
    const pub = b64u.enc(new Uint8Array([4, ...b64u.dec(j.x), ...b64u.dec(j.y)]));
    const zone = (id, lib, v) => `<label for="${id}">${lib}</label><textarea id="${id}" rows="3" readonly onfocus="this.select()">${v}</textarea>`;
    $("#cles").innerHTML = zone("kpub", "VAPID_PUBLIC (variable)", pub) + zone("kpri", "VAPID_PRIVATE (secret)", j.d);
  },
  histo: (_id, d) => { S.hist = +d.h; rendre(); },
  copier: () => navigator.clipboard?.writeText(S.foyer.code).then(() => toast("Code copié")),
  sortie: async () => {
    try { if (S.foyer?.notifs?.[cleAppareil()]) await vite(retirerNotif()); } catch { /* rien */ }
    try { Object.keys(localStorage).filter(k => k.startsWith("ecurie-fid-") || k.startsWith("ecurie-foyer-")).forEach(k => localStorage.removeItem(k)); } catch { /* rien */ }
    return signOut(auth).then(() => location.reload());
  }
};

document.addEventListener("click", e => {
  if (e.target.closest("a:not([data-a])") || Date.now() - bloque < 400) return;
  const el = e.target.closest("[data-a]");
  if (!el || !S.foyer) return;
  e.stopPropagation(); e.preventDefault();
  Object.hasOwn(actions, el.dataset.a) && actions[el.dataset.a](el.dataset.id, el.dataset);
});

/* ---------- Recherche ---------- */
function chercher() {
  const d = $("#drech");
  d.innerHTML = `<div class="poignee"></div><div class="entete"><h2>Rechercher</h2><button class="ib" id="rfer" aria-label="Fermer">${ic("fermer")}</button></div>
    <div class="formulaire"><input id="rq" type="search" placeholder="Cheval, soin, contact…" autocomplete="off" enterkeyhint="search"><div id="rres"></div></div>`;
  $("#rfer").onclick = () => d.close();
  const index = [
    ...liste(S.foyer.chevaux).map(c => ({ t: "cheval", id: c.id, g: avatarC(c), titre: esc(c.nom), sous: [esc(c.robe || ""), c.sire ? "SIRE " + esc(c.sire) : ""].filter(Boolean).join(" · "), mots: norm([c.nom, c.robe, c.sire, c.notes].join(" ")) })),
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

/* ---------- Dernière visite ---------- */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") ecrireLocal("ecurie-vu", String(Date.now()));
  else { S.vuPrec = +lire("ecurie-vu") || S.vuPrec; if (S.foyer) rendre(); }
});
window.addEventListener("pagehide", () => ecrireLocal("ecurie-vu", String(Date.now())));
