# Guide d’alignement App iOS ↔ Cockpit (Neon)

Ce document décrit **ce que Cockpit attend** en base Neon et **ce que l’app iOS doit produire** pour que toutes les métriques s’affichent correctement. Il sert de base pour un plan de correction méthodique.

---

## 1. Vue d’ensemble

- **Cockpit** lit les données **uniquement** depuis **Neon (PostgreSQL)**. Il n’y a pas de couche API REST intermédiaire ni de données stub dédiées.
- Les métriques “vides” ou “à 0” viennent en général de :
  - **Tables vides** ou **pas encore alimentées** par l’app iOS.
  - **Structure du JSONB `metrics`** différente de ce que Cockpit attend dans `user_analytics_snapshots`.
  - **Tables manquantes** (`cost_metrics`, `comments`, `comment_reports`, `profiles`).

---

## 2. Tables et structures attendues par Cockpit

### 2.1 `user_analytics_snapshots`

Table centrale pour **Dashboard, Games, Users, Timeline, Export, Game Insights (Flow, Social, Monetization)**.

| Colonne | Type | Description |
|--------|------|-------------|
| `user_id` | UUID / TEXT | Identifiant utilisateur (obligatoire) |
| `snapshot_date` | TIMESTAMP | Date/heure du snapshot |
| `cumulative_play_time_seconds` | NUMERIC | Temps de jeu **cumulé** (total depuis le début) |
| `metrics` | JSONB | Objet décrit ci-dessous |

**Structure attendue du JSONB `metrics`** (clés exactes utilisées par Cockpit) :

| Clé | Type | Utilisation Cockpit |
|-----|------|----------------------|
| `sessionCount` | int | Sessions totales, KPIs, Users, Daily, Cost |
| `totalSessionDuration` | float (secondes) | Durée moyenne session (Users, Daily) |
| `purchaseAttempts` | int | Conversion, Monetization, cart abandonment |
| `purchaseSuccesses` | int | Conversion, Monetization, Cost efficiency |
| `purchaseCancels` | int | Cart abandonment, conversion |
| `pseudo` | string | Affichage pseudo (Users) |
| **Par jeu (game_id = clé)** | | |
| `gameLaunches` | object `{ [game_id]: number }` | Jeux, Flow, Social, Cost, Monetization |
| `gamePlayTime` | object `{ [game_id]: number }` (secondes) | Temps par jeu, Flow, Cost, Monetization |
| `gameSwipes` | object `{ [game_id]: number }` | Flow (intensité), Games |
| `gameExits` | object `{ [game_id]: number }` | Exit rate, Flow (frustration) |
| `likes` | object `{ [game_id]: number }` | Games, Social |
| `bookmarks` | object `{ [game_id]: number }` | Games, Social |
| `shares` | object `{ [game_id]: number }` | Games, Social |
| `comments` | object `{ [game_id]: number }` | Games, Social |
| `scoreAttempts` | object `{ [game_id]: number }` | Games, Flow (completion) |
| `top10Attempts` | object `{ [game_id]: number }` | Games, Flow (completion) |
| **Monétisation** | | |
| `purchaseTypes` | object `{ [product_id]: number }` | Pack le plus acheté, achats par type |

**Important** : Les requêtes Cockpit font des **deltas** entre deux périodes (snapshot en fin de fenêtre − snapshot avant la fenêtre). Il faut donc que l’app iOS envoie des **valeurs cumulatives** (ou que la logique côté Cockpit reste cohérente avec ce que vous envoyez).

---

### 2.2 `cost_metrics`

Utilisée par **Cost & Performance** (overview, efficacité par jeu, bande passante, alertes, tendances).

| Colonne | Type | Description |
|--------|------|-------------|
| `created_at` | TIMESTAMP | Date/heure du point de mesure |
| `metric_type` | TEXT | `'db_request'` \| `'bandwidth'` \| `'auth_session'` |
| `metric_value` | NUMERIC | Valeur (nb requêtes, octets, nb sessions) |
| `game_id` | TEXT (optionnel) | Si la métrique est liée à un jeu |

Si cette table est vide, **Cost Overview** renverra `null` et les graphiques coûts resteront vides.

---

### 2.3 `comments` et `comment_reports`

- **comments** : utilisé pour la **Modération** et pour récupérer le **pseudo** (fallback) dans Users.
- **comment_reports** : signalements (Modération).

Structure attendue côté Cockpit : champs habituels (id, game_id, content, user_id, username, created_at, hidden_at, is_hidden, is_deleted, likes_count, reports_count, etc.).

---

### 2.4 `profiles`

Table optionnelle pour le **pseudo** utilisateur : `user_id`, `username`. Utilisée en fallback si `metrics.pseudo` est vide.

---

### 2.5 `game_configurations`

Pour la page **Configuration** : `config_key`, `config_value`, `updated_at`.

---

## 3. Mapping par écran Cockpit → données nécessaires

| Écran | Données nécessaires | Tables / champs clés |
|-------|---------------------|----------------------|
| **Dashboard** | KPIs, tendances, activité par jour, top jeux | `user_analytics_snapshots` (metrics: sessionCount, purchase*, gameLaunches, gamePlayTime, etc.) |
| **Games** | Par jeu : joueurs, lancements, temps, swipes, exits, likes, bookmarks, shares, comments, score/top10 | Idem, tous les objets par `game_id` |
| **Users** | Par user : temps, sessions, achats, conversion, pseudo, dates | `user_analytics_snapshots` + `profiles` ou `comments` (pseudo) |
| **Timeline** | Joueurs/sessions par jour, temps par jour | `user_analytics_snapshots` (daily aggregation) |
| **Export** | Métriques quotidiennes | Idem que Daily (sessionCount, totalSessionDuration, purchase*) |
| **Game Insights – Flow** | Completion, frustration, intensité (swipes/h) | `gameLaunches`, `gameExits`, `gamePlayTime`, `gameSwipes`, `scoreAttempts`, `top10Attempts` |
| **Game Insights – Social** | Engagement, bookmarks, comments/joueur | `gameLaunches`, `likes`, `comments`, `shares`, `bookmarks` |
| **Game Insights – Monetization** | Conversion par tranche de temps, cart abandonment, pack le plus acheté, achats par jeu/type | `purchaseAttempts`, `purchaseSuccesses`, `purchaseCancels`, `purchaseTypes`, `gamePlayTime` |
| **Cost & Performance** | Requêtes DB, bande passante, sessions auth, par jeu | `cost_metrics` + `user_analytics_snapshots` |
| **Modération** | Commentaires signalés | `comments`, `comment_reports` |
| **Configuration** | Clés/valeurs config | `game_configurations` |

---

## 4. Ce que vous devez me fournir de l’app iOS (pour le plan de correction)

Pour avancer de façon méthodique, fournissez les éléments suivants **depuis le projet de l’app iOS** :

### 4.1 Schéma et envoi des données vers Neon

1. **Comment l’app iOS envoie les données vers Neon ?**
   - Appels directs (driver Postgres / HTTP) ?
   - Via une API backend qui écrit dans Neon ?
   - Fréquence : à chaque session, en batch, à la fermeture, etc. ?

2. **Copie du schéma SQL** (ou des migrations) utilisé côté iOS/backend pour :
   - `user_analytics_snapshots` (colonnes + type de `metrics`)
   - `cost_metrics` (si vous l’utilisez)
   - `comments`, `comment_reports`, `profiles`, `game_configurations` (si utilisés)

3. **Un exemple réel (anonymisé) d’objet `metrics`** envoyé dans `user_analytics_snapshots` (JSON), pour comparer avec le tableau des clés attendues ci-dessus.

### 4.2 Correspondance des événements

4. **Liste des événements / métriques que l’app iOS enregistre** (ex. “session_start”, “game_launch”, “purchase_attempt”, “swipe”, “exit”, “like”, “comment”, etc.) avec pour chacun :
   - Le nom de l’événement côté iOS
   - Où il est persisté (quelle table / quel champ ou clé dans `metrics`)

5. **Identifiants** : format de `game_id` et de `product_id` (packs) dans l’app iOS (ex. UUID, string “pack_gold”, etc.) pour vérifier la cohérence avec Cockpit.

### 4.3 Points connus “vides” ou faux

6. **Liste des écrans ou métriques Cockpit** que vous savez déjà “vides” ou “fausses” (ex. “Cost Overview toujours vide”, “Pack le plus acheté = Non renseigné”, “Users sans pseudo”), pour prioriser les corrections.

---

## 5. Plan de correction proposé (à affiner avec vos réponses)

1. **Inventaire**  
   À partir de vos réponses au §4 : établir une **matrice**  
   - ligne = métrique ou écran Cockpit  
   - colonne = événement / champ iOS  
   - statut = “OK”, “Manquant”, “Nom différent”, “Calcul à revoir”.

2. **Alignement du schéma et du JSONB**  
   - Adapter soit l’iOS (noms de clés, structure de `metrics`), soit les requêtes Cockpit (alias, COALESCE, mapping) pour que les clés correspondent.
   - S’assurer que les **cumuls vs deltas** sont cohérents (Cockpit calcule des deltas entre fenêtres ; il faut que les snapshots reflètent des cumuls).

3. **Backfill / alimentation**  
   - Si des tables sont vides (`cost_metrics` notamment), définir comment les alimenter (côté iOS, job backend, ou autre).
   - Si l’iOS n’envoie pas encore certaines clés (`purchaseTypes`, `purchaseCancels`, etc.), planifier leur ajout.

4. **Fallbacks et seuils**  
   - Cockpit utilise des fallbacks (ex. “Non renseigné” pour le pack le plus acheté, 0 pour cart_abandonment). On pourra les garder ou les adapter une fois les données réelles en place.
   - Sortir les seuils d’alertes (Cost) en config si besoin.

5. **Tests de bout en bout**  
   - Insérer des jeux de test dans Neon (respectant le schéma attendu), recharger Cockpit et valider écran par écran.

---

## 6. Résumé des clés `metrics` à avoir côté iOS

Pour que **toutes** les métriques Cockpit soient renseignées, l’app iOS doit au minimum alimenter `user_analytics_snapshots` avec un `metrics` contenant (clés exactes) :

- **Global** : `sessionCount`, `totalSessionDuration`, `purchaseAttempts`, `purchaseSuccesses`, `purchaseCancels`, `pseudo`
- **Par jeu** : `gameLaunches`, `gamePlayTime`, `gameSwipes`, `gameExits`, `likes`, `bookmarks`, `shares`, `comments`, `scoreAttempts`, `top10Attempts` (objets `{ [game_id]: number }`)
- **Achats** : `purchaseTypes` (objet `{ [product_id]: count }`)

Et alimenter **cost_metrics** si vous voulez utiliser la section Cost & Performance (metric_type : `db_request`, `bandwidth`, `auth_session`).

Une fois que vous m’aurez fourni les éléments du §4 (schéma, exemple de `metrics`, liste d’événements, écrans problématiques), on pourra détailler un **plan de correction concret** (ordre des tâches, modifications Cockpit vs iOS, et éventuellement scripts SQL ou exemples de payload à envoyer depuis l’iOS).
