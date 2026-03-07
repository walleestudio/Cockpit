# Pourquoi « Favoris totaux » (Insights Jeux) peut être vide

## D’où vient la donnée ?

Cockpit affiche **Favoris totaux** à partir de la table **`user_analytics_snapshots`**, colonne **`metrics`** (JSONB). Il **ne lit pas** une table dédiée type `favoris` ou `bookmarks`.

La requête utilise uniquement :

- `metrics->'bookmarks'->>game_id`  
c’est‑à‑dire un **objet** dans `metrics` dont la **clé** est **`bookmarks`** et la **valeur** est un objet **clé = game_id, valeur = nombre** (cumul de favoris par jeu).

## Format attendu dans `metrics`

Dans chaque snapshot, `metrics` doit contenir par exemple :

```json
{
  "gameLaunches": { "speed_tap": 10, "stack_boom": 5 },
  "bookmarks": { "speed_tap": 1, "stack_boom": 2 },
  "likes": { "speed_tap": 0, "stack_boom": 1 },
  "shares": { ... },
  "comments": { ... }
}
```

- **Clé** : `bookmarks` (exactement ce nom).
- **Valeur** : un objet `{ [game_id]: number }` (cumul de fois où l’utilisateur a mis ce jeu en favori).

Si les favoris sont stockés **uniquement** dans une autre table (ex. `user_favorites`, `bookmarks`) et **jamais recopiés** dans `user_analytics_snapshots.metrics.bookmarks`, alors « Favoris totaux » restera vide dans Cockpit.

## Vérifier ce qui est en base

Exécuter dans Neon (ou tout client SQL sur la BDD Cockpit) :

```sql
-- 1. Y a-t-il une clé "bookmarks" dans metrics ?
SELECT
    user_id,
    snapshot_date,
    metrics->'bookmarks' AS bookmarks_raw,
    jsonb_typeof(metrics->'bookmarks') AS type_bookmarks
FROM user_analytics_snapshots
WHERE metrics ? 'bookmarks'
LIMIT 10;
```

- Si **aucune ligne** : l’app n’envoie pas `metrics.bookmarks` → il faut ajouter/côté iOS l’envoi de cet objet dans les snapshots.
- Si **type_bookmarks = 'object'** et **bookmarks_raw** ressemble à `{"speed_tap": 1, "stack_boom": 2}` : le format est bon ; si la période des snapshots est trop ancienne ou la fenêtre des 30 jours ne couvre pas ces snapshots, le graphique peut quand même être vide (vérifier les dates).
- Si **type_bookmarks = 'number'** (ex. `metrics.bookmarks = 5`) : le format ne convient pas ; Cockpit a besoin d’un **objet par game_id**, pas d’un seul nombre.

```sql
-- 2. Exemple de contenu metrics (anonymiser user_id si besoin)
SELECT user_id, snapshot_date, metrics
FROM user_analytics_snapshots
ORDER BY snapshot_date DESC
LIMIT 3;
```

Vérifier dans le JSON que `bookmarks` existe et est bien un objet `{ "game_id": count, ... }`.

## Que faire côté app iOS ?

1. **Lors de la mise en favori / retrait** d’un jeu, mettre à jour le **cumul** du nombre de favoris **par game_id** dans la structure qui sera envoyée dans `metrics.bookmarks` (ex. `trackBookmarkToggle(gameId:bookmarked:)` qui met à jour ce cumul).
2. **Lors de l’envoi du snapshot** vers Neon, inclure dans `metrics` la clé **`bookmarks`** avec cet objet `{ [game_id]: number }` (cumul par jeu).
3. Ne **pas** envoyer uniquement un nombre global (ex. `"bookmarks": 5`) : Cockpit a besoin du détail par jeu pour le graphique « Favoris totaux » par jeu.

Une fois que les snapshots contiennent `metrics.bookmarks` au bon format et sur la période affichée (30 derniers jours par défaut), « Favoris totaux » dans Insights Jeux se remplira.

---

## Comportement Cockpit (enrichissement)

Cockpit **enrichit** les données likes/favoris pour l’affichage :

- **getGamesAnalytics** exécute en plus deux requêtes « total actuel » (tous snapshots, max par user puis somme par jeu) et remplit `total_likes` et `total_bookmarks` sur chaque jeu.
- Les tableaux **Dashboard** (Jeux à mettre en avant), **Games** (Liste des jeux) et **Game Insights** (nuages Favoris / Aimés) utilisent `total_likes ?? net_likes` et `total_bookmarks ?? net_bookmarks` pour afficher les totaux.

Les données likes/bookmarks sont bien présentes en BDD (voir export cockpit) ; si les tableaux semblaient vides, c’était notamment parce que la colonne **Favoris** manquait sur la page Games — elle a été ajoutée.
