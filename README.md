# API FIDELITIZ

API autonome de la démo mobile et du formulaire professionnel. Le site et la démo restent sur GitHub Pages ; cette API nécessite un environnement d'exécution avec une base D1 pour synchroniser les téléphones et enregistrer les demandes.

## Mise en service

1. Créer une base D1 `fidelitiz` dans le compte Cloudflare choisi.
2. Copier `wrangler.toml.example` vers `wrangler.toml` et renseigner l'identifiant réel de la base.
3. Installer les dépendances : `npm install`.
4. Appliquer les migrations : `npm run migrate:remote`.
5. Ajouter un secret `ADMIN_TOKEN` avec `wrangler secret put ADMIN_TOKEN`.
6. Dans GitHub, configurer les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, puis la variable `D1_DATABASE_ID`. Le workflow GitHub Actions applique les migrations et déploie l'API à chaque changement de `main`.
7. Configurer les clients GitHub Pages avec l'URL publique de ce Worker, puis vérifier les opérations entre deux téléphones.

Les codes de carte Camille et Julien et la session de démonstration existante sont conservés. Les demandes âgées de plus de 180 jours sont supprimées lors du dépôt d'une nouvelle demande. La lecture des demandes nécessite l'en-tête `Authorization: Bearer <ADMIN_TOKEN>` sur `GET /api/contact`.

## Routes

- `POST /api/cards` : cartes, points, notifications, automatisations, avis et NFC.
- `POST /api/contact` : demande professionnelle avec SIREN, SIRET et informations d'établissement.
- `GET /api/contact` : consultation protégée des demandes.

Ne jamais commiter `wrangler.toml`, `.dev.vars`, un jeton d'administration ou une donnée client réelle.
