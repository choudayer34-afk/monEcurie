import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, remove, update, onValue }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { jour, enChaine, liste, sortieApres, comptages, periodes, prevision, consoMensuelle, consoPrevue, depensesMensuelles, courbeStock } from "./prevision.js";
import { TYPES, libelleSoin, echeance, joursAvant } from "./soins.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const S = { user: null, fid: null, foyer: null, vue: "accueil", annee: new Date().getFullYear(), filtre: "tous", install: null, cheval: null, stockPrec: null, ghost: null };

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
  photo: '<path d="M4 8h3l1.500-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.500"/>',
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
const avatarC = (c, cls = "") => c.photo ? `<img class="avatar ${cls}" src="${esc(c.photo)}" alt="">` : `<span class="avatar ${cls} a${teinte(c.nom)}">${esc((c.nom || "?").trim().charAt(0).toUpperCase())}</span>`;
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
const ADMIN = "ch-houdayer@hotmail.fr";
const estAdmin = () => (S.user?.email || "").toLowerCase() === ADMIN;
const SERVICES = [
  ["Firebase — vue d'ensemble", "Projet monecurie-f3055", "https://console.firebase.google.com/project/monecurie-f3055/overview"],
  ["Firebase — Authentication", "Comptes et utilisateurs", "https://console.firebase.google.com/project/monecurie-f3055/authentication/users"],
  ["Firebase — Realtime Database", "Données et règles de sécurité", "https://console.firebase.google.com/project/monecurie-f3055/database"],
  ["Google Cloud — clés API", "Restrictions de la clé web, quotas", "https://console.cloud.google.com/apis/credentials?project=monecurie-f3055"],
  ["Cloudflare — Workers", "Application « ecurie » et rappels « ecurie-rappels »", "https://dash.cloudflare.com/?to=/:account/workers-and-pages"],
  ["GitHub — dépôt monEcurie", "Code source et historique", "https://github.com/choudayer34-afk/monEcurie"],
  ["Resend — e-mails", "Envois, domaine, clé API", "https://resend.com/emails"]
];
function admin() {
  const f = S.foyer, nb = o => liste(o).length, dern = liste(f.journal).reduce((m, j) => Math.max(m, j.ts || 0), 0);
  const lien = ([t, s, u]) => `<a class="rangee" href="${u}" target="_blank" rel="noopener"><div class="corps"><div class="titre">${t}</div><div class="petit">${s}</div></div><span class="chev">${ic("droite")}</span></a>`;
  return `<div class="chips"><button class="chip" data-a="vue" data-v="reglages">${ic("gauche")} Foyer</button></div>
    <div class="carte">${entete("Services")}${SERVICES.map(lien).join("")}</div>
    <div class="carte">${entete("Diagnostic du foyer")}
      ${[["Compte", esc(S.user.email)], ["Identifiant", esc(S.user.uid)], ["Foyer", esc(f.nom || "")], ["Membres", nb(f.membres)], ["Chevaux", nb(f.chevaux)], ["Contacts", nb(f.contacts)], ["Soins", nb(f.soins)],
        ["Comptages de foin", nb(f.foin?.inventaires)], ["Livraisons de foin", nb(f.foin?.livraisons)], ["Sorties de foin", nb(f.foin?.sorties)], ["Entrées d'activité", nb(f.journal)],
        ["Dernière activité", dern ? new Date(dern).toLocaleString("fr-FR") : "—"], ["Connexion", $("#hors").hidden ? "En ligne" : "Hors ligne"]]
        .map(([a, b]) => rangee({ gauche: "", titre: a, droite: `<span class="petit">${b}</span>` })).join("")}</div>
    <div class="carte petit">Aucune clé ni aucun secret n'est stocké dans l'application : les accès passent par ton compte sur chaque service.</div>`;
}
const vues = { accueil, chevaux, soins, foin, contacts, reglages, journal, fiche, admin };
const TITRES = { accueil: "Accueil", chevaux: "Chevaux", soins: "Soins", foin: "Stock", contacts: "Contacts", reglages: "Foyer", journal: "Activité", admin: "Administration" };

function rendre() {
  if (!S.foyer) return;
  if (S.vue === "admin" && !estAdmin()) S.vue = "reglages";
  if (S.vue === "fiche" && !S.foyer.chevaux?.[S.cheval]) S.vue = "chevaux";
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("actif", b.dataset.v === (S.vue === "fiche" ? "chevaux" : S.vue)));
  const nbC = liste(S.foyer.chevaux).filter(c => c.actif !== false).length;
  const nbSoins = soinsPrevus().filter(x => S.foyer.chevaux[x.chevalId].actif !== false && x.j !== null && x.j <= 0).length;
  const bs = document.querySelector("nav button[data-v=soins]");
  bs.querySelector(".pastille")?.remove();
  if (nbSoins) bs.insertAdjacentHTML("beforeend", `<span class="pastille" aria-label="${nbSoins} soins à faire">${nbSoins > 9 ? "9+" : nbSoins}</span>`);
  bs.title = nbSoins ? `Soins (${nbSoins} à faire)` : "Soins";
  try { nbSoins ? navigator.setAppBadge?.(nbSoins) : navigator.clearAppBadge?.(); } catch { /* non pris en charge */ }
  $("#titre").textContent = S.vue === "fiche" ? nomCheval(S.cheval) : TITRES[S.vue];
  $("#sous").textContent = {
    accueil: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    chevaux: `${nbC} ${nbC > 1 ? "chevaux actifs" : "cheval actif"}`,
    soins: "Vaccins, ferrure, dentiste…",
    foin: "Foin et copeaux",
    contacts: "Fournisseurs et soignants",
    reglages: "Partage et compte",
    journal: "Ce que fait la famille",
    admin: "Services et diagnostic",
    fiche: "Fiche du cheval"
  }[S.vue];
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
function hero(p, seuil, g) {
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
  ${pile(p.stockAuj, g)}${majStock(p)}
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
  const now = Date.now();
  if (p && S.stockPrec != null && S.stockPrec - p.stockAuj > 0.05 && S.stockPrec - p.stockAuj < 6) S.ghost = { n: Math.min(3, Math.ceil(S.stockPrec - p.stockAuj - 1e-6)), t: now };
  if (p) S.stockPrec = p.stockAuj;
  const ghost = S.ghost && now - S.ghost.t < 1100 ? { n: S.ghost.n, ecoule: now - S.ghost.t } : null;
  return hero(p, seuil, ghost) + statistiques(nbC, plan) + (p ? rapide(p) : "") + carteCommande(p) +
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
function ligneSoin(s, avecCheval = true) {
  return `<div class="glisse"><div class="fond">${ic("check")} Fait</div>` + rangee({
    gauche: bulle(ICONE_SOIN[s.type] || "croix", urgence(s.j)), classe: `u-${urgence(s.j)}`, a: "soin", id: s.id,
    titre: `${esc(libelleSoin(s))}${avecCheval ? " · " + esc(S.foyer.chevaux[s.chevalId].nom) : ""}`,
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
  return `<div class="chips">${chips}${tous.some(x => x.ech) ? `<button class="chip" data-a="agenda" title="Exporter vers l'agenda">${ic("calendrier")} Agenda</button>` : ""}</div>` + (tous.length ? `<p class="petit astuce">Astuce : glisse une ligne vers la droite pour la valider.</p>` : "") + (blocs || vide("croix", "Aucun soin suivi pour l'instant.", `<button class="btn" data-a="soin">${ic("plus")} Ajouter un soin</button>`)) +
    `<button class="fab" data-a="soin" aria-label="Ajouter un soin" title="Ajouter un soin">${ic("plus")}</button>`;
}

/* --- Chevaux --- */
function chevaux() {
  const l = liste(S.foyer.chevaux).sort((a, b) => (b.actif !== false) - (a.actif !== false) || (a.nom || "").localeCompare(b.nom || ""));
  const plan = soinsPrevus();
  return (l.length ? `<div class="carte liste">${l.map(c => {
    const prochain = plan.find(s => s.chevalId === c.id && s.j !== null);
    return rangee({
      gauche: avatarC(c), classe: c.actif === false ? "inactif" : "", a: "fiche", id: c.id, titre: esc(c.nom),
      sous: [esc(c.robe || ""), age(c.naissance), c.sire ? "SIRE " + esc(c.sire) : "", c.actif === false ? "inactif" : ""].filter(Boolean).join(" · ") || "Fiche à compléter",
      droite: prochain ? `<span class="badge ${urgence(prochain.j)}">${ic(ICONE_SOIN[prochain.type])}${quand(prochain.j)}</span>` : `<span class="chev">${ic("droite")}</span>`
    });
  }).join("")}</div>` : vide("fer", "Ajoute ton premier cheval.", `<button class="btn" data-a="cheval">${ic("plus")} Ajouter un cheval</button>`)) +
    `<button class="fab" data-a="cheval" aria-label="Ajouter un cheval" title="Ajouter un cheval">${ic("plus")}</button>`;
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
  const infos = [c.robe && esc(c.robe), c.naissance && `${age(c.naissance)} (né le ${fr(c.naissance)})`, c.sire && "SIRE " + esc(c.sire), c.actif === false && "inactif"].filter(Boolean);
  return `<div class="chips"><button class="chip" data-a="vue" data-v="chevaux">${ic("gauche")} Chevaux</button></div>
    <div class="carte fiche-t">${avatarC(c, "grand")}
      <div class="corps"><h2>${esc(c.nom)}</h2><div class="petit">${infos.join(" · ") || "Fiche à compléter"}</div></div>
      ${bouton("crayon", "cheval", `data-id="${S.cheval}"`, "Modifier la fiche")}</div>
    <div class="carte">${entete("Soins à prévoir", `<button class="btn sec petit-b" data-a="soin" data-cheval="${S.cheval}">${ic("plus")} Soin</button>`)}
      ${plan.length ? plan.map(s => ligneSoin(s, false)).join("") : `<p class="petit sobre">Aucun soin suivi pour ${esc(c.nom)}.</p>`}</div>
    <div class="carte">${entete("Historique des soins")}
      ${hist.length ? hist.slice(0, 40).map(h => rangee({ gauche: bulle(ICONE_SOIN[h.s.type] || "croix"), titre: esc(libelleSoin(h.s)), sous: fr(h.date) })).join("") : `<p class="petit sobre">Les passages notés avec le bouton ✓ apparaîtront ici.</p>`}</div>
    ${c.notes ? `<div class="carte">${entete("Notes")}<p>${esc(c.notes)}</p></div>` : ""}`;
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
  const proche = !c.A && !c.B ? 60 : Math.min(365, Math.max(60, ...ruptures.map(r => r - c.jAuj + 25), ...(ruptures.length < [c.A, c.B].filter(Boolean).length ? [365] : [0])));
  const jmin = S.hist ? Math.max(c.hist[0].j, c.jAuj - S.hist) : c.hist[0].j, jmax = c.jAuj + proche;
  const vis = c.hist.filter(h => h.j >= jmin);
  const maxVu = Math.max(1, ...vis.map(h => h.s), c.sAuj);
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
  c.comp.filter(q => q.j >= jmin).forEach(q => { svg += `<circle cx="${X(q.j).toFixed(1)}" cy="${Y(q.s).toFixed(1)}" r="2.800" class="cv-cpt"/>`; });
  [[c.A, "cv-a-t", -9], [c.B, "cv-b-t", -21]].forEach(([pr, cl, dy]) => { if (!pr?.rupture) return; const x = X(pr.rupture), fin = x > W - 52; svg += `<circle cx="${x.toFixed(1)}" cy="${Y(0)}" r="4" class="cv-fin ${cl}"/><text class="val ${cl}" x="${(fin ? x + 4 : x).toFixed(1)}" y="${Y(0) + dy}" text-anchor="${fin ? "end" : "middle"}">${fr(enChaine(pr.rupture)).slice(0, 5)}</text>`; });
  svg += `<line id="cvx" class="cv-croix" y1="${haut}" y2="${haut + hh}" x1="0" x2="0"/>`;
  S.cv = { c, jmin, jmax, gauche, droite, W };
  const dans = pr => pr?.rupture ? `rupture le <b>${fr(enChaine(pr.rupture))}</b> (dans ${pr.rupture - c.jAuj} j)` : `<b>pas de rupture</b> dans les 12 mois`;
  const aT = j => { const q = c.A?.pts.find(x => x.j === c.jAuj + j) ; return q ? Math.round(q.s) : (c.A ? 0 : null); };
  const lignes = [
    c.A ? `<div class="cv-l"><i class="k a"></i><span>Années précédentes : ${dans(c.A)}</span></div>` : "",
    c.B ? `<div class="cv-l"><i class="k b"></i><span>Consommation actuelle (${taux(c.rateB)} balle/j sur ${c.fenetre} j) : ${dans(c.B)}</span></div>` : "",
    !c.A && !c.B ? `<p class="petit sobre">Les projections apparaissent après un 2e comptage ou quelques sorties notées.</p>` : `<p class="petit sobre">Projections sans nouvelle livraison.</p>`
  ].join("");
  const chip = (v, t) => `<button class="chip ${S.hist === v ? "actif" : ""}" data-a="histo" data-h="${v}">${t}</button>`;
  return `<div class="carte cv-carte">${entete("Évolution du stock", `<div class="chips pet">${chip(180, "6 mois")}${chip(365, "1 an")}${chip(0, "Tout")}</div>`)}
    <svg viewBox="0 0 ${W} ${H}" class="courbe" role="img" aria-label="Évolution du stock de foin en balles, avec projections">${svg}</svg>
    <div class="tip" id="cvtip" hidden></div>
    <div class="legende"><span><i class="l h"></i>Stock</span><span><i class="l a"></i>Années préc.</span><span><i class="l b"></i>Conso actuelle</span><span><i class="pt liv"></i>Livraison</span><span><i class="pt cpt"></i>Comptage</span></div>
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

function foin() {
  const f = S.foyer.foin || {}, cop = S.foyer.copeaux || {};
  const cs = comptages(S.foyer).reverse(), per = Object.fromEntries(periodes(S.foyer).map(p => [p.idFin, p]));
  const livs = liste(f.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const sorties = liste(f.sorties).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.ts || 0) - (a.ts || 0)).slice(0, 12);
  const livC = liste(cop.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const nomC = id => esc(S.foyer.contacts?.[id]?.nom || "");
  const lignesLiv = (l, a) => l.map(x => rangee({
    gauche: bulle(a === "livraison" ? "blé" : "sapin", "or"), a, id: x.id, titre: `${balles(+x.balles || 0)} <span class="date">${frCourt(x.date)}</span>`,
    sous: [x.poidsBalle ? `${x.poidsBalle} kg/balle (≈ ${Math.round(x.balles * x.poidsBalle)} kg)` : "", infoPrix(x), nomC(x.contactId), esc(x.note || "")].filter(Boolean).join(" · ")
  })).join("");
  return courbe() + graphique() + budget() +
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
    ${estAdmin() ? `<button class="btn sec plein" data-a="vue" data-v="admin">${ic("fer")} Administration</button>` : ""}
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
  fiche: id => { S.cheval = id; S.vue = "fiche"; window.scrollTo(0, 0); rendre(); },
  cheval(id) {
    const c = id ? S.foyer.chevaux[id] : { actif: true };
    let photo = c.photo || "";
    ouvrir(id ? "Modifier le cheval" : "Nouveau cheval",
      `<div class="photo-zone"><span id="phApercu">${avatarC(c, "grand")}</span><div class="photo-btns">
        <label class="btn sec petit-b" for="ph">${ic("photo")} Photo</label><input id="ph" type="file" accept="image/*" hidden>
        <button type="button" class="btn sec petit-b" id="phRetirer">Retirer</button></div></div>` +
      champ("n", "Nom", c.nom, "text", 'autocomplete="off"') +
      `<div class="duo">${champ("r", "Robe", c.robe)}${champ("na", "Naissance", c.naissance, "date")}</div>` +
      champ("si", "N° SIRE", c.sire, "text", 'autocapitalize="characters" autocomplete="off"') +
      `<label class="interrupteur"><input type="checkbox" id="ac" ${c.actif !== false ? "checked" : ""}><span class="rail"></span>Cheval actif</label>` +
      `<label for="no">Notes</label><textarea id="no" rows="3">${esc(c.notes)}</textarea>`,
      () => (!id && journaliser(`a ajouté le cheval ${val("n")}`, "cheval"), set(id ? base(`chevaux/${id}`) : push(base("chevaux")), { nom: val("n"), sire: val("si").toUpperCase(), robe: val("r"), naissance: val("na"), actif: $("#ac").checked, notes: val("no"), photo })),
      id && (() => update(ref(db, `foyers/${S.fid}`), Object.fromEntries([[`chevaux/${id}`, null], ...liste(S.foyer.soins).filter(s => s.chevalId === id).map(s => [`soins/${s.id}`, null])]))), ["n"]);
    $("#ph").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { photo = await reduire(f); $("#phApercu").innerHTML = avatarC({ nom: val("n") || c.nom, photo }, "grand"); } catch { toast("Photo illisible"); }
    };
    $("#phRetirer").onclick = () => { photo = ""; $("#phApercu").innerHTML = avatarC({ nom: val("n") || c.nom || "?", photo: "" }, "grand"); };
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
  sortieEdit(id) {
    const x = S.foyer.foin?.sorties?.[id]; if (!x) return;
    ouvrir("Corriger la sortie", qte("b", "Quantité retirée (balles)", fmtQte(+x.balles || 0), ["1/4", "1/3", "1/2", "2/3", "1", "2"]) + champ("d", "Date", x.date, "date"),
      () => (parseQte(val("b")) > 0 ? update(base(`foin/sorties/${id}`), { balles: parseQte(val("b")), date: val("d") || x.date }) : Promise.resolve()),
      () => { journaliser(`a supprimé une sortie de ${balles(+x.balles || 0)} (${frCourt(x.date)})`, "sortie"); return remove(base(`foin/sorties/${id}`)); }, ["b"]);
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
  soin(id, d) {
    const chev = liste(S.foyer.chevaux).filter(c => c.actif !== false || c.id === S.foyer.soins?.[id]?.chevalId).sort((x, y) => (x.nom || "").localeCompare(y.nom || ""));
    const s = id ? S.foyer.soins[id] : { type: "vaccin", n: TYPES.vaccin.n, unite: TYPES.vaccin.unite };
    ouvrir(id ? "Modifier le soin" : "Nouveau soin",
      `<label for="ch">Cheval</label><select id="ch">${id ? "" : '<option value="*">Tous les chevaux actifs</option>'}${options(chev, s.chevalId || d?.cheval)}</select>
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
    ouvrir("Réglages du stock", `<p class="petit">L'accueil passe en alerte quand il reste moins de jours de foin que le seuil. La commande conseillée vise à couvrir la période choisie.</p>` +
      champ("s", "Alerte quand il reste (jours)", f.seuilJours || 14, "number", 'min="1" inputmode="numeric"') +
      champ("cv", "Période à couvrir par une commande (jours)", f.couvertureJours || 90, "number", 'min="7" inputmode="numeric"'),
      () => update(base("foin"), { seuilJours: +val("s") || 14, couvertureJours: +val("cv") || 90 }));
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
  agenda: () => {
    const pad = n => String(n).padStart(2, "0"), auj = new Date(), st = `${auj.getUTCFullYear()}${pad(auj.getUTCMonth() + 1)}${pad(auj.getUTCDate())}T${pad(auj.getUTCHours())}${pad(auj.getUTCMinutes())}00Z`;
    const txt = t => String(t).replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
    const ev = soinsPrevus().filter(x => x.ech).map(x => {
      const d = x.ech.replace(/-/g, ""), fin = enChaine(jour(x.ech) + 1).replace(/-/g, "");
      return ["BEGIN:VEVENT", `UID:${x.id}@ecurie`, `DTSTAMP:${st}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${fin}`,
        `SUMMARY:${txt(libelleSoin(x) + " · " + S.foyer.chevaux[x.chevalId].nom)}`, "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Soin à prévoir", "TRIGGER:-P7D", "END:VALARM", "END:VEVENT"].join("\r\n");
    });
    if (!ev.length) return toast("Aucune échéance à exporter");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ecurie//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Écurie", ...ev, "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "ecurie-soins.ics"; document.body.append(a); a.click(); a.remove();
    toast(`${ev.length} échéances exportées`);
  },
  histo: (_id, d) => { S.hist = +d.h; rendre(); },
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
