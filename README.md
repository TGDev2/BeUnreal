# BeUnreal – Social camera built with Ionic + React + Supabase

> 📱 Android-first (iOS optional bonus) social network à la *BeReal* / *Snapchat*

---

## 1 . Fonctionnalités clés

| Domaine | Fonction | Table(s) Supabase | RLS |
|---------|----------|-------------------|-----|
| Utilisateur | Auth (email / password), profil CRUD | `auth.users`, `profiles` | ✅ |
| Contacts | Ajouter / lister amis | `contacts`, `profiles` | ✅ |
| Chat 1-to-1 | Texte, photo & vidéo ≤10 s | `messages`, storage `chat-images`, `chat-media` | ✅ |
| Groupes | Création, membres, chat | `groups`, `group_members`, `group_messages` | ✅ |
| Stories GPS | Photo / vidéo ≤10 s, rayon 10 km | `stories`, storage `story-media` | ✅ |

---

## 2 . Architecture

* **Frontend** : Ionic 8 + React 19, Vite 5, TypeScript strict mode  
* **Mobile layer** : Capacitor 7 (Camera, Geolocation, Filesystem)  
* **Backend-as-a-Service** : Supabase ( Postgres + Edge Functions + Storage )  
* **Realtime** : Postgres changes over WebSocket (`supabase.channel`)  
* **CI hooks** : ESLint + Prettier + Vitest + Cypress

![High-level diagram](docs/architecture.svg)<!-- optional: draw.io export -->

---

## 3 . Prérequis

| Outil | Version mini | Rôle |
|-------|--------------|------|
| **Node.js** | 20 LTS | Dev & build |
| **pnpm** | ≥9 (ou npm 10) | Gestion paquets |
| **Supabase CLI** | ≥1.156 | Init & migrations |
| **Android SDK** | 34 | Build APK |
| **Git** | ≥2.40 | VCS |

---

## 4 . Installation locale

```bash
# 1. Variables d’environnement
cp .env.example .env
# ⇒ Renseigner VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY

# 2. Dépendances
pnpm install

# 3. Lancer l’appli Web
pnpm dev
````

---

## 5 . Setup Supabase (≈ 5 min)

```bash
# 1. Créez un projet Supabase, puis
supabase login          # token de votre compte
supabase projects list

# 2. Paramètres de la BDD
supabase db push        # applique le schéma sous supabase/schema/BDD.sql
supabase functions deploy delete_user

# 3. Buckets Storage
supabase storage create-bucket chat-images public
supabase storage create-bucket chat-media  public
supabase storage create-bucket story-media public

# 4. Extensions géospatiales (Nearby Stories)
supabase db remote execute "
  create extension if not exists cube;
  create extension if not exists earthdistance;
"
```

> ℹ️ Les politiques RLS sont inclues dans le script SQL.
> Pensez à activer « Postgres Change Data Capture » dans `Database >  Replication`.

---

## 6 . Build Android

```bash
pnpm build                   # transpile + Vite
npx cap sync android         # copie dist/ vers android/
npx cap open android         # ouvre Android Studio
# ⇒ Build > Build Bundle / APK > Build APK(s)
```

APK signé ? *Build > Generate Signed Bundle…* (clé debug ou release).