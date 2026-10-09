// Envoi de notifications « Web Push » (RFC 8291 pour le chiffrement, RFC 8292 pour l'identification VAPID).
// Uniquement des fonctions Web Crypto : aucune dépendance.
export const b64u = {
  enc: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - (s.length % 4)) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
};
const texte = s => new TextEncoder().encode(s);
const coller = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };

async function hkdf(sel, matiere, info, longueur) {
  const k = await crypto.subtle.importKey("raw", matiere, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: sel, info }, k, longueur * 8));
}

export async function chiffrer(clair, p256dh, auth) {
  const ua = b64u.dec(p256dh), secretAuth = b64u.dec(auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pubServeur = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const cleUa = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const partage = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: cleUa }, eph.privateKey, 256));
  const prk = await hkdf(secretAuth, partage, coller(texte("WebPush: info\0"), ua, pubServeur), 32);
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sel, prk, texte("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sel, prk, texte("Content-Encoding: nonce\0"), 12);
  const cle = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cle, coller(texte(clair), new Uint8Array([2]))));
  const entete = coller(sel, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([pubServeur.length]), pubServeur);
  return coller(entete, chiffre);
}

async function jetonVapid(endpoint, env) {
  const pub = b64u.dec(env.VAPID_PUBLIC);
  const cle = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), d: env.VAPID_PRIVATE, ext: true },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const corps = b64u.enc(texte(JSON.stringify({ typ: "JWT", alg: "ES256" }))) + "." + b64u.enc(texte(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || "https://github.com/choudayer34-afk/monEcurie"
  })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cle, texte(corps));
  return `${corps}.${b64u.enc(sig)}`;
}

// Renvoie le code HTTP du service de notification (404 ou 410 : l'appareil n'existe plus)
export async function envoyer(abonnement, message, env) {
  const corps = await chiffrer(JSON.stringify(message), abonnement.keys.p256dh, abonnement.keys.auth);
  const r = await fetch(abonnement.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "43200", Urgency: "normal",
      Authorization: `vapid t=${await jetonVapid(abonnement.endpoint, env)}, k=${env.VAPID_PUBLIC}`
    },
    body: corps
  });
  return r.status;
}
