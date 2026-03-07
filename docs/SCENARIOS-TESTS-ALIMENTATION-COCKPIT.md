# Scénarios de tests pour alimenter tous les tableaux et vues de Cockpit

**Objectif** : Ce document décrit les **scénarios de test à exécuter dans l’app iOS (Labjoo)** pour que **chaque tableau, graphique et carte de Cockpit** reçoive des données. À donner à l’IA qui construit ou modifie l’app iOS pour qu’elle génère un plan de tests (ou des scripts / parcours utilisateur) garantissant que les données attendues sont bien envoyées vers Neon.

**Principe** : Pour chaque vue Cockpit, on indique **quelle donnée** est attendue et **quel scénario utilisateur** dans l’app iOS produit cette donnée (et donc quels envois vers `user_analytics_snapshots`, `cost_metrics`, etc.).

---

## 1. Vue d’ensemble des sources de données Cockpit

| Source (Neon) | Utilisée par |
|---------------|--------------|
| `user_analytics_snapshots` (metrics JSONB, snapshot_date, user_id, cumulative_play_time_seconds) | Dashboard, Users, Timeline, Export, Game Insights, Préconisations, Cost (partie joueurs) |
| `cost_metrics` (metric_type, metric_value, game_id, created_at, etc.) | Cost & Performance (tous onglets) |
| `comments` + `comment_reports` | Modération |
| `profiles` (username) | Users (pseudo) |

Les **snapshots** doivent être envoyés régulièrement (ex. à la fin d’une session, au heartbeat) avec des **métriques cumulatives** à jour (sessionCount, totalSessionDuration, purchaseAttempts, purchaseSuccesses, gameLaunches, gamePlayTime, gameSwipes, gameExits, likes, bookmarks, shares, scoreAttempts, top10Attempts, leaderboardViews, scoreSaves, purchaseTypes, etc.).

---

## 2. Scénarios par page Cockpit

### 2.1 Dashboard (`/`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **KPI Joueurs uniques** | Au moins 1 user avec snapshot récent (sessionCount ou play_time > 0) | Se connecter avec au moins un compte, lancer au moins un jeu, laisser l’app envoyer un snapshot (fermeture / mise en arrière-plan / heartbeat). |
| **KPI Temps de jeu total** | cumulative_play_time_seconds incrémenté dans les snapshots | Jouer à un ou plusieurs jeux pendant quelques minutes, puis fermer ou mettre en arrière-plan pour déclencher l’envoi du snapshot. |
| **KPI Sessions totales** | metrics.sessionCount incrémenté | Lancer plusieurs parties (plusieurs jeux ou relances du même jeu) pour que sessionCount augmente. |
| **KPI Taux de conversion** | purchaseAttempts > 0 et purchaseSuccesses > 0 pour au moins un user | Initier un achat (tentative) puis le finaliser avec succès (au moins une fois). |
| **Graphique Activité joueurs** | Plusieurs jours avec unique_players et total_sessions par jour | Sur plusieurs jours (ou en modifiant la date du snapshot pour des tests), avoir des connexions et des parties pour que getDailyMetrics renvoie des lignes par jour. |
| **Donut Top jeux** | Plusieurs game_id avec total_launches > 0 | Lancer au moins 2–3 jeux différents (chacun plusieurs fois si possible) pour que le top 5 par lancements soit rempli. |
| **Tableau Jeux à mettre en avant** | Données partages, likes, bookmarks par jeu | Pour plusieurs jeux : partager un score, liker un jeu, mettre un jeu en favoris (bookmark). |
| **Tableau Jeux populaires** | game_id, unique_players, total_launches, avg_play_time_minutes, total_score_attempts | Jouer à plusieurs jeux, avec des tentatives de score (scoreAttempts / top10Attempts enregistrés). |

**Résumé scénario Dashboard** :  
Plusieurs utilisateurs (ou un user sur plusieurs jours), jouer à plusieurs jeux, accumuler du temps de jeu et des sessions, effectuer au moins un achat réussi, partager/liker/favoriser des jeux, et tenter des scores (leaderboard / sauvegarde score) pour les barres d’engagement.

---

### 2.2 Games (`/games`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **Top 5 temps de jeu** | total_play_time_hours par game_id | Jouer à au moins 5 jeux différents, avec des durées variées (certains plus longs que d’autres). |
| **Total jeux actifs** | Au moins un game_id avec des lancements | Lancer au moins un jeu (idéalement plusieurs) pour que getGamesAnalytics renvoie des lignes. |
| **Temps moyen / session** | avg_play_time_minutes renseigné par jeu | Jouer à des parties de durées variées (certaines courtes, certaines longues). |
| **Taux de rétention** | exit_rate_percent < 100 sur certains jeux | Pour au moins un jeu : quitter le jeu « proprement » (sans rage quit) pour que total_exits ne domine pas total_launches. Pour tester la métrique « sortie », faire aussi au moins un exit prématuré sur un jeu. |
| **Liste des jeux** | Colonnes : unique_players, total_launches, launches_per_player, avg_play_time_minutes, share_rate, exit_rate_percent, net_likes, total_shares, leaderboard_views, score_saves | Varier les usages : plusieurs joueurs sur plusieurs jeux, partages (shares), likes, sorties (exits), vues leaderboard et sauvegardes de score. |

**Résumé scénario Games** :  
Jouer à plusieurs jeux (au moins 5 pour le top 5), avec des durées et des sorties variées ; partager des scores et liker des jeux ; consulter des leaderboards et sauvegarder des scores pour remplir toutes les colonnes.

---

### 2.3 Users (`/users`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **Distribution des sessions** | Répartition 1–5, 6–20, 21–50, 50+ sessions | Avoir des utilisateurs avec des nombres de sessions différents : au moins un avec peu de sessions (1–5), un avec 6–20, etc. (plusieurs comptes ou un compte utilisé sur plusieurs jours avec des sessions variées). |
| **Métriques clés (Utilisateurs actifs, Sessions/user, Taux de conversion)** | unique_players, total_sessions, conversion_rate_percent | Plusieurs utilisateurs actifs ; au moins un avec un achat réussi pour que le taux de conversion > 0. |
| **Distribution des durées de session** | totalSessionDuration / sessionCount par user, par tranche | Varier les durées de session (courtes et longues) pour remplir les tranches (0–5 min, 5–15, 15–30, 30+). |
| **Comptes inactifs > 3 ans (RGPD)** | Users avec last_snapshot_date > 3 ans dans le passé | Soit créer des snapshots de test avec une date très ancienne, soit attendre 3 ans (non réaliste) — en test, on peut insérer manuellement en BDD ou simuler une date d’envoi ancienne si l’app le permet. |
| **Liste des utilisateurs** | user_id, pseudo, total_sessions, total_play_time_hours, avg_session_duration_minutes, conversion_rate_percent, last_snapshot_date | Plusieurs comptes avec activité (sessions, temps, achats) ; pseudo renseigné via metrics.pseudo ou profiles.username. |

**Résumé scénario Users** :  
Plusieurs comptes (3–5 minimum) avec des profils variés : peu de sessions / beaucoup de sessions, une ou plusieurs sessions longues, au moins un compte avec achat. Pseudo renseigné (profil ou métrique).

---

### 2.4 Timeline (`/timeline`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **Joueurs uniques & sessions par jour** | Par jour : unique_players, total_sessions | Activité répartie sur plusieurs jours (au moins 2–3 jours différents) pour que la courbe ait plusieurs points. |
| **Temps de jeu (heures) par jour** | Par jour : total_play_time_hours | Idem : jouer et envoyer des snapshots sur plusieurs jours pour que getDailyMetrics renvoie des heures par jour. |

**Résumé scénario Timeline** :  
Utiliser l’app (et envoyer des snapshots) sur **plusieurs jours** (ou simuler des dates différentes en test) pour avoir des métriques quotidiennes.

---

### 2.5 Export (`/export`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **Export CSV/JSON** | Même source que Timeline : getDailyMetrics (date, unique_players, total_play_time_hours, total_sessions, avg_session_duration_minutes, purchase_attempts, purchase_successes) | Même scénario que Timeline : activité sur plusieurs jours avec snapshots à jour. |

---

### 2.6 Game Insights (`/insights`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **Completion rate (Flow)** | Par jeu : total_score_attempts, total_top10_attempts (ou équivalent) | Pour plusieurs jeux : effectuer des tentatives de score et atteindre le top 10 (ou l’objectif) sur au moins une partie. |
| **Frustration index (Flow)** | Par jeu : total_exits, total_launches | Sur au moins un jeu : quitter prématurément (exit) plusieurs fois pour que le taux exits/launches soit > 0. |
| **Game intensity (Flow)** | Par jeu : total_swipes, total_play_time | Swiper entre jeux (changer d’écran) et jouer pour avoir un ratio swipes / temps de jeu. |
| **Social engagement (Social)** | Par jeu : likes, comments, shares, unique_players | Liker, commenter et partager sur plusieurs jeux. |
| **Total bookmarks (Social)** | Par jeu : net_bookmarks ou total_bookmarks | Mettre des jeux en favoris (bookmark). |
| **Comments ratio (Social)** | Par jeu : total_comments / unique_players | Poster des commentaires sur des jeux. |
| **Conversion by play time (Monetization)** | Achats répartis par tranche de temps de jeu (0–1h, 1–3h, …) | Avoir des achats avec des temps de jeu cumulés variés (un achat après peu de jeu, un après plus de jeu). |
| **Cart abandonment (Monetization)** | purchaseAttempts, purchaseCancels | Initier des achats et en annuler au moins un (sans finaliser) pour que le taux d’abandon soit > 0. |
| **Pack le plus acheté (Monetization)** | purchaseTypes renseigné (product_id / type de pack) | Effectuer des achats en envoyant le type de produit (purchaseTypes) dans les snapshots. |
| **Conversion par jeu (Monetization)** | Par jeu : joueurs uniques ayant acheté / joueurs du jeu | Plusieurs jeux joués ; au moins un achat sur la période pour que certains jeux aient un taux de conversion > 0. |
| **Top trigger games / Purchases by type** | purchases_by_game (jeu le plus joué par les acheteurs), purchases_by_type (count par product_id) | Achats effectués + jeux joués avant achat ; purchaseTypes renseigné. |

**Résumé scénario Game Insights** :  
Flow : tentatives de score et top 10, exits, swipes et temps de jeu. Social : likes, bookmarks, commentaires, partages. Monetization : achats réussis et annulés, purchaseTypes renseigné, jouer à plusieurs jeux avant/après achat.

---

### 2.7 Cost & Performance (`/cost-metrics`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **KPI DB Requests, Bandwidth, Auth sessions** | Enregistrements dans `cost_metrics` avec metric_type = db_request, bandwidth, auth_session | S’assurer que l’app envoie bien des lignes dans `cost_metrics` pour chaque type (trackDBRequest, trackBandwidth, trackAuthSession ou équivalent), idéalement avec game_id pour les requêtes liées à un jeu. |
| **Coût par joueur** | DB requests + unique_players sur la période | Avoir à la fois des cost_metrics (db_request) et des user_analytics_snapshots (joueurs actifs). |
| **Évolution quotidienne** | cost_metrics avec des dates variées sur 7 jours | Envoyer des métriques de coût sur plusieurs jours (ou insérer des données de test sur 7 jours). |
| **Top 10 jeux par coût** | cost_metrics avec game_id renseigné (db_request, bandwidth) | Lors des appels de tracking (ex. trackDBRequest), passer le game_id quand l’action est liée à un jeu. |
| **Coût vs conversion, Efficacité monétisation** | getGameEfficiency : db_requests, conversion, achats par jeu | Combiner cost_metrics par game_id et achats par jeu (snapshots). |
| **Intensité bande passante** | cost_metrics (bandwidth) par game_id | Tracker la bande passante par jeu (game_id) si l’API le permet. |
| **Alertes actives** | Valeurs dépassant les seuils (ex. db_request > 100k) | En test : soit générer beaucoup de requêtes pour dépasser le seuil, soit baisser temporairement les seuils dans le code Cockpit. |
| **Churn cost index** | Coût par jeu + exit_rate par jeu | cost_metrics par game_id + jeux avec exit_rate > 0. |
| **Sessions par joueur actif / Évolution détaillée** | cost_metrics + daily trend (valeur, précédent, variation %) | Données cost_metrics sur plusieurs jours pour les courbes et tableaux de tendance. |

**Résumé scénario Cost** :  
L’app doit enregistrer dans `cost_metrics` les trois types (db_request, bandwidth, auth_session) avec une fréquence réaliste, et **passer le game_id** dès qu’une action est liée à un jeu (pour les vues par jeu). Utiliser l’app normalement (connexions, jeux, achats) pour avoir à la fois des coûts et des joueurs.

---

### 2.8 Préconisations (`/recommendations`)

Cette page agrège les mêmes données que Dashboard, Games, Users, Game Insights et Cost. **Résumé** : exécuter les scénarios ci‑dessus (jeux variés, likes/bookmarks/partages, exits, achats, purchaseTypes, leaderboard/scoreSaves, cost_metrics avec game_id) pour que les tableaux de préconisations (jeux à renforcer, jeux toxiques, bypass, viralité, conversion, etc.) soient remplis.

---

### 2.9 Modération (`/moderation`)

| Élément Cockpit | Donnée attendue | Scénario de test à faire dans l’app iOS |
|-----------------|-----------------|------------------------------------------|
| **Commentaires signalés** | Commentaires dans `comments` + signalements dans `comment_reports` | Poster des commentaires depuis l’app, puis les signaler (depuis l’app ou via un outil) pour avoir des lignes avec 2–4 et ≥ 5 signalements. |
| **Cartes Critiques / Attention / Masqués / Visibles** | comment_reports (count), est_masque sur comments | Idem + modération (masquer/afficher) si l’app ou un back-office le permet. |

---

## 3. Checklist minimale pour « tous les tableaux remplis »

À donner à l’IA qui construit l’app iOS : **génère un scénario de test (ou une checklist) qui garantit que les actions suivantes sont effectuées**, afin que Cockpit reçoive des données partout :

1. **Plusieurs utilisateurs** (au moins 2–3 comptes) avec **plusieurs jours d’activité** (snapshots envoyés sur au moins 2–3 jours).
2. **Plusieurs jeux** : au moins 5 jeux différents joués (lancements, temps de jeu, certains avec exit prématuré).
3. **Sessions** : nombre de sessions varié (sessionCount) et **durée de session** variée (totalSessionDuration).
4. **Achats** : au moins **1 achat réussi** (purchaseSuccesses), au moins **1 tentative annulée** (purchaseCancels), et **purchaseTypes** renseigné (product_id / type de pack).
5. **Social** : pour plusieurs jeux : **like**, **bookmark**, **partage** (share), **commentaire** (comments).
6. **Scores** : **tentatives de score** (scoreAttempts), **top 10 atteint** (top10Attempts), **vue leaderboard** (leaderboardViews), **sauvegarde de score** (scoreSaves).
7. **Cost** : l’app envoie des lignes dans **cost_metrics** pour **db_request**, **bandwidth**, **auth_session**, avec **game_id** quand l’action est liée à un jeu.
8. **Modération** : au moins un **commentaire** et des **signalements** (comment_reports) pour tester les cartes et le tableau.
9. **Pseudo** : au moins un user avec **pseudo** (metrics.pseudo ou profiles.username) pour la liste Utilisateurs.
10. **(Optionnel RGPD)** : pour le tableau « Comptes inactifs > 3 ans », soit des données de test avec snapshot_date ancienne, soit documenter que ce cas est testé manuellement en BDD.

---

## 4. Prompt à coller pour l’IA de l’app iOS

Tu peux copier-coller le bloc suivant dans Cursor (projet de l’app iOS) pour demander les scénarios de test :

```
En me basant sur le document Cockpit "SCENARIOS-TESTS-ALIMENTATION-COCKPIT.md" (voir ci-dessous ou dans le repo Cockpit), génère pour l’app iOS :

1. Une **checklist de tests manuels** (étape par étape) que un QA ou un dev peut suivre pour s’assurer que toutes les vues et tous les tableaux de Cockpit reçoivent des données (Dashboard, Games, Users, Timeline, Export, Game Insights, Cost & Performance, Préconisations, Modération).

2. Pour chaque étape, indiquer :
   - l’action utilisateur dans l’app (ex. « Lancer le jeu X », « Finaliser un achat »),
   - le résultat attendu côté Neon (quelle table/colonne est alimentée),
   - et quelle vue Cockpit est ainsi remplie.

3. Si des données ne peuvent pas être obtenues sans outil externe (ex. comptes inactifs > 3 ans), le préciser et proposer une alternative (données de test en BDD, script SQL, etc.).

Référence : le fichier SCENARIOS-TESTS-ALIMENTATION-COCKPIT.md du projet Cockpit décrit vue par vue les données attendues et les scénarios à exécuter.
```

---

## 5. Fichiers de référence Cockpit

- **RECAP-COCKPIT-PAGE-PAR-PAGE.md** : correspondance détaillée page → métriques → tables/champs.
- **README-VERIFICATION.md** (dans `docs/verification/`) : comment vérifier que les données remontent bien.
- **Inventaire des données envoyées par l’app iOS** (résultat du PROMPT-CURSOR-APP-IOS.md) : pour vérifier que l’app envoie bien toutes les clés attendues (sessionCount, gameLaunches, purchaseTypes, etc.).
