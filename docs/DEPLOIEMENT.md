# Déployer FactureCI (Neon + GitHub + Vercel)

Tout se fait avec les plans gratuits. Comptez 20 à 30 minutes. Vous aurez besoin d'un ordinateur pour l'étape 5.

## 1. Créer la base de données sur Neon

1. Créez un compte sur [neon.tech](https://neon.tech), puis **Create project** : nom `factureci`, région la plus proche (Europe, par exemple Francfort).
2. Sur le tableau de bord du projet, cliquez sur **Connect**, choisissez la base `neondb` et le rôle par défaut.
3. Activez **Connection pooling** et copiez la chaîne de connexion complète. Elle ressemble à `postgresql://utilisateur:motdepasse@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
4. Gardez-la de côté : c'est votre `DATABASE_URL`. **Ne la partagez jamais** (ni dans le code, ni dans une discussion).

## 2. Pousser le code sur GitHub

Le dépôt est déjà sur GitHub. Pour déployer, fusionnez la branche de travail dans `main` (Pull request, puis **Merge**). Vercel déploiera `main`.

## 3. Importer le dépôt dans Vercel

1. Sur [vercel.com](https://vercel.com), **Add New… → Project**, puis choisissez le dépôt `facturation` (autorisez l'application GitHub de Vercel si demandé).
2. Framework : **Next.js** (détecté automatiquement). Ne changez ni la commande de build ni le dossier de sortie.
3. **Ne cliquez pas encore sur Deploy** : ajoutez d'abord les variables (étape 4).

## 4. Renseigner les variables d'environnement

Dans l'écran d'import (ou plus tard : **Settings → Environment Variables**), ajoutez, pour *Production* :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | la chaîne Neon de l'étape 1 |
| `AUTH_SECRET` | une longue valeur aléatoire : `openssl rand -base64 33` (ou `npx auth secret`) |
| `AUTH_TRUST_HOST` | `true` |
| `ADMIN_PHONES` | vos numéros admin séparés par des virgules, ex. `0700000000,0500000000` |
| `ALLOW_SIGNUP` | facultatif : `yes` ouvre l'inscription à tous (sinon seuls les numéros de `ADMIN_PHONES` peuvent s'inscrire) |
| `SEED_COMPANY` | facultatif : profil société préremplie (JSON, voir `.env.example`) |
| `APP_URL` | l'adresse du site, ex. `https://factureci.vercel.app` (sans `/` final) |

Puis cliquez sur **Deploy**. Le premier déploiement réussit mais l'application ne fonctionnera qu'après l'étape 5 (les tables n'existent pas encore).

> Les clés ne sont jamais dans le code : l'application ne lit que ces variables côté serveur.

## 5. Lancer les migrations (créer les tables)

Sur votre ordinateur, dans le dossier du projet :

```bash
git clone <adresse-de-votre-dépôt>
cd <dossier-du-projet>
npm install
```

Créez un fichier `.env.local` avec **uniquement** la ligne `DATABASE_URL="…"` (la même que sur Vercel), puis :

```bash
npm run db:migrate
```

Vous devez voir « Migrations appliquées. ». À refaire à chaque nouvelle version qui ajoute une migration (dossier `drizzle/`).

## 6. Créer le compte administrateur

Dans le même fichier `.env.local`, ajoutez :

```
SEED_ADMIN_PHONE="0700000000"
SEED_ADMIN_PASSWORD="un-mot-de-passe-solide-12-caracteres"
SEED_ADMIN_NAME="Votre nom"
```

Le numéro doit figurer dans `ADMIN_PHONES` sur Vercel. Puis :

```bash
npm run db:seed
```

Supprimez ensuite `SEED_ADMIN_PASSWORD` de `.env.local`. Connectez-vous sur le site avec ce numéro : le lien « Admin » apparaît dans le menu.

## 7. Tester en production

Passez la checklist de `docs/PROMPTS.md` sur l'adresse Vercel, depuis un vrai téléphone :

- Créer un compte, renseigner l'entreprise.
- Créer une facture de 60 000 FCFA, acompte 20 000, 4 tranches : 20 000 / 13 300 / 13 300 / 13 400.
- Ouvrir le lien public `/d/…` dans une fenêtre privée.
- Installer l'application (Chrome : menu → Installer l'application) et tester le mode avion.

## Dépannage

- **Page blanche ou erreur 500** : vérifiez `DATABASE_URL` et que `npm run db:migrate` a bien été lancé sur *cette* base.
- **Impossible de se connecter juste après le seed** : le numéro admin doit être identique (format libre) dans `ADMIN_PHONES` et `SEED_ADMIN_PHONE`.
- **Réinitialiser un mot de passe** : depuis `/admin`, ou `npm run admin:reset-password -- 0700000000 NouveauMotDePasse`.

## Partager une base avec une autre application

FactureCI range **toutes** ses tables et ses types dans le schéma PostgreSQL `factureci` (et son journal de migrations aussi) : il peut donc partager une base Neon avec une autre application sans jamais lire ni écrire dans ses tables. Au déploiement de production, l'étape `vercel-build` (`scripts/predeploy.ts`) crée ou met à jour ce schéma, puis crée le compte admin si `SEED_ADMIN_PHONE` et `SEED_ADMIN_PASSWORD` sont définies (le mot de passe d'un compte existant n'est jamais réécrit). Les déploiements de prévisualisation ne touchent pas à la base.

Pour passer plus tard sur une base dédiée : `pg_dump --schema=factureci` de l'ancienne base, restauration dans la nouvelle, puis changement de `DATABASE_URL`.
