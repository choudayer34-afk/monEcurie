// Cloudflare Worker : rappel quotidien par e-mail quand le stock de foin passe sous le seuil.
// Variables à définir : FIREBASE_DB_URL, FIREBASE_SECRET (secret), RESEND_API_KEY (secret), EXPEDITEUR
import { prevision } from "./prevision.js";
const liste = o => Object.values(o || {});

function joursRestants(f, auj) {
  return prevision(f, auj)?.jours ?? null;
}

async function run(env) {
  const r = await fetch(`${env.FIREBASE_DB_URL}/foyers.json?auth=${env.FIREBASE_SECRET}`);
  const foyers = (await r.json()) || {};
  const auj = Math.floor(Date.now() / 864e5);
  for (const f of Object.values(foyers)) {
    const j = joursRestants(f, auj), seuil = +(f.foin?.seuilJours) || 14;
    if (j === null || j > seuil) continue;
    const dest = liste(f.membres).map(m => m.email).filter(Boolean);
    if (!dest.length) continue;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EXPEDITEUR, to: dest,
        subject: `Foin : il reste ${j} jour(s) de stock`,
        text: `Foyer « ${f.nom} » : le stock de foin sera épuisé dans ${j} jour(s). Pense à passer commande.`
      })
    });
  }
}

export default {
  scheduled: (_e, env, ctx) => ctx.waitUntil(run(env)),
  fetch: async (_r, env) => { await run(env); return new Response("ok"); }
};
