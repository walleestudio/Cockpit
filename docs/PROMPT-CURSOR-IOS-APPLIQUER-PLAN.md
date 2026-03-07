# Prompt à donner à Cursor (projet app iOS / Labjoo) pour appliquer le plan de correction des métriques

**Objectif** : Faire appliquer par Cursor les recommandations du plan d’alignement iOS ↔ Cockpit, **uniquement** sur la couche **statistiques / analytics** (tracking, snapshots, envoi Neon). Aucune modification des données ou de la logique de gameplay.

---

## Cadre important (à respecter strictement)

- **À modifier** : uniquement la **couche analytics / statistiques** :
  - Envoi des snapshots vers Neon (`user_analytics_snapshots`, objet `metrics`).
  - Appels aux méthodes de **tracking** (`track*`) qui **enregistrent** qu’un événement a eu lieu (session, like, achat, score, etc.) pour le dashboard Cockpit.
  - Gestion des **cumuls** dans les métriques (ne plus reset après envoi).
  - Appel à **trackSessionEnd** en fin de session.
  - (Optionnel) Ajout du **pseudo** dans l’objet `metrics`.

- **À ne pas modifier** :
  - **Logique de jeu** : règles, calcul des scores en jeu, contenu des parties.
  - **Données métier du jeu** : sauvegarde des scores pour le leaderboard, likes/bookmarks en base (tables `scores`, `likes`, `bookmarks`, etc.) — ces écritures restent telles quelles.
  - **Comportement fonctionnel** : un appel à `trackLikeToggle` ou `trackPurchaseSuccess` ne doit **que** mettre à jour les compteurs analytics locaux (puis le snapshot) ; il ne doit pas changer la logique d’affichage, d’achat ou de like dans l’app.

En résumé : on **ajoute ou on ajuste uniquement l’enregistrement d’événements pour les statistiques** (Cockpit). On ne touche pas au gameplay ni aux données qui font tourner l’app (scores affichés, achats réels, état des likes/bookmarks en BDD).

---

## Début du prompt à copier

```
Contexte : l’app envoie des analytics vers PostgreSQL (Neon) pour un dashboard nommé Cockpit. Il faut appliquer les corrections suivantes **uniquement sur la couche statistiques / analytics** (tracking, snapshots, métriques envoyées vers Neon). Tu ne dois **pas** modifier la logique de gameplay, le calcul des scores en jeu, ni les écritures métier existantes (scores, likes, bookmarks, comments en base) : seulement ajouter ou ajuster les **appels de tracking** et la **gestion des cumuls** pour que Cockpit affiche les bonnes métriques.

À faire, dans l’ordre :

---

**1. Cumuls sans reset après envoi (critique)**

Aujourd’hui les métriques sont réinitialisées après chaque envoi réussi de snapshot. Cockpit calcule des deltas (MAX en fenêtre − MAX avant fenêtre), donc il faut des **valeurs cumulatives dans le temps** (ex. total depuis l’installation).

- Dans `SnapshotManager` (ou l’équivalent qui envoie le snapshot) : **supprimer ou désactiver la réinitialisation** des compteurs / métriques après un envoi réussi vers Neon.
- Dans `AnalyticsService` : s’assurer que les compteurs (`sessionCount`, `totalSessionDuration`, `gameLaunches`, `gamePlayTime`, etc.) restent **cumulatifs** et ne sont **jamais remis à zéro** après envoi. Seul l’envoi du snapshot est déclenché par le seuil (ex. temps de jeu) ; les valeurs envoyées doivent être le **total cumulé** pour cet utilisateur.

Fichiers typiques : `Labjoo/Services/SnapshotManager.swift`, `Labjoo/Services/AnalyticsService.swift`.

---

**2. Appeler trackSessionEnd en fin de session**

`totalSessionDuration` est à 0 car la fin de session n’est pas enregistrée. Il faut appeler `trackSessionEnd()` (ou l’équivalent dans AnalyticsService) à la fin de chaque session utilisateur (fermeture de l’app, passage en arrière-plan prolongé, ou sortie du flux de jeu), en mettant à jour la durée de la session qui se termine.

- Ajouter l’appel au(x) bon(s) endroit(s) : ex. `AppDelegate` / `SceneDelegate`, ou point de sortie du flux principal / du jeu. Ne pas modifier la logique métier de l’app ; uniquement enregistrer l’événement pour les stats.

---

**3. Brancher les appels de tracking existants (analytics uniquement)**

Les méthodes de tracking existent déjà dans AnalyticsService mais ne sont pas appelées depuis les écrans. Il faut **uniquement ajouter les appels** aux bons endroits (après l’action utilisateur réussie), **sans changer** le comportement fonctionnel (achat, like, score sauvegardé, etc.) :

| Événement | Méthode à appeler | Où l’appeler (après l’action réussie) |
|-----------|-------------------|---------------------------------------|
| Like / Unlike | `trackLikeToggle(gameId:liked:)` | Vue où l’utilisateur like/unlike un jeu (ex. après mise à jour réussie du like en base). |
| Bookmark / Unbookmark | `trackBookmarkToggle(gameId:bookmarked:)` | Vue où l’utilisateur ajoute/retire un favori (ex. après mise à jour réussie du bookmark). |
| Création de commentaire | `trackCommentCreate(gameId:)` | Après envoi réussi du commentaire (ex. dans CommentService ou callback UI). |
| Tentative de score | `trackScoreAttempt(gameId:)` | Après soumission du score (ex. dans ScoreService ou écran de fin de partie) — **à côté** de l’écriture score existante, pas à la place. |
| Score sauvegardé / Top 10 | `trackScoreSave` / `trackTop10Attempt` si présents | Même contexte que score (sauvegarde réussie, entrée top 10). |
| Ouverture leaderboard | `trackLeaderboardView(gameId:)` | À l’affichage de l’écran leaderboard pour un jeu. |
| Début flux achat | `trackPurchaseAttempt()` (ou équivalent) | Dans PurchaseService au début du flux d’achat. |
| Achat réussi | `trackPurchaseSuccess(productId:)` (+ incrément `purchaseTypes[productId]`) | Après validation StoreKit / serveur. |
| Annulation achat | `trackPurchaseCancel()` | Quand l’utilisateur annule le flux d’achat. |

Fichiers concernés : `PurchaseService.swift`, vues/écrans like/bookmark/commentaires, `ScoreService.swift`, écran leaderboard, écran de fin de partie. **Ne pas modifier** la logique d’achat, de like, de sauvegarde de score ; seulement **ajouter** l’appel au `track*` correspondant après le succès de l’action.

---

**4. (Optionnel) Pseudo dans metrics**

Lors de la construction du snapshot (objet `metrics` envoyé dans `user_analytics_snapshots`), ajouter une clé `pseudo` (string) avec le username courant (ex. lu depuis la session ou profiles). Fichier : `AnalyticsService.swift` (struct des métriques / endroit où le snapshot est construit).

---

**Rappel** : Aucune modification des données de gameplay (scores en jeu, règles, contenu des parties) ni des écritures métier existantes (scores, likes, bookmarks, comments en base). Uniquement : cumuls sans reset, trackSessionEnd, appels aux track* aux bons endroits, et optionnellement pseudo dans metrics.

Après avoir appliqué les changements, liste brièvement ce que tu as modifié (fichiers + résumé des changements) pour vérification.
```

---

## Fin du prompt à copier

---

## Utilisation

1. Ouvrir le **projet de l’app iOS (Labjoo)** dans Cursor.
2. Copier **tout le bloc** entre « Début du prompt à copier » et « Fin du prompt à copier » (sans les titres de section « Début » / « Fin »).
3. Coller dans le chat Cursor du projet iOS et lancer.
4. Vérifier que les modifications concernent bien uniquement : SnapshotManager, AnalyticsService, appels track* dans PurchaseService / vues social / ScoreService / commentaires / leaderboard, et points d’entrée de fin de session. Aucun changement dans la logique des jeux ni dans le calcul des scores pour le jeu lui-même.
