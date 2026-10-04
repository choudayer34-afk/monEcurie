import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, remove, update, onValue }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { jour, enChaine, liste, comptages, periodes, prevision } from "./prevision.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const S = { user: null, fid: null, foyer: null, vue: "accueil" };

/* ---------- Dates et prévision ---------- */
const aujourdhui = () => { const d = new Date(); return jour(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); };
const fr = d => d ? d.split("-").reverse().join("/") : "";

const parseQte = t => {
  t = String(t ?? "").trim().replace(",", ".");
  const m = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (m) return (+m[1] || 0) + (+m[2]) / (+m[3]);
  const n = parseFloat(t); return isNaN(n) ? 0 : n;
};
const fmtQte = n => {
  const w = Math.floor(n + 1e-9), f = n - w;
  for (const [a, b] of [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]]) if (Math.abs(f - a / b) < 0.012) return (w ? w + " " : "") + a + "/" + b;
  return String(Math.round(n * 100) / 100);
};
const num = t => parseFloat(String(t ?? "").replace(",", ".")) || 0;
const arr = n => Math.round(n * 100) / 100;
const euro = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const infoPrix = l => `${l.prixBalle ? ` · ${euro(l.prixBalle)}/balle` : ""}${l.prixTotal ? ` · total ${euro(l.prixTotal)}` : ""}`;
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

/* ---------- Vues ---------- */
document.querySelectorAll("nav button").forEach(b => b.onclick = () => { S.vue = b.dataset.v; rendre(); });
const vues = { accueil, chevaux, foin, contacts, reglages };

function rendre() {
  if (!S.foyer) return;
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("actif", b.dataset.v === S.vue));
  $("#titre").textContent = { accueil: "Accueil", chevaux: "Chevaux", foin: "Stock", contacts: "Contacts", reglages: "Foyer" }[S.vue];
  $("#vue").innerHTML = vues[S.vue]();
}

function accueil() {
  const p = prevision(S.foyer, aujourdhui()), seuil = +(S.foyer.foin?.seuilJours) || 14;
  const nb = liste(S.foyer.chevaux).filter(c => c.actif !== false).length;
  let bloc;
  if (!p) bloc = `<p class="vide">Fais un premier comptage du foin dans l'onglet Stock.</p>`;
  else if (!p.historique) bloc = `<div class="grand">${fmtQte(p.stockAuj)} balles</div>
      <div class="petit">Stock au comptage du ${fr(p.last.date)}, livraisons comprises. La prévision apparaîtra après un second comptage.</div>`;
  else {
    const bas = p.jours !== null && p.jours <= seuil;
    bloc = `<div class="grand ${bas ? "alerte" : "ok"}">${p.jours === null ? "Plus de 4 ans" : p.jours + " jours"}</div>
      <div class="petit">Rupture prévue : ${p.rupture ? fr(p.rupture) : "aucune"} · Stock estimé : ${fmtQte(p.stockAuj)} balles</div>
      <div class="petit">Prévision d'après la consommation observée lors des comptages, mois par mois.</div>
      ${bas ? `<p class="alerte">Stock sous le seuil de ${seuil} jours : prévois une commande.</p>` : ""}`;
  }
  const sorties = liste(S.foyer.foin?.sorties).sort((x, y) => (y.ts || 0) - (x.ts || 0));
  const rapide = p ? `<div class="rapide">${[["1", "− 1"], ["1/2", "− 1/2"], ["1/3", "− 1/3"]].map(([q, t]) => `<button class="btn sec" data-a="retirer" data-q="${q}">${t}</button>`).join("")}
      <button class="btn sec" data-a="retirer" data-q="autre">− …</button><button class="btn" data-a="inventaire">Comptage</button></div>
      ${sorties[0] ? `<div class="petit" style="margin-top:8px">Dernière sortie : ${fmtQte(+sorties[0].balles || 0)} le ${fr(sorties[0].date)} · <a href="#" data-a="annulerSortie" data-id="${sorties[0].id}">annuler</a>${p.sorties ? ` · ${fmtQte(p.sorties)} balles sorties depuis le comptage` : ""}</div>` : ""}` : "";
  return `<div class="carte"><h2>Foin</h2>${bloc}${rapide}</div>
    <div class="carte ligne"><span>Chevaux actifs</span><b>${nb}</b></div>`;
}

function chevaux() {
  const l = liste(S.foyer.chevaux).sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  return `<div class="ligne" style="margin-bottom:10px"><h2>Chevaux</h2><button class="btn" data-a="cheval">+ Ajouter</button></div>` +
    (l.map(c => `<div class="carte ligne" data-a="cheval" data-id="${c.id}"><div><b>${esc(c.nom)}</b> ${c.actif === false ? '<span class="petit">(inactif)</span>' : ""}
      <div class="petit">${esc(c.robe || "")} ${c.naissance ? "· né le " + fr(c.naissance) : ""} ${c.sire ? " · SIRE " + esc(c.sire) : ""}</div></div><span>›</span></div>`).join("") || `<p class="vide">Aucun cheval.</p>`);
}

function foin() {
  const f = S.foyer.foin || {}, cop = S.foyer.copeaux || {};
  const cs = comptages(S.foyer).reverse(), per = Object.fromEntries(periodes(S.foyer).map(p => [p.idFin, p]));
  const livs = liste(f.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const livC = liste(cop.livraisons).sort((a, b) => b.date.localeCompare(a.date));
  const nomC = id => S.foyer.contacts?.[id]?.nom || "";
  return `<div class="ligne" style="margin-bottom:10px"><h2>Comptages du foin</h2><div><button class="btn sec" data-a="params">Alerte</button> <button class="btn" data-a="inventaire">+ Comptage</button></div></div>` +
    (cs.map(c => { const p = per[c.id]; return `<div class="carte ligne" data-a="inventaire" data-id="${c.id}"><div><b>${fmtQte(+c.balles || 0)} balles</b> · ${fr(c.date)}
      <div class="petit">${p ? p.conso < 0 ? `<span class="alerte">Incohérent depuis le ${fr(p.du)} : livraison oubliée ?</span>` : `Depuis le ${fr(p.du)} : ${fmtQte(Math.round(p.conso * 100) / 100)} balles consommées (${fmtQte(Math.round(p.rate * 100) / 100)}/jour sur ${p.jours} jours)` : "Premier comptage"}</div></div><span>›</span></div>`; }).join("") || `<p class="vide">Aucun comptage. Tu peux saisir des comptages des années passées pour la prévision.</p>`) +
    `<div class="ligne" style="margin:18px 0 10px"><h2>Livraisons de foin</h2><button class="btn" data-a="livraison">+ Livraison</button></div>` +
    (livs.map(l => `<div class="carte ligne" data-a="livraison" data-id="${l.id}"><div><b>${fmtQte(+l.balles || 0)} balles</b> · ${fr(l.date)}
      <div class="petit">${l.poidsBalle ? `${l.poidsBalle} kg/balle (≈ ${Math.round(l.balles * l.poidsBalle)} kg)` : ""}${infoPrix(l)} ${esc(nomC(l.contactId))} ${esc(l.note || "")}</div></div><span>›</span></div>`).join("") || `<p class="vide">Aucune livraison.</p>`) +
    `<div class="carte" style="margin-top:18px"><h2>Copeaux de bois</h2>
      <div class="petit">Dernier comptage : ${cop.inventaire ? `${fmtQte(cop.inventaire.balles)} balles le ${fr(cop.inventaire.date)}` : "aucun"}</div>
      <div class="actions"><button class="btn sec" data-a="inventaireCopeaux">Comptage</button><button class="btn" data-a="livraisonCopeaux">+ Livraison</button></div></div>` +
    livC.map(l => `<div class="carte ligne" data-a="livraisonCopeaux" data-id="${l.id}"><div><b>${fmtQte(+l.balles || 0)} balles</b> · ${fr(l.date)}
      <div class="petit">${infoPrix(l).replace(/^ · /, "")} ${esc(nomC(l.contactId))} ${esc(l.note || "")}</div></div><span>›</span></div>`).join("");
}

function contacts() {
  const l = liste(S.foyer.contacts).sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  return `<div class="ligne" style="margin-bottom:10px"><h2>Contacts</h2><button class="btn" data-a="contact">+ Ajouter</button></div>` +
    (l.map(c => `<div class="carte"><div class="ligne"><div><b>${esc(c.nom)}</b> <span class="petit">${esc(c.role || "")}</span></div>
      <button class="btn sec" data-a="contact" data-id="${c.id}">Modifier</button></div>
      <div class="petit">${c.tel ? `<a href="tel:${esc(c.tel)}">${esc(c.tel)}</a>` : ""} ${c.email ? `· <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}</div>
      ${c.adresse ? `<div class="petit"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.adresse)}" target="_blank" rel="noopener">${esc(c.adresse)}</a></div>` : ""}
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

const prixChamps = l => champ("pb", "Prix par balle (€)", l.prixBalle || "", "text", 'inputmode="decimal"') +
  champ("pt", "Prix total (€)", l.prixTotal || "", "text", 'inputmode="decimal"') +
  `<p class="petit">Renseigne l'un des deux : l'autre se calcule.</p>`;
function lierPrix(dernier) {
  const b = $("#b"), pb = $("#pb"), pt = $("#pt"), q = () => parseQte(b.value);
  pb.oninput = () => { dernier = "pb"; pt.value = pb.value.trim() && q() ? arr(num(pb.value) * q()) : ""; };
  pt.oninput = () => { dernier = "pt"; pb.value = pt.value.trim() && q() ? arr(num(pt.value) / q()) : ""; };
  b.oninput = () => {
    if (dernier === "pt" && pt.value.trim()) pb.value = q() ? arr(num(pt.value) / q()) : "";
    else if (pb.value.trim()) pt.value = q() ? arr(num(pb.value) * q()) : "";
  };
}
const actions = {
  cheval(id) {
    const c = id ? S.foyer.chevaux[id] : { actif: true };
    ouvrir(id ? "Modifier le cheval" : "Nouveau cheval",
      champ("n", "Nom", c.nom) + champ("si", "N° SIRE", c.sire, "text", 'autocapitalize="characters"') + champ("r", "Robe", c.robe) + champ("na", "Date de naissance", c.naissance, "date") +
            `<label>Statut</label><select id="ac"><option value="1" ${c.actif !== false ? "selected" : ""}>Actif</option><option value="0" ${c.actif === false ? "selected" : ""}>Inactif</option></select>` +
      `<label>Notes</label><textarea id="no">${esc(c.notes)}</textarea>`,
      () => set(id ? base(`chevaux/${id}`) : push(base("chevaux")), { nom: val("n"), sire: val("si").toUpperCase(), robe: val("r"), naissance: val("na"), actif: val("ac") === "1", notes: val("no") }),
      id && (() => remove(base(`chevaux/${id}`))));
  },
  contact(id) {
    const c = id ? S.foyer.contacts[id] : {};
    ouvrir(id ? "Modifier le contact" : "Nouveau contact",
      champ("n", "Nom", c.nom) +
      `<label>Rôle</label><select id="ro">${["Fournisseur de foin", "Vétérinaire", "Maréchal-ferrant", "Autre"].map(r => `<option ${c.role === r ? "selected" : ""}>${r}</option>`).join("")}</select>` +
      champ("t", "Téléphone", c.tel, "tel") + champ("e", "E-mail", c.email, "email") + champ("ad", "Adresse", c.adresse, "text", 'autocomplete="street-address"') + `<label>Notes</label><textarea id="no">${esc(c.notes)}</textarea>`,
      () => set(id ? base(`contacts/${id}`) : push(base("contacts")), { nom: val("n"), role: val("ro"), tel: val("t"), email: val("e"), adresse: val("ad"), notes: val("no") }),
      id && (() => remove(base(`contacts/${id}`))));
  },
  livraison(id) {
    const l = id ? S.foyer.foin.livraisons[id] : { date: ajd() };
    const four = liste(S.foyer.contacts).map(c => `<option value="${c.id}" ${l.contactId === c.id ? "selected" : ""}>${esc(c.nom)}</option>`).join("");
    ouvrir(id ? "Modifier la livraison" : "Nouvelle livraison",
      champ("d", "Date", l.date, "date") + champ("b", "Nombre de balles (ex. 40 ou 12 1/2)", l.balles === undefined ? "" : fmtQte(l.balles), "text", 'inputmode="decimal"') +
      champ("p", "Poids moyen d'une balle (kg, facultatif)", l.poidsBalle, "number", 'min="0" step="0.5"') + prixChamps(l) +
      `<label>Fournisseur</label><select id="c"><option value="">—</option>${four}</select>` + champ("no", "Note", l.note),
      () => set(id ? base(`foin/livraisons/${id}`) : push(base("foin/livraisons")), { date: val("d"), balles: parseQte(val("b")), poidsBalle: +val("p") || 0, prixBalle: num(val("pb")), prixTotal: num(val("pt")), contactId: val("c"), note: val("no") }),
      id && (() => remove(base(`foin/livraisons/${id}`))));
    lierPrix(l.prixTotal ? "pt" : "pb");
  },
  retirer(_id, d) {
    const noter = async q => { if (q > 0) await set(push(base("foin/sorties")), { date: ajd(), balles: q, ts: Date.now() }); };
    if (d?.q && d.q !== "autre") return noter(parseQte(d.q));
    ouvrir("Retirer du stock", champ("b", "Quantité retirée (ex. 1/3 ou 2)", "", "text", 'inputmode="decimal"') + champ("d", "Date", ajd(), "date"),
      () => { const q = parseQte(val("b")); return q > 0 ? set(push(base("foin/sorties")), { date: val("d") || ajd(), balles: q, ts: Date.now() }) : null; });
  },
  annulerSortie: id => remove(base(`foin/sorties/${id}`)),
  inventaire(id) {
    const i = id ? comptages(S.foyer).find(x => x.id === id) : { date: ajd() };
    const chemin = id === "legacy" ? "foin/inventaire" : `foin/inventaires/${id}`;
    ouvrir(id ? "Modifier le comptage" : "Comptage du foin", champ("d", "Date du comptage", i.date, "date") + champ("b", "Balles comptées (ex. 25 ou 12 1/3)", i.balles === undefined ? "" : fmtQte(i.balles), "text", 'inputmode="decimal"'),
      () => set(id ? base(chemin) : push(base("foin/inventaires")), { date: val("d"), balles: parseQte(val("b")) }),
      id && (() => remove(base(chemin))));
  },
  params() {
    const f = S.foyer.foin || {};
    ouvrir("Alerte de stock", champ("s", "Alerte quand il reste (jours)", f.seuilJours || 14, "number", 'min="1"'),
      () => update(base("foin"), { seuilJours: +val("s") || 14 }));
  },
  inventaireCopeaux() {
    const i = S.foyer.copeaux?.inventaire || { date: ajd() };
    ouvrir("Comptage des copeaux", champ("d", "Date du comptage", i.date, "date") + champ("b", "Balles comptées", i.balles === undefined ? "" : fmtQte(i.balles), "text", 'inputmode="decimal"'),
      () => set(base("copeaux/inventaire"), { date: val("d"), balles: parseQte(val("b")) }));
  },
  livraisonCopeaux(id) {
    const l = id ? S.foyer.copeaux.livraisons[id] : { date: ajd() };
    const four = liste(S.foyer.contacts).map(c => `<option value="${c.id}" ${l.contactId === c.id ? "selected" : ""}>${esc(c.nom)}</option>`).join("");
    ouvrir(id ? "Modifier la livraison" : "Livraison de copeaux",
      champ("d", "Date", l.date, "date") + champ("b", "Nombre de balles", l.balles === undefined ? "" : fmtQte(l.balles), "text", 'inputmode="decimal"') + prixChamps(l) +
      `<label>Fournisseur</label><select id="c"><option value="">—</option>${four}</select>` + champ("no", "Note", l.note),
      () => set(id ? base(`copeaux/livraisons/${id}`) : push(base("copeaux/livraisons")), { date: val("d"), balles: parseQte(val("b")), prixBalle: num(val("pb")), prixTotal: num(val("pt")), contactId: val("c"), note: val("no") }),
      id && (() => remove(base(`copeaux/livraisons/${id}`))));
    lierPrix(l.prixTotal ? "pt" : "pb");
  },
  sortie: () => signOut(auth).then(() => location.reload())
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]");
  if (!el || !S.foyer) return;
  e.stopPropagation(); e.preventDefault();
  actions[el.dataset.a]?.(el.dataset.id, el.dataset);
});
