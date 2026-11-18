# FactureCI

SaaS de facturation pour PME, artisans et freelances de Côte d'Ivoire. Mobile-first, en français, en FCFA. Porté par Krea Ecom.

**État : Prompts 1 à 4 terminés.** Comptes, documents, tableaux de bord, puis plans et abonnement, PWA, sécurité et guide de déploiement (`docs/DEPLOIEMENT.md`).

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

## Documents professionnels

- **Cinq types** (`lib/documents/calc.ts`, `TYPE_TRAITS`) : facture (FAC), facture pro forma (PRO), devis (DEV), bon de livraison (BL), bon de commande (BC). Les règles de chaque type (prix, tranches, libellés, signatures) sont dans un seul tableau.
- **En-tête complet** : logo, slogan, adresse, téléphone, e-mail, site web, RCCM, compte contribuable. **Pied de page** : coordonnées, remerciement, numéro de page.
- **Document** : objet, référence ou n° de commande du client, validité (devis, pro forma), adresse de livraison distincte, unité par ligne, Total HT / TVA / Total TTC / Net à payer, « déjà réglé » et « reste à payer » sur les factures partiellement payées, coordonnées bancaires quand le virement est accepté, « Bon pour accord » sur les devis.
- **Bon de livraison** : quantité commandée, quantité livrée et observation par ligne, sans aucun prix.
- Aperçu écran et PDF partagent `deriveSheet` (`lib/documents/sheet.ts`) : un libellé modifié l'est aux deux endroits.
- Migration `drizzle/0003_documents_pro.sql` : nouveaux types, colonnes de profil et de document.

## Tableaux de bord (Prompt 3)

- **Utilisateur (`/app`)** : période (aujourd'hui, 7 jours, ce mois, mois dernier, cette année, personnalisée), 6 indicateurs, barres sur 12 mois, anneau par moyen de paiement, 5 meilleurs clients, relances WhatsApp, export CSV (`/app/export`).
- **Définitions** dans `lib/stats/dashboard.ts` (fonctions pures, testées). Les factures annulées, les devis et les bons de livraison ne comptent jamais dans le chiffre d'affaires.
- **Admin (`/admin`, rôle admin)** : indicateurs, validation ou rejet des demandes de paiement, liste des utilisateurs (changer de plan, suspendre, réinitialiser le mot de passe), journal des actions. Les comptes admin sont exclus du revenu et des abonnés.
- **Valider un paiement** active le plan pour 30 jours (prolonge de 30 jours si le même plan est encore actif) et crée une facture d'abonnement, déjà payée, dans le compte de l'admin qui valide. Renseignez le profil entreprise de ce compte pour qu'elle porte votre en-tête.
- **Suspendre** coupe l'accès immédiatement (même avec une session ouverte) sans supprimer de données.
- Migration `drizzle/0001_admin.sql` : colonne `users.suspended_at` et table `admin_actions`.

## Plans et abonnement (Prompt 4)

| | Gratuit | Pro (4 900 FCFA/mois) | Business (9 900 FCFA/mois) |
|---|---|---|---|
| Documents | 5 par mois | illimités | illimités |
| Logo | non | oui | oui |
| Mention « Créé avec FactureCI » sur le PDF | oui | non | non |
| Envoi par e-mail | non | oui | oui |
| Tableau de bord complet, relances WhatsApp | non | oui | oui |
| Export CSV | non | non | oui |
| Carnet de clients | 20 | 100 | illimité |
| Utilisateurs | 1 | 1 | 3 (voir « Reste à faire ») |

- Droits et prix : `lib/plans.ts`. Le blocage est fait côté serveur (création de document sous verrou par utilisateur, export, logo) ; l'interface affiche une page « Passez au plan Pro ».
- À l'expiration, le plan effectif retombe sur Gratuit (calculé, rien n'est supprimé). Un rappel s'affiche 5 jours avant la fin.
- Paiement sans API : bouton « Payer avec Wave » (`WAVE_LINK_*`), saisie de la référence, demande « en cours de vérification », validation par l'admin dans `/admin`.
- Les limites du carnet de clients (20 / 100) sont un choix de ce projet : le cahier des charges ne précise que « illimité » pour Business.

## PWA et hors connexion

- Manifeste, icônes 192/512/maskable, service worker `public/sw.js` (actif en production), bannière « Installer l'application », page `/hors-ligne`.
- Le service worker met en cache les fichiers statiques et le formulaire « Nouveau document » seulement. Jamais les pages de données, les PDF, les liens publics ni l'export. Le cache des pages est vidé à la déconnexion.
- Hors connexion, un document créé est gardé sur le téléphone (`localStorage`, par utilisateur) puis envoyé au retour du réseau. Il reçoit son numéro à l'envoi.

## Sécurité

Limitation des tentatives (connexion : 10 par 15 min et par couple IP/numéro, 60 par IP ; inscription : 5 par heure et par IP), compteurs en base. Sessions `HttpOnly` et `Secure`, en-têtes de sécurité (CSP, HSTS, anti-cadre), propriété vérifiée sur chaque ressource, logo : 2 Mo maximum avant redimensionnement, type vérifié sur les octets réels, aucune clé côté client.

## Reste à faire (version 2)

- Plusieurs utilisateurs sur la même entreprise (Business, jusqu'à 3) : annoncé « bientôt disponible », non construit.
- Envoi d'e-mail avec le PDF en pièce jointe (Resend) : brancher un `EmailSender` dans `lib/documents/email.ts`.
- Paiement automatique de l'abonnement (aujourd'hui : validation manuelle).
- Relances programmées (aujourd'hui : un clic par relance).
- Réinitialisation du mot de passe en libre-service (aujourd'hui : par l'admin).
- CSP avec nonce (aujourd'hui `'unsafe-inline'` pour les scripts de démarrage de Next.js).
