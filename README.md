# Labjoo Analytics Dashboard

Dashboard analytics professionnel pour visualiser les métriques de l'application mobile Labjoo.

## 🚀 Fonctionnalités

- **Dashboard Principal** : Vue d'ensemble avec KPIs et graphiques d'évolution.
- **Analytics Jeux** : Métriques détaillées par jeu (lancements, temps de jeu, taux de sortie).
- **Analytics Utilisateurs** : Liste des utilisateurs avec recherche et filtres.
- **Timeline** : Comparaison multi-métriques dans le temps.
- **Export** : Export des données en CSV et JSON.

## 🛠️ Installation

1.  **Cloner le projet**
    ```bash
    git clone <url-du-repo>
    cd labjoo-analytics
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Configuration Supabase**
    - Copiez le fichier `.env` (ou créez-le) :
      ```env
      VITE_SUPABASE_URL=votre-url-supabase
      VITE_SUPABASE_ANON_KEY=votre-cle-anon
      ```
    - Exécutez le script SQL `schema.sql` dans votre éditeur SQL Supabase pour créer les fonctions RPC nécessaires.

4.  **Lancer le serveur de développement**
    ```bash
    npm run dev
    ```

## 📦 Déploiement

Le projet peut être déployé sur Vercel, Netlify ou tout autre hébergeur statique.

### Build pour production
```bash
npm run build
```

Les fichiers générés se trouveront dans le dossier `dist`.

## 📝 Structure du Projet

- `src/components` : Composants UI réutilisables (Charts, Tables, Cards).
- `src/pages` : Pages principales de l'application.
- `src/services` : Services pour la gestion des données (Supabase).
- `src/types` : Définitions TypeScript.
- `schema.sql` : Fonctions SQL pour Supabase.

## 🎨 Design System

- **Framework** : Tailwind CSS
- **Mode** : Dark Mode par défaut
- **Couleurs** : Slate (fond), Blue (primaire), Green (succès), Purple (info)
