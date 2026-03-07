# Plan de correction des métriques – Alignement iOS (Labjoo) ↔ Cockpit

Document dérivé de l’**Inventaire des données envoyées par l’app iOS vers Neon**. Ce plan indique les actions à mener côté **iOS** et côté **Cockpit** pour que les métriques affichées soient correctes et complètes.

---

## Synthèse des écarts identifiés

| Problème | Impact Cockpit | Cause | Action |
|----------|----------------|--------|--------|
| **Reset des métriques après envoi** | Deltas faux (KPIs, Daily, Games, etc.) | Cockpit calcule (MAX en fenêtre − MAX avant fenêtre) ; si iOS reset après chaque envoi, les valeurs ne sont plus cumulatives | **iOS** : envoyer cumuls sans reset (ou Cockpit change de logique) |
| **`pseudo` absent de `metrics`** | Users : pseudo vide ou fallback | Cockpit lit `metrics->>'pseudo'` puis fallback `profiles.username` | **Cockpit** : s’appuyer sur `profiles` / `comments` (déjà le cas) ; **iOS** optionnel : ajouter `pseudo` dans `metrics` |
| **`trackSessionEnd` non appelé** | `totalSessionDuration` à 0 → durée moyenne session fausse | Pas d’appel à la fin de session | **iOS** : appeler `trackSessionEnd` en fin de session |
| **Aucun appel aux `track*` achats / likes / bookmarks / comments / score** | Monetization, Social, Flow partiellement vides | APIs présentes mais pas branchées dans les vues | **iOS** : brancher les appels dans `PurchaseService`, vues social, commentaires, score |
| **`cost_metrics.metric_unit`** | Aucun | Cockpit n’utilise que `metric_type` et `metric_value` | Aucune action |

---

## Partie 1 – Côté iOS (Labjoo)

### 1.1 (Critique) Cumuls sans reset après envoi

**Constat** : Aujourd’hui, après un envoi réussi de snapshot, les métriques locales sont réinitialisées. Le snapshot suivant ne contient que la période « depuis le dernier envoi ».  
**Problème** : Cockpit calcule les **deltas** par utilisateur comme :  
`(MAX des valeurs dans la fenêtre de dates) − (dernière valeur avant la fenêtre)`.  
Cela n’a de sens que si les valeurs sont **cumulatives dans le temps** (ex. total sessions depuis l’installation). Avec un reset, les deltas deviennent incohérents (mélange de périodes différentes).

**Action** :

- **Option A (recommandée)** : Ne plus réinitialiser les compteurs après envoi. Conserver des **cumuls « tout au long de la vie »** (ou depuis l’installation) dans chaque snapshot. Les champs `sessionCount`, `totalSessionDuration`, `gameLaunches`, `gamePlayTime`, etc. doivent représenter le **total cumulé** pour cet utilisateur.
- **Option B** : Si vous tenez au reset (ex. pour limiter la taille du payload), il faudrait que Cockpit passe à une logique « somme des incréments par snapshot » dans la fenêtre, ce qui implique des changements importants dans les requêtes et un format d’événements incrémentaux. Non recommandé sauf contrainte forte.

**Fichiers à modifier (Option A)** :  
`Labjoo/Services/SnapshotManager.swift` (ou équivalent) : supprimer ou désactiver la réinitialisation des métriques après un envoi réussi.  
`Labjoo/Services/AnalyticsService.swift` : s’assurer que les compteurs sont bien cumulatifs (jamais remis à zéro après envoi).

---

### 1.2 Session : appeler `trackSessionEnd`

**Constat** : `totalSessionDuration` reste à 0 car `trackSessionEnd` n’est pas appelé.  
**Impact** : Dans Cockpit, « durée moyenne de session » (Dashboard, Users, Daily, Export) est fausse.

**Action** : Appeler `trackSessionEnd()` (ou équivalent) à la fin de chaque session (fermeture de l’app, passage en arrière-plan prolongé, ou sortie du flux de jeu). Mettre à jour `totalSessionDuration` avec la durée de la session qui se termine.

**Fichiers** : Points d’entrée de fin de session (ex. `AppDelegate` / `SceneDelegate`, ou contrôleur principal) + `Labjoo/Services/AnalyticsService.swift`.

---

### 1.3 Pseudo dans `metrics` (optionnel)

**Constat** : Cockpit utilise d’abord `metrics->>'pseudo'`, puis fallback `profiles.username` ou `comments.username`.  
**Impact** : Si `profiles` est bien rempli, la page Users peut déjà afficher le pseudo. L’ajout de `pseudo` dans `metrics` évite un JOIN et garantit la cohérence.

**Action (optionnelle)** : Lors de la construction du snapshot, ajouter dans l’objet `metrics` une clé `pseudo` (string) avec le username courant (ex. lu depuis `profiles` ou session).  
**Fichier** : `Labjoo/Services/AnalyticsService.swift` (struct `ConsolidatedMetrics` + endroit où le snapshot est construit).

---

### 1.4 Brancher les événements analytics manquants

Les APIs existent mais ne sont pas appelées depuis les vues. À brancher :

| Événement | Méthode / API côté iOS | Où brancher |
|-----------|------------------------|-------------|
| **Like / Unlike** | `trackLikeToggle(gameId:liked:)` | Vue détail jeu / écran like (ex. après action sur bouton like). |
| **Bookmark / Unbookmark** | `trackBookmarkToggle(gameId:bookmarked:)` | Vue liste jeux / détail (ex. `PremiumGameContainerView` ou écran favoris). |
| **Création de commentaire** | `trackCommentCreate(gameId:)` | Après envoi réussi d’un commentaire dans `CommentService` / UI commentaires. |
| **Tentative de score** | `trackScoreAttempt(gameId:)` | Après soumission d’un score (ex. dans `ScoreService` ou écran de fin de partie). |
| **Score sauvegardé / Top 10** | `trackScoreSave`, `trackTop10Attempt` (si distincts) | Même contexte que score (sauvegarde réussie, entrée dans le top 10). |
| **Consultation leaderboard** | `trackLeaderboardView(gameId:)` | À l’ouverture de l’écran leaderboard pour un jeu. |
| **Tentative d’achat** | `trackPurchaseAttempt()` (ou équivalent) | Dans `PurchaseService` au début du flux d’achat. |
| **Achat réussi** | `trackPurchaseSuccess(productId:)` (et incrément `purchaseTypes[productId]`) | Après validation StoreKit / serveur. |
| **Annulation achat** | `trackPurchaseCancel()` | Quand l’utilisateur annule le flux d’achat. |

**Fichiers** :  
- Achats : `Labjoo/Services/PurchaseService.swift`  
- Social : vues qui gèrent like/bookmark/partage + `Labjoo/Services/SocialShareService.swift` (déjà partiellement branché), écran commentaires  
- Scores : `Labjoo/Services/ScoreService.swift`, écran leaderboard, écran de fin de partie

---

### 1.5 Cohérence des identifiants

**game_id** : Déjà en snake_case (ex. `stack_boom`, `speed_tap`) → compatible Cockpit.  
**product_id** : Format StoreKit (ex. `com.walleegames.Labjoo.premium`) → Cockpit attend un string par type de produit ; pas de changement requis côté Cockpit si `purchaseTypes` est bien alimenté.

Aucune action supplémentaire côté identifiants si les `track*` sont bien branchés avec ces IDs.

---

## Partie 2 – Côté Cockpit

### 2.1 Pseudo utilisateur (Users)

**Constat** : Cockpit lit déjà `metrics->>'pseudo'` puis fait un LEFT JOIN sur `profiles` et sur une sous-requête `comments` (username).  
**Action** : Aucune modification obligatoire. Si l’app iOS remplit `profiles.username` (inscription / mise à jour), la page Users affichera le pseudo. Optionnel : documenter que l’ajout de `pseudo` dans `metrics` (côté iOS) évite des JOINs.

---

### 2.2 Clés `metrics` non utilisées par Cockpit

L’iOS envoie `scoreSaves`, `leaderboardViews`, `buttonClicks`, `zoneClicks`, `lastSessionStart`, `lastSessionEnd`, `firstEventDate`, `lastEventDate`, `appVersion`, `deviceType`. Cockpit ne les utilise pas aujourd’hui.  
**Action** : Aucune pour l’alignement actuel. On pourra les exploiter plus tard (ex. analytics avancées, debug) si besoin.

---

### 2.3 Table `cost_metrics`

Cockpit utilise `metric_type` (`'db_request'`, `'bandwidth'`, `'auth_session'`), `metric_value`, `created_at`, `game_id`. La colonne `metric_unit` (présente côté iOS) n’est pas lue par Cockpit.  
**Action** : Aucune. S’assurer que l’app iOS envoie bien des lignes avec ces `metric_type` pour que les graphiques Cost & Performance soient alimentés.

---

### 2.4 Fallbacks et libellés

- **« Non renseigné »** pour le pack le plus acheté : déjà en place quand aucun achat par type n’existe. Une fois `purchaseTypes` alimenté côté iOS, le libellé disparaîtra ou affichera le vrai product_id (on pourra ajouter un mapping product_id → nom lisible plus tard).
- **Cart abandonment** : fallback à 0 si aucune donnée. Idem, correct une fois `purchaseAttempts` / `purchaseCancels` envoyés.

Aucune modification requise pour l’alignement de base.

---

### 2.5 (Optionnel) Timeline dans la navigation

**Constat** : La route `/timeline` existe mais n’apparaît pas dans la sidebar.  
**Action** : Si la page Timeline doit être visible, ajouter un lien « Timeline » dans `Sidebar.tsx` vers `/timeline`.

---

## Partie 3 – Ordre de mise en œuvre recommandé

1. **iOS – Cumuls sans reset (1.1)**  
   Sans cela, les indicateurs Cockpit (KPIs, Daily, Games, Users, Insights) resteront incohérents. À traiter en premier.

2. **iOS – trackSessionEnd (1.2)**  
   Rapide à brancher, corrige immédiatement les durées de session.

3. **iOS – Brancher les track* (1.4)**  
   Par priorité métier : achats (Monetization), puis likes/bookmarks/comments (Social), puis score/top10/leaderboard (Flow). On peut faire par vague (d’abord achats, puis social, puis scores).

4. **iOS – Pseudo dans metrics (1.3)**  
   Optionnel, après ou en parallèle de 1.2 / 1.4.

5. **Cockpit – Vérifications (2.x)**  
   Pas de changement critique ; vérifier en prod que `profiles` et `cost_metrics` sont bien alimentés. Optionnel : ajouter Timeline dans la sidebar (2.5).

---

## Partie 4 – Vérification après corrections

- **Dashboard** : KPIs (joueurs, temps, sessions, conversion) et courbes d’activité cohérents sur une fenêtre où des snapshots sont envoyés ; durée moyenne session > 0 si `trackSessionEnd` est branché.
- **Games** : Tableau avec lancements, temps, swipes, exits, likes, bookmarks, shares, comments, score/top10 renseignés dès que les `track*` sont appelés.
- **Users** : Pseudo affiché (depuis `profiles` ou `metrics.pseudo`), durées et conversion cohérentes.
- **Game Insights – Flow** : Completion (scoreAttempts / top10Attempts), frustration (exits/launches), intensité (swipes/heure) renseignés.
- **Game Insights – Social** : Taux d’engagement, bookmarks, comments/player renseignés.
- **Game Insights – Monetization** : Conversion par tranche de temps, cart abandonment, pack le plus acheté, achats par jeu/type renseignés une fois les track* achats branchés.
- **Cost & Performance** : Overview et graphiques remplis si `cost_metrics` est alimenté par l’iOS (batch 30 s / 100 lignes).

---

## Résumé des livrables

| Où | Quoi |
|----|------|
| **iOS** | Ne plus reset les métriques après envoi ; cumuls « vie entière » dans les snapshots. |
| **iOS** | Appeler `trackSessionEnd` en fin de session. |
| **iOS** | Brancher like, bookmark, comment, score/top10/leaderboard, achats (attempt/success/cancel) dans les vues et services concernés. |
| **iOS** | (Optionnel) Ajouter `pseudo` dans `metrics`. |
| **Cockpit** | Aucun changement obligatoire ; optionnel : lien Timeline dans la sidebar. |

Une fois 1.1 et 1.2 en place et quelques `track*` branchés (achats + social), les écrans Cockpit correspondants se rempliront progressivement avec des données réelles.
