# FactureCI

SaaS de facturation pour PME, artisans et freelances de Côte d'Ivoire. Mobile-first, en français, en FCFA. Porté par Krea Ecom.

**État : Prompts 1 à 3 terminés.** Comptes, documents (factures, devis, bons de livraison), puis tableaux de bord utilisateur et admin. L'abonnement, la PWA et le déploiement arrivent au prompt 4 (voir `docs/PROMPTS.md`).

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

## Documents (Prompt 2)

- Parcours en 3 étapes (`app/app/documents/nouveau`), aperçu en direct identique au PDF.
- Calculs, tranches, statut : `lib/documents/calc.ts`. Montant en lettres : `lib/documents/words.ts`. Tous testés (`npm test`).
- PDF côté serveur avec `@react-pdf/renderer` (`lib/documents/pdf.tsx`), privé : `/app/documents/[id]/pdf`, public : `/d/[token]/pdf`.
- Lien client en lecture seule : `/d/[token]` (jeton aléatoire de 192 bits, page non indexée).
- Envoi : liens `wa.me`, `sms:` et `mailto:` (`lib/documents/share.ts`). Couche e-mail séparée dans `lib/documents/email.ts` : pour brancher Resend, écrire un `EmailSender` de type `api` et remplacer `emailSender`.
- Dupliquer, devis → facture, facture → bon de livraison : même formulaire, prérempli depuis le document d'origine (vérifié par `user_id`).

## Tableaux de bord (Prompt 3)

- **Utilisateur (`/app`)** : période (aujourd'hui, 7 jours, ce mois, mois dernier, cette année, personnalisée), 6 indicateurs, barres sur 12 mois, anneau par moyen de paiement, 5 meilleurs clients, relances WhatsApp, export CSV (`/app/export`).
- **Définitions** dans `lib/stats/dashboard.ts` (fonctions pures, testées). Les factures annulées, les devis et les bons de livraison ne comptent jamais dans le chiffre d'affaires.
- **Admin (`/admin`, rôle admin)** : indicateurs, validation ou rejet des demandes de paiement, liste des utilisateurs (changer de plan, suspendre, réinitialiser le mot de passe), journal des actions. Les comptes admin sont exclus du revenu et des abonnés.
- **Valider un paiement** active le plan pour 30 jours (prolonge de 30 jours si le même plan est encore actif) et crée une facture d'abonnement, déjà payée, dans le compte de l'admin qui valide. Renseignez le profil entreprise de ce compte pour qu'elle porte votre en-tête.
- **Suspendre** coupe l'accès immédiatement (même avec une session ouverte) sans supprimer de données.
- Migration `drizzle/0001_admin.sql` : colonne `users.suspended_at` et table `admin_actions`.

## À faire aux prompts suivants

Limitation des tentatives de connexion et d'inscription, plans et limites, demande de paiement côté utilisateur, PWA, déploiement (Prompt 4).
