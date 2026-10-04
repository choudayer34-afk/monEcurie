import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, remove, update, onValue }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const S = { user: null, fid: null, foyer: null, vue: "accueil" };

/* ---------- Dates et prévision ---------- */
const jour = d => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);
const enChaine = n => new Date(n * 864e5).toISOString().slice(0, 10);
const aujourdhui = () => { const d = new Date(); return jour(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); };
const fr = d => d ? d.split("-").reverse().join("/") : "";
const liste = o => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));

function consoBallesJour(f) {
  const kg = liste(f.chevaux).filter(c => c.actif !== false).reduce((s, c) => s + (+c.foinKgJour || 0), 0);
  return kg / (+(f.foin?.kgBalle) || 1);
}
export function prevision(f) {
  const inv = f.foin?.inventaire, conso = consoBallesJour(f);
  if (!inv?.date || !(conso > 0)) return null;
  const livs = {};
  liste(f.foin.livraisons).forEach(l => { const j = jour(l.date); livs[j] = (livs[j] || 0) + (+l.balles || 0); });
  const auj = aujourdhui();
  let stock = +inv.balles || 0, j = jour(inv.date), stockAuj = j >= auj ? stock : null, rupture = null;
  for (let i = 0; i < 1500; i++) {
    j++;
    stock += (livs[j] || 0) - conso;
    if (stock < 0) { rupture = j; stock = 0; if (stockAuj === null) stockAuj = 0; break; }
    if (j === auj) stockAuj = stock;
  }
  if (stockAuj === null) stockAuj = stock;
  return { conso, stockAuj, rupture: rupture && enChaine(rupture), jours: rupture ? Math.max(0, rupture - auj) : null };
}

/* ---------- Authentification et foyer ---------- */
onAuthStateChanged(auth, async u => {
  S.user = u;
  if (!u) return ecranConnexion();
  const r = await get(ref(db, `users/${u.uid}/foyerId`));
  if (!r.exists()) return ecranFoyer();
  S.fid = r.val();
  onValue(ref(db, `foyers/${S.fid}`), snap => { S.foyer = snap.val() || {}; $("#nav").hidden = false; $("#foyerNom").textContent = S.foyer.nom || ""; rendre(); },
    () => { $("#vue").innerHTML = `<div class="carte alerte">Accès au foyer refusé.</div>`; });
});

function ecranConnexion() {
  $("#nav").hidden = true;
  $("#vue").innerHTML = `<div class="carte"><h2>Connexion</h2>
    <label>E-mail</label><input id="em" type="email" autocomplete="email">
    <label>Mot de passe</label><input id="mp" type="password" autocomplete="current-password">
    <p id="err" class="alerte petit"></p>
    <div class="actions"><button class="btn sec" id="cree">Créer un compte</button><button class="btn" id="ent">Se connecter</button></div></div>`;
  const go = fn => async () => { try { await fn(auth, $("#em").value.trim(), $("#mp").value); } catch (e) { $("#err").textContent = "Échec : " + e.code; } };
  $("#ent").onclick = go(signInWithEmailAndPassword);
  $("#cree").onclick = go(createUserWithEmailAndPassword);
}

function ecranFoyer() {
  $("#nav").hidden = true;
  $("#vue").innerHTML = `<div class="carte"><h2>Créer le foyer</h2>
      <label>Nom du foyer</label><input id="fn" placeholder="Famille …"><div class="actions"><button class="btn" id="cf">Créer</button></div></div>
    <div class="carte"><h2>Rejoindre un foyer</h2>
      <label>Code d'invitation</label><input id="cd" maxlength="6" style="text-transform:uppercase">
      <p id="err" class="alerte petit"></p><div class="actions"><button class="btn" id="rf">Rejoindre</button></div></div>`;
  $("#cf").onclick = async () => {
    const nom = $("#fn").value.trim(); if (!nom) return;
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    const fid = push(ref(db, "foyers")).key;
    await set(ref(db, `codes/${code}`), fid);
    await set(ref(db, `foyers/${fid}`), { nom, code, membres: { [S.user.uid]: { code, email: S.user.email } }, foin: { kgBalle: 15, seuilJours: 14 } });
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

/* ---------- Vues ---------- */
document.querySelectorAll("nav button").forEach(b => b.onclick = () => { S.vue = b.dataset.v; rendre(); });
const vues = { accueil, chevaux, foin, contacts, reglages };

function rendre() {
  if (!S.foyer) return;
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("actif", b.dataset.v === S.vue));
  $("#vue").innerHTML = vues[S.vue]();
}

function accueil() {
  const p = prevision(S.foyer), seuil = +(S.foyer.foin?.seuilJours) || 14;
  const nb = liste(S.foyer.chevaux).filter(c => c.actif !== false).length;
  let bloc;
  if (!p) bloc = `<p class="vide">Renseigne un inventaire de foin et la ration de tes chevaux pour obtenir la prévision.</p>`;
  else {
    const bas = p.jours !== null && p.jours <= seuil;
    bloc = `<div class="grand ${bas ? "alerte" : "ok"}">${p.jours === null ? "Plus de 4 ans" : p.jours + " jours"}</div>
      <div class="petit">Rupture prévue : ${p.rupture ? fr(p.rupture) : "aucune"} · Stock estimé : ${p.stockAuj.toFixed(1)} balles · Consommation : ${p.conso.toFixed(2)} balle/jour</div>
      ${bas ? `<p class="alerte">Stock sous le seuil de ${seuil} jours : prévois une commande.</p>` : ""}`;
  }
  return `<div class="carte"><h2>Foin restant</h2>${bloc}</div>
    <div class="carte ligne"><span>Chevaux actifs</span><b>${nb}</b></div>`;
}

function chevaux() {
  const l = liste(S.foyer.chevaux).sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  return `<div class="ligne" style="margin-bottom:10px"><h2>Chevaux</h2><button class="btn" data-a="cheval">+ Ajouter</button></div>` +
    (l.map(c => `<div class="carte ligne" data-a="cheval" data-id="${c.id}"><div><b>${esc(c.nom)}</b> ${c.actif === false ? '<span class="petit">(inactif)</span>' : ""}
      <div class="petit">${esc(c.robe || "")} ${c.naissance ? "· né le " + fr(c.naissance) : ""} · ${+c.foinKgJour || 0} kg de foin/jour</div></div><span>›</span></div>`).join("") || `<p class="vide">Aucun cheval.</p>`);
}

function foin() {
  const f = S.foyer.foin || {}, inv = f.inventaire;
  const livs = liste(f.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const nomC = id => S.foyer.contacts?.[id]?.nom || "";
  return `<div class="carte"><h2>Paramètres</h2>
      <div class="petit">Poids d'une balle : ${f.kgBalle || 15} kg · Alerte à ${f.seuilJours || 14} jours</div>
      <div class="petit">Dernier inventaire : ${inv ? `${inv.balles} balles le ${fr(inv.date)}` : "aucun"}</div>
      <div class="actions"><button class="btn sec" data-a="params">Paramètres</button><button class="btn" data-a="inventaire">Inventaire</button></div></div>
    <div class="ligne" style="margin-bottom:10px"><h2>Livraisons</h2><button class="btn" data-a="livraison">+ Livraison</button></div>` +
    (livs.map(l => `<div class="carte ligne" data-a="livraison" data-id="${l.id}"><div><b>${l.balles} balles</b> · ${fr(l.date)}
      <div class="petit">${esc(nomC(l.contactId))} ${esc(l.note || "")}</div></div><span>›</span></div>`).join("") || `<p class="vide">Aucune livraison.</p>`);
}

function contacts() {
  const l = liste(S.foyer.contacts).sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  return `<div class="ligne" style="margin-bottom:10px"><h2>Contacts</h2><button class="btn" data-a="contact">+ Ajouter</button></div>` +
    (l.map(c => `<div class="carte"><div class="ligne"><div><b>${esc(c.nom)}</b> <span class="petit">${esc(c.role || "")}</span></div>
      <button class="btn sec" data-a="contact" data-id="${c.id}">Modifier</button></div>
      <div class="petit">${c.tel ? `<a href="tel:${esc(c.tel)}">${esc(c.tel)}</a>` : ""} ${c.email ? `· <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}</div>
      ${c.notes ? `<div class="petit">${esc(c.notes)}</div>` : ""}</div>`).join("") || `<p class="vide">Aucun contact (fournisseur de foin, vétérinaire, maréchal…).</p>`);
}

function reglages() {
  const m = liste(S.foyer.membres);
  return `<div class="carte"><h2>Foyer « ${esc(S.foyer.nom)} »</h2>
      <div class="petit">Code d'invitation à partager :</div><div class="grand">${esc(S.foyer.code)}</div></div>
    <div class="carte"><h2>Membres</h2>${m.map(x => `<div class="petit">${esc(x.email)}</div>`).join("")}</div>
    <div class="actions"><button class="btn sec" data-a="sortie">Se déconnecter</button></div>`;
}

/* ---------- Formulaires ---------- */
const champ = (id, lib, val = "", type = "text", extra = "") => `<label>${lib}</label><input id="${id}" type="${type}" value="${esc(val)}" ${extra}>`;
const val = id => $("#" + id).value.trim();
function ouvrir(titre, corps, onOk, onSup) {
  const d = $("#dlg");
  d.innerHTML = `<h2>${titre}</h2>${corps}<div class="actions">${onSup ? '<button class="btn danger" id="sup">Supprimer</button>' : ""}<button class="btn sec" id="ann">Annuler</button><button class="btn" id="ok">Enregistrer</button></div>`;
  $("#ann").onclick = () => d.close();
  $("#ok").onclick = async () => { await onOk(); d.close(); };
  if (onSup) $("#sup").onclick = async () => { if (confirm("Supprimer définitivement ?")) { await onSup(); d.close(); } };
  d.showModal();
}
const base = p => ref(db, `foyers/${S.fid}/${p}`);
const ajd = () => enChaine(aujourdhui());

const actions = {
  cheval(id) {
    const c = id ? S.foyer.chevaux[id] : { actif: true, foinKgJour: 8 };
    ouvrir(id ? "Modifier le cheval" : "Nouveau cheval",
      champ("n", "Nom", c.nom) + champ("r", "Robe", c.robe) + champ("na", "Date de naissance", c.naissance, "date") +
      champ("k", "Foin par jour (kg)", c.foinKgJour, "number", 'step="0.5" min="0"') +
      `<label>Statut</label><select id="ac"><option value="1" ${c.actif !== false ? "selected" : ""}>Actif</option><option value="0" ${c.actif === false ? "selected" : ""}>Inactif</option></select>` +
      `<label>Notes</label><textarea id="no">${esc(c.notes)}</textarea>`,
      () => set(id ? base(`chevaux/${id}`) : push(base("chevaux")), { nom: val("n"), robe: val("r"), naissance: val("na"), foinKgJour: +val("k") || 0, actif: val("ac") === "1", notes: val("no") }),
      id && (() => remove(base(`chevaux/${id}`))));
  },
  contact(id) {
    const c = id ? S.foyer.contacts[id] : {};
    ouvrir(id ? "Modifier le contact" : "Nouveau contact",
      champ("n", "Nom", c.nom) +
      `<label>Rôle</label><select id="ro">${["Fournisseur de foin", "Vétérinaire", "Maréchal-ferrant", "Autre"].map(r => `<option ${c.role === r ? "selected" : ""}>${r}</option>`).join("")}</select>` +
      champ("t", "Téléphone", c.tel, "tel") + champ("e", "E-mail", c.email, "email") + `<label>Notes</label><textarea id="no">${esc(c.notes)}</textarea>`,
      () => set(id ? base(`contacts/${id}`) : push(base("contacts")), { nom: val("n"), role: val("ro"), tel: val("t"), email: val("e"), notes: val("no") }),
      id && (() => remove(base(`contacts/${id}`))));
  },
  livraison(id) {
    const l = id ? S.foyer.foin.livraisons[id] : { date: ajd() };
    const four = liste(S.foyer.contacts).map(c => `<option value="${c.id}" ${l.contactId === c.id ? "selected" : ""}>${esc(c.nom)}</option>`).join("");
    ouvrir(id ? "Modifier la livraison" : "Nouvelle livraison",
      champ("d", "Date", l.date, "date") + champ("b", "Nombre de balles", l.balles, "number", 'min="0" step="1"') +
      `<label>Fournisseur</label><select id="c"><option value="">—</option>${four}</select>` + champ("no", "Note", l.note),
      () => set(id ? base(`foin/livraisons/${id}`) : push(base("foin/livraisons")), { date: val("d"), balles: +val("b") || 0, contactId: val("c"), note: val("no") }),
      id && (() => remove(base(`foin/livraisons/${id}`))));
  },
  inventaire() {
    const i = S.foyer.foin?.inventaire || { date: ajd() };
    ouvrir("Inventaire du stock", champ("d", "Date du comptage", i.date, "date") + champ("b", "Balles comptées", i.balles, "number", 'min="0" step="1"'),
      () => set(base("foin/inventaire"), { date: val("d"), balles: +val("b") || 0 }));
  },
  params() {
    const f = S.foyer.foin || {};
    ouvrir("Paramètres du foin", champ("k", "Poids d'une balle (kg)", f.kgBalle || 15, "number", 'min="1"') + champ("s", "Alerte quand il reste (jours)", f.seuilJours || 14, "number", 'min="1"'),
      () => update(base("foin"), { kgBalle: +val("k") || 15, seuilJours: +val("s") || 14 }));
  },
  sortie: () => signOut(auth).then(() => location.reload())
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]");
  if (!el || !S.foyer) return;
  e.stopPropagation();
  actions[el.dataset.a]?.(el.dataset.id);
});
