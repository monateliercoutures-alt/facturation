# FactureCI

SaaS de facturation pour PME, artisans et freelances de Côte d'Ivoire. Mobile-first, en français, en FCFA. Porté par Krea Ecom.

**État : Prompt 1 terminé (fondations).** Comptes (téléphone + mot de passe), profil de l'entreprise, base de données, compte admin. Les documents, tableaux de bord et abonnements arrivent aux prompts 2 à 4 (voir `docs/PROMPTS.md`).

Stack : Next.js 16 (App Router), TypeScript, Tailwind 4, Neon (PostgreSQL) + Drizzle, Auth.js, zod.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseignez DATABASE_URL, AUTH_SECRET, ADMIN_PHONES…
npm run db:migrate           # crée les tables
npm run db:seed              # crée le compte admin (SEED_ADMIN_*)
npm run dev                  # http://localhost:3000
```

Générer `AUTH_SECRET` : `openssl rand -base64 33`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Développement, build, production |
| `npm test` | Tests unitaires (`DATABASE_URL` défini : active aussi le test de numérotation sur base réelle) |
| `npm run typecheck` / `lint` | Vérifications |
| `npm run db:generate` | Génère une migration après modification de `lib/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations (`drizzle/`) |
| `npm run db:seed` | Crée ou met à jour le compte admin |
| `npm run admin:reset-password -- 0700000000 NouveauMotDePasse` | Réinitialise un mot de passe |

## Variables d'environnement

`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PHONES` (numéros admin séparés par des virgules), `WAVE_LINK_PRO`, `WAVE_LINK_BUSINESS`, `APP_URL`. Détails dans `.env.example`.

Un utilisateur dont le téléphone figure dans `ADMIN_PHONES` reçoit le rôle admin à l'inscription et à chaque connexion.

## Choix techniques

- Téléphone stocké au format `+2250700000000` ; saisie libre acceptée (`07 00 00 00 00`).
- Mots de passe hachés avec bcrypt (coût 12). Sessions JWT en cookie `HttpOnly`, `Secure` en production.
- Toute requête de données filtre par `user_id` (`lib/session.ts` : `requireUser`). `proxy.ts` ne fait qu'une redirection optimiste ; l'autorisation est refaite dans chaque page et chaque action.
- Numérotation `FAC-2026-001` : `lib/numbering.ts`, compteur incrémenté par UPSERT dans la transaction de création.
- Mot de passe oublié : réinitialisation par l'admin (lien WhatsApp vers le premier numéro de `ADMIN_PHONES`).

## À faire aux prompts suivants

Limitation des tentatives de connexion et d'inscription, page de réinitialisation côté admin (Prompt 3), PWA et déploiement (Prompt 4).
