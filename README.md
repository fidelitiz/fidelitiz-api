# API FIDELITIZ

API autonome de la démo mobile et du formulaire professionnel. Le site et la démo restent sur GitHub Pages ; cette API nécessite un environnement d'exécution avec une base D1 pour synchroniser les téléphones et enregistrer les demandes.

## Mise en service

1. Créer une base D1 `fidelitiz` dans le compte Cloudflare choisi.
2. Copier `wrangler.toml.example` vers `wrangler.toml` et renseigner l'identifiant réel de la base.
3. Installer les dépendances : `npm install`.
4. Appliquer les migrations : `npm run migrate:remote`.
5. Générer un mot de passe administrateur aléatoire de 192 bits dans un terminal privé avec `npm run hash:admin`. Conserver le mot de passe dans un gestionnaire et enregistrer uniquement sa dérivation SHA-256 salée dans le secret Cloudflare `ADMIN_PASSWORD_HASH`. Cette méthode rapide convient ici parce que le mot de passe imposé par le générateur est long et réellement aléatoire ; ne pas la remplacer par un mot de passe mémorisable. Ne jamais commiter le mot de passe ou sa dérivation.
6. Dans GitHub, configurer les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, puis la variable `D1_DATABASE_ID`. Le workflow GitHub Actions applique les migrations et déploie l'API à chaque changement de `main`.
7. Configurer les clients GitHub Pages avec l'URL publique de ce Worker, puis vérifier les opérations entre deux téléphones. Sur la page bêta, renseigner `data-api-url="https://<worker>"` sur `#contact-form` pour envoyer les demandes à D1.

Les codes de carte Camille et Julien et la session de démonstration existante sont conservés. Les demandes âgées de plus de 180 jours sont supprimées lors du dépôt d'une nouvelle demande. L'administration est accessible uniquement via l'URL directe `https://<worker>/admin/` (aucun lien public). Le mot de passe est vérifié côté Worker. Après connexion, la session est stockée sous forme de hash dans D1 et transmise par cookie `Secure`, `HttpOnly`, `SameSite=Strict`, valable deux heures. Cinq essais sont autorisés par adresse IP sur quinze minutes. La déconnexion invalide la session.

## Routes

- `POST /api/cards` : cartes, points, notifications, automatisations, avis et NFC.
- `POST /api/contact` : demande professionnelle avec SIREN, SIRET et informations d'établissement.
- `GET /admin/` : connexion ou tableau de bord privé des 100 dernières demandes.
- `POST /admin/login` et `POST /admin/logout` : session d'administration.

Ne jamais commiter `wrangler.toml`, `.dev.vars`, un mot de passe, une dérivation de mot de passe ou une donnée client réelle. GitHub Pages seul ne peut pas héberger cet espace privé ; tant que le Worker, D1 et le secret ne sont pas configurés, le formulaire conserve son envoi par messagerie et aucune demande n'apparaît dans l'administration.
