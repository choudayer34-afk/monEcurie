// Worker « ecurie » : sert l'application (dossier public) et envoie les rappels par notification.
// Variables : VAPID_PUBLIC (variable), VAPID_PRIVATE et FIREBASE_SECRET (secrets) — jamais dans le code.
import { lancer, test } from "./rappels.js";

const json = (o, code = 200) => new Response(JSON.stringify(o), { status: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default {
  scheduled: (_e, env, ctx) => ctx.waitUntil(lancer(env)),
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/api/cle") return json({ cle: env.VAPID_PUBLIC || null });
    if (u.pathname === "/api/test" && req.method === "POST") {
      if (!env.FIREBASE_SECRET) return json({ erreur: "Le secret FIREBASE_SECRET est absent de Cloudflare (Paramètres, Variables et secrets)" }, 503);
      try { const { code, ...r } = await test(req, env); return json(r, code); }
      catch (e) {
        const m = String(e?.message || e);
        return json({ erreur: /Firebase (401|403)/.test(m) ? "Accès à la base refusé : le secret FIREBASE_SECRET de Cloudflare est périmé ou incorrect" : `Erreur du serveur : ${m.slice(0, 120)}` }, 503);
      }
    }
    return env.ASSETS.fetch(req);
  }
};
