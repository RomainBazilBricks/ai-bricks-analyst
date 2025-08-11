# AI Boosted Project

## Description

Projet full-stack avec backend Express.js/TypeScript et frontend React/Vite utilisant une architecture monorepo. Le projet utilise PostgreSQL avec Drizzle ORM pour la base de données.

## Architecture

- **Backend** : Express.js + TypeScript + Drizzle ORM
- **Frontend** : React + Vite + TypeScript + ShadCN UI
- **Base de données** : PostgreSQL (Neon)
- **Gestion d'état** : Zustand (frontend)
- **API** : React Query (frontend)

## Prérequis

- Node.js (version 18 ou supérieure)
- npm

## Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd ai-boosted-project
```

### 2. Installer les dépendances

```bash
npm install
```

Cette commande installera automatiquement les dépendances pour le backend et le frontend grâce aux workspaces.

## Configuration

### 1. Variables d'environnement

Créez un fichier `.env` dans le dossier `back/` :

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
PORT=3000
```

Créez un fichier `.env` dans le dossier `front/` :

```env
VITE_API_ENV=local
```

### 2. Base de données

Assurez-vous que PostgreSQL est installé et en cours d'exécution, puis :

```bash
# Générer les migrations
npm run drizzle:generate -w back

# Appliquer les migrations
npm run drizzle:push -w back
```

## Lancement du projet

### Démarrage complet (recommandé)

```bash
npm run dev
```

Cette commande lance simultanément :
- Backend sur `http://localhost:3000`
- Frontend sur `http://localhost:5173`

### Démarrage séparé

#### Backend uniquement
```bash
npm run dev:back
```

#### Frontend uniquement
```bash
npm run dev:front
```

## Scripts disponibles

### Scripts racine
- `npm run dev` : Lance backend et frontend en parallèle
- `npm run dev:back` : Lance uniquement le backend
- `npm run dev:front` : Lance uniquement le frontend
- `npm run build` : Build backend et frontend
- `npm run clean` : Nettoie les builds

### Scripts backend
- `npm run dev -w back` : Démarre le serveur de développement
- `npm run build -w back` : Build le backend
- `npm run start -w back` : Démarre le serveur en production
- `npm run drizzle:generate -w back` : Génère les migrations
- `npm run drizzle:push -w back` : Applique les migrations
- `npm run drizzle:pull -w back` : Récupère le schéma depuis la DB

### Scripts frontend
- `npm run dev -w front` : Démarre le serveur de développement
- `npm run build -w front` : Build le frontend
- `npm run preview -w front` : Prévisualise le build
- `npm run lint -w front` : Vérifie le code avec ESLint

```plaintext
ai-boosted-project/
├── README.md # Documentation principale
├── package.json # Configuration monorepo
├── package-lock.json # Lock des dépendances racine
│
├── back/ # 🔧 Backend Express.js
│ ├── package.json # Dépendances backend
│ ├── package-lock.json # Lock des dépendances backend
│ ├── tsconfig.json # Configuration TypeScript
│ ├── drizzle.config.ts # Configuration Drizzle ORM
│ ├── drizzle.ts # Instance Drizzle
│ │
│ ├── src/ # Code source backend
│ │ ├── index.ts # Point d'entrée principal
│ │ ├── app.ts # Configuration Express
│ │ │
│ │ ├── controllers/ # 📋 Contrôleurs (logique métier)
│ │ │ └── users.controller.ts # Contrôleur utilisateurs
│ │ │
│ │ ├── routes/ # 🛣️ Routes API
│ │ │ └── users.routes.ts # Routes utilisateurs
│ │ │
│ │ └── db/ # 💾 Configuration base de données
│ │ ├── index.ts # Instance de connexion
│ │ └── schema.ts # Schéma Drizzle
│ │
│ └── drizzle/ # 🔄 Migrations et métadonnées
│ ├── 0000_bored_the_captain.sql # Migration initiale
│ ├── schema.ts # Schéma généré
│ ├── relations.ts # Relations générées
│ └── meta/ # Métadonnées Drizzle
│ ├── journal.json # Journal des migrations
│ └── 0000_snapshot.json # Snapshot du schéma
│
├── front/ # ⚛️ Frontend React
│ ├── package.json # Dépendances frontend
│ ├── package-lock.json # Lock des dépendances frontend
│ ├── tsconfig.json # Configuration TypeScript principale
│ ├── tsconfig.app.json # Configuration TypeScript app
│ ├── tsconfig.node.json # Configuration TypeScript Node
│ ├── vite.config.ts # Configuration Vite
│ ├── eslint.config.js # Configuration ESLint
│ ├── components.json # Configuration ShadCN
│ ├── index.html # Template HTML
│ ├── README.md # Documentation frontend
│ │
│ ├── public/ # 🌐 Ressources publiques
│ │ └── vite.svg # Logo Vite
│ │
│ └── src/ # Code source frontend
│ ├── main.tsx # Point d'entrée principal
│ ├── App.tsx # Composant racine
│ ├── App.css # Styles globaux
│ ├── vite-env.d.ts # Types Vite
│ │
│ ├── api/ # 🔗 Configuration API
│ │ ├── api.ts # Hooks génériques (useFetcher, useMutator)
│ │ ├── axios.ts # Instance Axios
│ │ ├── query-config.ts # Configuration React Query
│ │ └── users.ts # Hooks API utilisateurs
│ │
│ ├── components/ # 🧩 Composants réutilisables
│ │ └── ui/ # Composants ShadCN
│ │ ├── alert.tsx # Composant alerte
│ │ ├── button.tsx # Composant bouton
│ │ ├── input.tsx # Composant input
│ │ └── skeleton.tsx # Composant skeleton
│ │
│ ├── pages/ # 📄 Pages de l'application
│ │ ├── index.ts # Export des pages
│ │ └── home.tsx # Page d'accueil
│ │
│ ├── layouts/ # 🏗️ Layouts
│ │ └── main-layout.tsx # Layout principal
│ │
│ ├── navigation/ # 🧭 Navigation et routage
│ │ ├── router.tsx # Configuration du routeur
│ │ └── use-app-routes.tsx # Hook des routes
│ │
│ ├── hooks/ # 🎣 Hooks personnalisés
│ │ └── use-match-routes.ts # Hook de matching des routes
│ │
│ ├── lib/ # 📚 Utilitaires
│ │ └── utils.ts # Utilitaires généraux
│ │
│ └── assets/ # 🎨 Ressources statiques
│ └── react.svg # Logo React
│
└── shared/ # 🤝 Types partagés
└── types/ # 📝 Définitions TypeScript
└── users.d.ts # Types utilisateurs
```