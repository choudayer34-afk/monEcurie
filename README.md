# Écurie

Application web (PWA) familiale : animaux, soins, stocks (foin et autres), routine, contacts, activité avec annulation.

## Organisation
- `public/` : l'application (sans étape de construction).
- `worker/` : serveur Cloudflare qui sert l'application et envoie les rappels par notification (chaque heure, à l'heure choisie par chaque appareil).
- `wrangler.toml` : configuration du Worker « ecurie ».
- `database.rules.json` : règles de sécurité Firebase Realtime Database.

## Notifications : mise en place (une seule fois)
1. Dans l'application, Foyer > Administration > « Générer une paire de clés ».
2. Cloudflare > Workers > ecurie > Paramètres > Variables et secrets :
   - variable `VAPID_PUBLIC` : clé publique ;
   - secret `VAPID_PRIVATE` : clé privée ;
   - secret `FIREBASE_SECRET` : secret de base de données Firebase (Paramètres du projet > Comptes de service > Secrets de la base de données).
3. Sur chaque appareil : Foyer > Notifications > « Activer sur cet appareil » (sur iPhone, l'application doit être installée sur l'écran d'accueil), ou « Recevoir avec ntfy » (application ntfy, sans clé à configurer). Un mode d'emploi figure dans l'application.

Aucune clé ni aucun secret ne doit figurer dans les fichiers du dépôt.
