# Prompt pour vérifier l’alimentation de `cost_metrics` (projet Labjoo)

Le dashboard **Cockpit** affiche la section **Cost & Performance** (Overview, Game Efficiency, Alerts, Trends) à partir de la table Neon **`cost_metrics`**. Si cette table n’est pas alimentée correctement par l’app iOS, les graphiques restent vides.

**Objectif du prompt ci‑dessous** : demander à Cursor (dans le projet **Labjoo / app iOS**) d’analyser le code qui écrit dans `cost_metrics` et de produire un **rapport de conformité** avec ce que Cockpit attend.

---

## Ce que Cockpit attend (rappel)

| Colonne      | Type      | Attendu |
|-------------|-----------|--------|
| `created_at` | TIMESTAMP | Date/heure de l’enregistrement |
| `metric_type` | TEXT     | **Exactement** : `'db_request'` \| `'bandwidth'` \| `'auth_session'` |
| `metric_value` | NUMERIC | Nombre (requêtes, octets, ou sessions selon le type) |
| `game_id`   | TEXT (optionnel) | Renseigné si la métrique est liée à un jeu (pour Game Efficiency, Bandwidth Intensity, Churn Cost) |

Cockpit ne lit **pas** la colonne `metric_unit` ; il utilise uniquement `metric_type` + `metric_value`.

---

## Début du prompt à copier

```
Le dashboard Cockpit lit la table Neon **cost_metrics** pour afficher Cost & Performance (Overview, Game Efficiency, Alerts, Trends). Cockpit attend les colonnes suivantes avec des valeurs précises pour metric_type.

**Attendu Cockpit :**
- Colonnes lues : created_at, metric_type, metric_value, game_id (optionnel).
- metric_type doit être **exactement** l’un de : 'db_request' | 'bandwidth' | 'auth_session'.
- metric_value : nombre (requêtes SQL pour db_request, octets pour bandwidth, nombre de sessions pour auth_session).
- game_id : renseigné quand la métrique est liée à un jeu (ex. requêtes ou bande passante par jeu).

Analyse le projet iOS (Labjoo) et repère tout le code qui **écrit** dans la table cost_metrics (ex. CostTrackingService, NeonRepository, etc.). Puis produis un **rapport de conformité** au format ci‑dessous.

---

**Rapport à générer (remplis chaque ligne) :**

1. **Fichiers / classes qui insèrent dans cost_metrics**  
   Liste des chemins et noms de classes ou fonctions qui exécutent un INSERT (ou upsert) vers la table cost_metrics.

2. **Fréquence d’envoi**  
   À quel moment les lignes sont-elles insérées ? (ex. batch toutes les 30 s, à chaque requête DB, à chaque session auth.)

3. **Valeurs de metric_type utilisées côté iOS**  
   Lister les chaînes exactes écrites dans la colonne metric_type (ex. "db_request", "bandwidth", "auth_session"). Si d’autres valeurs sont utilisées (ex. "db_request_count"), indiquer **à corriger** pour que Cockpit les reconnaisse.

4. **Colonnes effectivement écrites**  
   Pour chaque insert : quelles colonnes sont renseignées (created_at, metric_type, metric_value, game_id, metric_unit, user_id, metadata, etc.) ? Cockpit n’utilise que created_at, metric_type, metric_value, game_id.

5. **game_id renseigné pour les métriques par jeu ?**  
   Lorsqu’une requête DB ou de la bande passante est associée à un jeu, la ligne insérée contient-elle un game_id (string, ex. "stack_boom") ? Réponse : Oui / Non / Partiel (préciser).

6. **Synthèse conformité Cockpit**  
   - metric_type = 'db_request' | 'bandwidth' | 'auth_session' uniquement : **OK** / **À corriger** (préciser les valeurs actuelles).  
   - metric_value en nombre (integer/numeric) : **OK** / **À corriger**.  
   - game_id renseigné pour métriques par jeu (si applicable) : **OK** / **À corriger** / **Non applicable**.

7. **Recommandations**  
   Si quelque chose n’est pas aligné avec Cockpit, proposer les modifications minimales (ex. renommer un metric_type, ajouter l’envoi de game_id pour les requêtes par jeu).
```

---

## Fin du prompt à copier

---

## Après exécution

- Si le rapport indique **OK** partout : l’app envoie déjà les bons types et colonnes ; si la table reste vide en base, vérifier la connexion Neon, les erreurs d’insert et le consentement / l’activation du tracking coûts.
- Si le rapport indique **À corriger** : appliquer les changements proposés dans le projet iOS (ex. utiliser exactement `db_request`, `bandwidth`, `auth_session`, et renseigner `game_id` quand la métrique est liée à un jeu), puis revérifier dans Cockpit (page Vérification + Cost & Performance).
- Vous pouvez coller le rapport ici (dans le projet Cockpit) pour qu’on vérifie ensemble la conformité avec les requêtes Cockpit.
