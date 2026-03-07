# Prompt à coller dans Cursor (projet de l’app iOS)

**À faire :** ouvrir le projet de l’**app iOS** dans Cursor, puis coller **tout le bloc ci-dessous** (entre les deux marqueurs) dans le chat Cursor. Demander à Cursor de produire **un seul document** (voir format demandé à la fin du prompt).

---

## Début du prompt à copier

```
Tu es un analyste du code source d’une app iOS qui envoie des analytics et des métriques vers une base PostgreSQL (Neon). Un dashboard nommé Cockpit consomme ces données. On a besoin d’un inventaire complet de ce que l’app iOS envoie vers Neon, pour aligner les métriques avec ce que Cockpit attend.

Analyse tout le projet iOS (Swift/Objective-C, config, appels réseau, persistence, analytics) et produis UN SEUL document de sortie au format Markdown, avec exactement les sections suivantes. Réponds uniquement par ce document, sans texte avant ou après.

---

## Format de sortie obligatoire

Génère un seul document Markdown contenant, dans l’ordre, les sections suivantes. Utilise les titres exacts (pour parsing automatique).

### 1. Envoi des données vers Neon

- Comment l’app envoie les données vers Neon : appels directs (Postgres/HTTP), API backend, SDK, autre ?
- Fichiers et classes responsables (chemins et noms).
- Fréquence : à chaque événement, en batch, à la fermeture de l’app, au heartbeat, etc.
- URL / endpoint / config utilisée (sans secrets réels : mettre des placeholders si besoin).

### 2. Schéma SQL des tables écrites par l’app

Pour chaque table que l’app iOS (ou son backend) écrit dans Neon, donner le schéma réel : nom de la table, colonnes, types (ex. UUID, TEXT, TIMESTAMP, JSONB, BIGINT).  
Si le schéma est dans des migrations ou du code, le reconstituer en SQL (CREATE TABLE ou équivalent).  
Tables à couvrir en priorité : `user_analytics_snapshots`, `cost_metrics`, `comments`, `comment_reports`, `profiles`, `game_configurations`. Indiquer si une table n’est pas utilisée par l’app.

### 3. Structure réelle de l’objet `metrics` (user_analytics_snapshots)

Décrire la structure du JSON/objet envoyé dans la colonne `metrics` de `user_analytics_snapshots` :
- Toutes les clés utilisées côté iOS (noms exacts).
- Type de chaque clé : number, string, object, etc. Pour les objets (ex. par game_id), donner la forme : `{ [game_id]: number }`.
- Indiquer si les valeurs sont cumulatives (total depuis l’inscription) ou par période.

Fournir ensuite un **exemple concret (anonymisé)** du JSON `metrics` tel que l’app pourrait l’envoyer, dans un bloc de code :

```json
{
  "exemple_metrics": { ... }
}
```

### 4. Inventaire des événements / métriques enregistrés

Liste des événements ou métriques que l’app enregistre (ex. ouverture de session, lancement d’un jeu, achat, like, swipe, exit, commentaire, partage, etc.). Pour chaque événement :
- Nom ou identifiant côté iOS.
- Où c’est persisté : table, colonne ou clé dans `metrics`.
- Si c’est envoyé en temps réel ou en batch.

Présenter sous forme de tableau si possible :

| Événement (côté iOS) | Table / clé `metrics` | Temps réel / batch |

### 5. Identifiants (game_id, product_id)

- Format et source de `game_id` (UUID, string, id interne, etc.).
- Format et source de `product_id` (ou équivalent) pour les achats / packs.
- Exemples de valeurs (anonymisées) si pertinent.

### 6. Tables Neon non alimentées par l’app

Parmi les tables suivantes, indiquer celles que l’app n’écrit pas du tout (ou pas encore) : `user_analytics_snapshots`, `cost_metrics`, `comments`, `comment_reports`, `profiles`, `game_configurations`. Pour chacune non alimentée, indiquer « Non utilisée » ou « Non alimentée » avec une brève raison si connue.

### 7. Correspondance avec les clés attendues par Cockpit

Cockpit attend dans `metrics` les clés exactes suivantes (entre autres) :  
`sessionCount`, `totalSessionDuration`, `purchaseAttempts`, `purchaseSuccesses`, `purchaseCancels`, `pseudo`, `gameLaunches`, `gamePlayTime`, `gameSwipes`, `gameExits`, `likes`, `bookmarks`, `shares`, `comments`, `scoreAttempts`, `top10Attempts`, `purchaseTypes`.

Pour chaque clé :
- **OK** si l’app envoie bien cette clé avec le même nom.
- **Différent** si l’app envoie une clé équivalente mais avec un autre nom (préciser le nom côté iOS).
- **Manquant** si l’app n’envoie pas cette donnée.

Présenter en tableau :

| Clé attendue Cockpit | Statut (OK / Différent / Manquant) | Nom ou remarque côté iOS |

### 8. Fichiers de référence

Liste des chemins de fichiers du projet iOS les plus importants pour :
- Connexion / envoi vers Neon (ou backend).
- Construction des analytics / snapshots / `metrics`.
- Définition des événements (analytics, achats, jeux).

---

Fin du document. Ne rien ajouter après la section 8.
```

---

## Fin du prompt à copier

---

## Après avoir exécuté le prompt

1. Récupérer **tout** le Markdown généré par Cursor (depuis le premier `#` jusqu’à la fin de la section 8).
2. Le coller dans un fichier ou le renvoyer dans le chat du projet **Cockpit** pour que l’assistant puisse élaborer le plan de correction des métriques (alignement iOS ↔ Cockpit).
