# Récapitulatif Cockpit – Page par page, tableau par tableau, métrique par métrique

Synthèse de ce que Cockpit affiche aujourd’hui et d’où viennent les données (après alignement iOS ↔ Cockpit).

**Source des données** : base **Neon (PostgreSQL)**. Tables principales : `user_analytics_snapshots` (colonnes `metrics` JSONB, `cumulative_play_time_seconds`, `snapshot_date`, `user_id`), `cost_metrics`, `comments`, `comment_reports`, `profiles`, `game_configurations`.

---

## 1. Dashboard (`/`)

| Élément | Type | Métrique(s) | Source (table / clé) |
|--------|------|-------------|----------------------|
| **KPI – Joueurs uniques** | Carte | Nombre + tendance vs période précédente | `user_analytics_snapshots` → décompte users (deltas sur `sessionCount` / `cumulative_play_time_seconds`) |
| **KPI – Temps de jeu total** | Carte | Heures + tendance | Idem → somme `cumulative_play_time_seconds` (delta) |
| **KPI – Sessions totales** | Carte | Nombre + tendance | Idem → somme `metrics.sessionCount` (delta) |
| **KPI – Taux de conversion** | Carte | % + tendance | Idem → `purchaseSuccesses` / `purchaseAttempts` (delta) |
| **Graphique – Activité joueurs** | Courbe | Joueurs uniques et sessions par jour | `getDailyMetrics` → `unique_players`, `total_sessions` par jour |
| **Donut – Top jeux** | Donut | Lancements par jeu (top 5) | `getGamesAnalytics` → `game_id`, `total_launches` |
| **Tableau – Jeux populaires** | Table | game_id, joueurs, lancements, temps moyen, engagement (barre dérivée de score_attempts) | `getGamesAnalytics` → `game_id`, `unique_players`, `total_launches`, `avg_play_time_minutes`, `total_score_attempts` |

**Période** : sélecteur de dates (défaut 30 jours). Tendances KPI = comparaison avec la période précédente de même durée.

---

## 2. Games (`/games`)

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Graphique – Top 5 temps de jeu** | Barres | Heures par jeu (top 5) | `getGamesAnalytics` → `total_play_time_hours`, `game_id` |
| **Stat – Total jeux actifs** | Valeur | Nombre de jeux avec données | Longueur de la liste `getGamesAnalytics` |
| **Stat – Temps moyen / session** | Valeur | Moyenne des `avg_play_time_minutes` | Dérivé de `getGamesAnalytics` |
| **Stat – Taux de rétention** | Valeur | 100 − moyenne des `exit_rate_percent` | Dérivé de `getGamesAnalytics` |
| **Tableau – Liste des jeux** | Table | Voir colonnes ci‑dessous | `getGamesAnalytics` |

**Colonnes du tableau Games** : `game_id`, `unique_players`, `total_launches`, `avg_play_time_minutes`, `exit_rate_percent`, `net_likes`, `total_shares`.

---

## 3. Users (`/users`)

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Graphique – Distribution des sessions** | Barres | Répartition 1–5, 6–20, 21–50, 50+ sessions | Dérivé de `getUsersAnalytics` → `total_sessions` |
| **Stat – Utilisateurs actifs** | Valeur | Nombre | `getKPIs(30)` → `unique_players` |
| **Stat – Moyenne sessions/user** | Valeur | total_sessions / unique_players | `getKPIs(30)` |
| **Stat – Taux de conversion** | Valeur | % | `getKPIs(30)` → `conversion_rate_percent` |
| **Tableau – Liste des utilisateurs** | Table | Voir colonnes ci‑dessous | `getUsersAnalytics(100)` |

**Colonnes du tableau Users** : `pseudo` (fallback `user_id`), `user_id`, `total_sessions`, `total_play_time_hours`, `avg_session_duration_minutes`, `conversion_rate_percent`, `last_snapshot_date`.

**Source pseudo** : `metrics.pseudo` puis fallback `profiles.username` ou username depuis `comments`.

---

## 4. Timeline (`/timeline`)

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Courbe – Joueurs uniques & sessions** | Courbe | Par jour : joueurs, sessions | `getDailyMetrics` → `date`, `unique_players`, `total_sessions` |
| **Courbe – Temps de jeu (heures)** | Courbe | Heures par jour | `getDailyMetrics` → `total_play_time_hours` |

**Période** : sélecteur de dates (défaut 30 jours).

---

## 5. Export (`/export`)

| Élément | Type | Contenu exporté | Source |
|--------|------|------------------|--------|
| **Export CSV / JSON** | Fichier | Par jour : date, unique_players, total_play_time_hours, total_sessions, avg_session_duration_minutes, total_purchase_attempts, total_purchase_successes | `getDailyMetrics` sur la période choisie |

---

## 6. Game Insights (`/insights`)

### 6.1 Onglet Game Flow

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Completion rate** | Barres (horizontal) | Par jeu : % (top10Attempts / scoreAttempts) | `getGameFlowMetrics` → `completion_rate_percent`, `game_id` |
| **Frustration index** | Barres (horizontal) | Par jeu : % (exits / launches) | `getGameFlowMetrics` → `frustration_index_percent` |
| **Game intensity** | Barres | Par jeu : swipes par heure de jeu | `getGameFlowMetrics` → `intensity_swipes_per_hour` |

### 6.2 Onglet Social & Virality

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Social engagement rate** | Barres | Par jeu : (likes + comments + shares) / joueurs uniques | `getSocialMetrics` → `social_engagement_rate` |
| **Total bookmarks** | Barres (horizontal) | Par jeu : nombre de bookmarks | `getSocialMetrics` → `total_bookmarks` |
| **Comments ratio** | Barres (horizontal) | Par jeu : commentaires / joueur | `getSocialMetrics` → `comments_to_players_ratio` |

### 6.3 Onglet Monetization

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Conversion by play time** | Barres | Par tranche (0–1h, 1–3h, 3–5h, 5h+) : % de convertis | `getMonetizationMetrics` → `conversion_by_play_time` (hours_range, conversion_rate) |
| **Cart abandonment** | KPI | % (purchaseCancels / purchaseAttempts) | `getMonetizationMetrics` → `cart_abandonment_rate` |
| **Pack le plus acheté** | KPI | product_id le plus fréquent (ou « Non renseigné ») | `getMonetizationMetrics` → `most_purchased_pack` (depuis `purchaseTypes`) |
| **Top trigger games** | Camembert | Jeu le plus joué par les acheteurs (approximation) | `getMonetizationMetrics` → `purchases_by_game` (game_id, purchase_count) |
| **Purchases by type** | Camembert | Répartition par product_id | `getMonetizationMetrics` → `purchases_by_type` (product_id, count) |

---

## 7. Cost & Performance (`/cost-metrics`)

### 7.1 Onglet Overview

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **KPI – DB requests (7j)** | Carte | Nombre + tendance vs 7j précédents | `cost_metrics` (metric_type = db_request) |
| **KPI – Bandwidth (7j)** | Carte | Go + tendance | `cost_metrics` (metric_type = bandwidth) |
| **KPI – Auth sessions (7j)** | Carte | Nombre + tendance | `cost_metrics` (metric_type = auth_session) |
| **KPI – Coût par joueur** | Carte | DB requests / unique_players | `cost_metrics` + `user_analytics_snapshots` |
| **Courbe – Évolution quotidienne** | Courbe | Par jour : db_request, bandwidth, auth_session | `getDailyCostTrend` |
| **Barres – Top 10 jeux par coût** | Barres (horizontal) | db_requests_per_player par game_id | `getGameEfficiency` |

### 7.2 Onglet Game Efficiency

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Scatter – Coût vs conversion** | Nuage de points | db_requests_per_player (X), conversion_rate (Y), taille = unique_players | `getGameEfficiency` |
| **Barres – Efficacité monétisation** | Barres (horizontal) | purchases_per_million_cost par game_id | `getGameEfficiency` |
| **Barres – Intensité bande passante** | Barres (horizontal) | mb_per_hour par game_id | `getBandwidthIntensity` |

### 7.3 Onglet Alerts

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Tableau – Alertes actives** | Table | date, type, valeur, seuil, dépassement % | `getCostAlerts` (seuils codés : db_request 100k, bandwidth 1 Go, auth_session 10k) |
| **Barres – Churn cost index** | Barres (horizontal) | Par jeu : indice coût × exit_rate | `getChurnCost` |

### 7.4 Onglet Trends

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Courbe – Sessions par joueur actif** | Courbe | Par jour : sessions_per_active_player | `getSessionEfficiency` |
| **Tableau – Évolution quotidienne détaillée** | Table | date, type, valeur, précédent, différence, variation % | `getDailyCostTrend` |

---

## 8. Modération (`/moderation`)

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Carte – Critiques** | Compteur | Commentaires avec ≥ 5 signalements | `getReportedComments` → filtre `nombre_signalements_reel >= 5` |
| **Carte – Attention** | Compteur | Commentaires avec 2–4 signalements | Idem, filtre 2–4 |
| **Carte – Masqués** | Compteur | Commentaires masqués | `est_masque` |
| **Carte – Visibles** | Compteur | Commentaires non masqués | `!est_masque` |
| **Tableau – Commentaires signalés** | Table | Statut, contenu (preview), auteur, avatar, jeu, likes/dislikes/réponses, signalements, date, actions Masquer/Afficher, Supprimer | `comments` + `comment_reports` (via ModerationService) |

---

## 9. Configuration (`/config`)

| Élément | Type | Métrique(s) | Source |
|--------|------|-------------|--------|
| **Cartes par catégorie** | Liste de configs | Limites, Kill Switches, Offres Premium, Système, Debug | `game_configurations` (config_key, config_value) – lecture + mise à jour |
| **Switch PROD/DEV** | Sélecteur | Environnement Neon (lecture / bascule) | `getCurrentEnv` / `switchEnv` (lib neon) |

---

## Correspondance rapide : clé `metrics` → écrans

| Clé dans `metrics` (user_analytics_snapshots) | Utilisée dans |
|-----------------------------------------------|---------------|
| sessionCount | Dashboard (KPI, Daily), Users, Timeline, Export, Cost (session efficiency) |
| totalSessionDuration | Users (durée moy.), Daily, Export |
| purchaseAttempts, purchaseSuccesses, purchaseCancels | Dashboard (conversion), Users, Insights Monetization (cart abandonment), Cost (efficiency) |
| pseudo | Users (affichage) |
| gameLaunches, gamePlayTime, gameSwipes, gameExits | Dashboard, Games, Insights Flow/Social, Cost, Monetization (trigger game) |
| likes, bookmarks, shares, comments | Games, Insights Social |
| scoreAttempts, top10Attempts | Dashboard (engagement), Games, Insights Flow (completion) |
| purchaseTypes | Insights Monetization (pack le plus acheté, purchases by type) |

**Tables Neon** : `user_analytics_snapshots` (analytics), `cost_metrics` (Cost & Performance), `comments` + `comment_reports` (Modération), `profiles` (pseudo Users), `game_configurations` (Configuration).
