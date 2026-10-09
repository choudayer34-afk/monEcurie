// Worker « ecurie » : sert l'application (dossier public) et envoie les rappels par notification.
// Variables : VAPID_PUBLIC (variable), VAPID_PRIVATE et FIREBASE_SECRET (secrets) — jamais dans le code.
import { lancer, test } from "./rappels.js";

const json = (o, code = 200) => new Response(JSON.stringify(o), { status: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default {
  scheduled: (_e, env, ctx) => ctx.waitUntil(lancer(env)),
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/api/cle") return json({ cle: env.VAPID_PUBLIC || null });
    if (u.pathname === "/api/test" && req.method === "POST") { const { code, ...r } = await test(req, env); return json(r, code); }
    return env.ASSETS.fetch(req);
  }
};
