# Prompt pour brancher le tracking cost_metrics (projet Labjoo)

Le rapport de conformité a montré que le **format** des données envoyées vers `cost_metrics` est correct pour Cockpit, mais qu’**aucun appel** à `CostTrackingService` n’est effectué depuis le code de production. Il faut donc brancher les appels pour que les écrans Cost & Performance se remplissent.

**À faire** : donner le prompt ci‑dessous à Cursor dans le **projet Labjoo (app iOS)** pour qu’il ajoute les appels au bon endroit, sans changer la logique métier (requêtes DB, auth).

---

## Début du prompt à copier

```
Contexte : Le dashboard Cockpit affiche Cost & Performance à partir de la table Neon `cost_metrics`. Le format est déjà conforme (metric_type = db_request | bandwidth | auth_session). Actuellement aucune donnée n’est envoyée car les méthodes de CostTrackingService ne sont pas appelées depuis le code de production.

Objectif : Brancher les appels à CostTrackingService **uniquement** pour enregistrer les métriques (pas de changement de logique métier).

À faire :

1. **db_request**  
   Après chaque requête Neon exécutée avec succès (query, insert, upsert, etc.), appeler :
   - `CostTrackingService.shared.trackDBRequest(gameId: …)`
   - Passer `game_id` (String?) quand la requête est liée à un jeu (ex. scores, likes, bookmarks, comments pour un game_id) ; sinon `nil`.
   - Fichier typique : là où les appels à NeonRepository / DatabaseService sont effectués (ex. après chaque opération réussie dans NeonRepository, ou dans les services qui appellent le repo : ScoreService, SocialSyncManager, CommentService, etc.). Une option est d’ajouter un seul point central dans NeonRepository après chaque `query`/`execute` réussi, en comptant 1 requête par appel ; si le contexte (game_id) n’est pas disponible dans le repo, on peut faire un paramètre optionnel sur les méthodes du repo ou laisser game_id = nil pour l’instant.

2. **auth_session**  
   À chaque ouverture de session auth réussie (login), appeler :
   - `CostTrackingService.shared.trackAuthSession()`
   - Fichiers typiques : CustomAuthService, AuthManager, ou le callback après un signIn réussi.

3. **bandwidth** (optionnel)  
   Si l’app mesure déjà le volume de données (octets) reçu/envoyé par requête ou par jeu, appeler :
   - `CostTrackingService.shared.trackBandwidth(bytes: gameId:)`
   - Sinon, ne pas ajouter de mesure de bande passante pour l’instant.

Contraintes :
- Ne pas modifier la logique des requêtes DB ni de l’auth ; seulement **ajouter** l’appel au tracking après le succès.
- Garder les metric_type exactement : "db_request", "bandwidth", "auth_session".
- Pour trackDBRequest : si tu peux passer le game_id depuis les appels qui sont liés à un jeu (scores, likes, bookmarks, comments), le faire ; sinon commencer par trackDBRequest(gameId: nil) partout pour avoir au moins les requêtes totales.

Après les changements, lister brièvement les fichiers modifiés et où les appels ont été ajoutés (ex. NeonRepository après execute, AuthManager après signIn).
```

---

## Fin du prompt à copier

---

## Après application

- Relancer l’app iOS, faire quelques actions (login, jouer, scores, likes, etc.).
- Attendre au moins un cycle de flush (30 s ou 100 métriques).
- Dans Cockpit : recharger **Cost & Performance** (Overview) et éventuellement **Vérification** (`/verify`) pour voir si `costOverview` n’est plus tout à `null`.
- Si des lignes sont bien insérées en base avec `game_id` pour les requêtes liées à un jeu, les onglets **Game Efficiency**, **Bandwidth** (si branché) et **Churn Cost** pourront aussi se remplir.
