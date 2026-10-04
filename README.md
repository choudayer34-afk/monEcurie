# Écurie

Gestion des chevaux, du stock de foin et des contacts, partagée par foyer.

## Arborescence
- `public/` : application (PWA)
- `worker/` : rappels quotidiens par e-mail
- `database.rules.json` : règles Firebase à coller dans la console
- `wrangler.toml` : déploiement de l'application
- `.github/workflows/deploy.yml` : déploiement automatique à chaque modification de `main`

## Secrets GitHub requis
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `FIREBASE_SECRET`, `RESEND_API_KEY`
