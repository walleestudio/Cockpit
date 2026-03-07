# Vérifier que Cockpit affiche bien les données Neon

Deux moyens de vérifier que les métriques affichées dans Cockpit correspondent bien aux données en base.

---

## Méthode 1 : Page de vérification Cockpit (recommandée)

Cockpit expose une page qui appelle **les mêmes services** que le Dashboard, Timeline, Games et Cost, et affiche le **JSON brut** renvoyé.

1. Lancer Cockpit (`npm run dev`).
2. Aller sur **`/verify`** (ex. `http://localhost:5173/verify`).
3. La page charge :
   - **KPIs** sur 7 jours (même logique que les 4 cartes du Dashboard)
   - **Métriques quotidiennes** sur 30 jours (même logique que Timeline et Export)
   - **Résumé jeux** (15 premiers) sur 30 jours (même logique que le tableau Games / Jeux populaires)
   - **Cost Overview** sur 7 jours (même logique que Cost & Performance > Overview)
4. **Comparer valeur par valeur** (voir la checklist ci‑dessous).
5. Utiliser **« Copier tout le JSON »** pour garder une trace ou comparer après un changement.

---

### Checklist de comparaison (méthode 1)

Ouvrez **deux onglets** : un sur **Vérification** (`/verify`), l’autre sur la page à comparer. Les chiffres doivent être **identiques** (à l’arrondi près pour les pourcentages).

#### A. KPIs (4 cartes du Dashboard)

1. Sur le **Dashboard**, réglez le **sélecteur de dates** sur les **7 derniers jours** (date de fin = aujourd’hui, date de début = il y a 7 jours).
2. Sur **Vérification**, dans le JSON, repérez l’objet **`kpis`**.
3. Comparez :

   | Où regarder (Dashboard)        | Clé dans le JSON `kpis` | À vérifier |
   |-------------------------------|-------------------------|------------|
   | Carte « Joueurs uniques »     | `unique_players`        | Même nombre |
   | Carte « Temps de Jeu Total » | `total_play_time_hours` | Même nombre (en heures) |
   | Carte « Sessions totales »   | `total_sessions`       | Même nombre |
   | Carte « Taux de conversion » | `conversion_rate_percent` | Même % (ex. 12.5) |

#### B. Métriques quotidiennes (Timeline / Export)

1. Sur **Timeline** (ou Export), la période par défaut est 30 jours ; gardez-la ou réglez sur **30 derniers jours**.
2. Sur **Vérification**, repérez le tableau **`dailyMetrics`** dans le JSON (liste de jours).
3. Pour **quelques jours** (ex. le premier de la liste, un au milieu) :
   - Sur **Timeline** : regardez la **courbe** (point du jour = joueurs, ou temps de jeu selon la courbe).
   - Dans **`dailyMetrics`** : trouvez l’entrée dont `date` correspond à ce jour ; comparez `unique_players`, `total_sessions`, `total_play_time_hours` avec ce que la courbe affiche pour ce jour.
4. Optionnel : sur **Export**, téléchargez le CSV sur 30 jours ; les lignes du CSV doivent correspondre aux entrées de **`dailyMetrics`** (mêmes colonnes : date, unique_players, total_play_time_hours, total_sessions, etc.).

#### C. Jeux (tableau Games)

1. Allez sur la page **Games** (période = 30 jours côté backend, pas de sélecteur sur cette page).
2. Sur **Vérification**, repérez le tableau **`games`** dans le JSON (15 premiers jeux).
3. Pour **chaque jeu** (ou au moins les 2–3 premiers) :
   - Dans le **tableau Games** : notez **game_id**, **Joueurs**, **Lancements**, **Temps moyen** (en min).
   - Dans **`games`** : trouvez l’objet avec le même `game_id` ; comparez `unique_players`, `total_launches`, `avg_play_time_minutes`. Ils doivent être identiques.

#### D. Cost Overview (Cost & Performance)

1. Allez sur **Cost & Performance** → onglet **Overview**.
2. Sur **Vérification**, repérez **`costOverview`** dans le JSON (peut être `null` si la table `cost_metrics` est vide).
3. Si `costOverview` n’est pas null, comparez :
   - La carte **« DB Requests (7j) »** → `total_db_requests`
   - La carte **« Bandwidth (7j) »** → `total_bandwidth_bytes` (en Go dans l’UI : valeur / 1024³)
   - La carte **« Auth Sessions (7j) »** → `total_auth_sessions`
   - La carte **« Coût par joueur »** → `avg_cost_per_player`

Si **toutes** les valeurs ci‑dessus correspondent, Cockpit affiche bien les données récupérées par les services.

**En résumé** : pour chaque bloc (A à D), vous regardez un chiffre sur l’écran Cockpit et le même chiffre dans le JSON sur `/verify` ; s’ils sont égaux, c’est bon.

**Avantage** : même connexion Neon et même code que le reste de l’app, donc si les chiffres correspondent entre `/verify` et les écrans, la chaîne BDD → Cockpit est cohérente.

---

## Méthode 2 : Requêtes SQL dans Neon (export BDD)

Pour comparer **directement avec la BDD** (sans passer par l’app), utilisez le fichier :

**`docs/verification/export-cockpit-verification.sql`**

Il contient 4 requêtes SQL qui reproduisent la logique de Cockpit (deltas, fenêtres de dates).

### Comment faire

1. Ouvrir le **SQL Editor** de votre projet Neon (ou psql avec la même base).
2. Exécuter **une requête à la fois** (certains clients permettent d’exécuter tout le fichier ; sinon copier-coller chaque bloc).
3. Exporter le résultat en CSV (ou noter les valeurs).
4. Comparer avec Cockpit :
   - **Requête 1 (KPIs)** → Dashboard, 4 cartes, période **7 derniers jours**.
   - **Requête 2 (Daily)** → Timeline ou Export, période **30 derniers jours** (chaque ligne = un jour).
   - **Requête 3 (Games)** → Tableau de la page Games (ou Jeux populaires du Dashboard), période **30 j**.
   - **Requête 4 (Cost)** → Cost & Performance, onglet Overview, **7 j**.

### Modifier la période

Dans le fichier SQL, les intervalles sont en dur : `INTERVAL '7 days'` et `INTERVAL '30 days'`. Pour tester une autre période, remplacez ces valeurs dans la requête concernée (ex. `'14 days'` pour 14 jours).

---

## En cas d’écart

- **Même période ?** Vérifier que la date de fin est la même (Cockpit utilise `NOW()` au moment du chargement ; la requête SQL utilise `NOW()` au moment de l’exécution).
- **Fuseau horaire ?** Les comparaisons par jour utilisent `snapshot_date::date` ; si la BDD est en UTC et l’app en heure locale, les agrégats par « jour » peuvent décaler d’un jour.
- **Données vides côté BDD ?** Si les requêtes SQL renvoient 0 ou peu de lignes, les snapshots ou `cost_metrics` ne sont peut‑être pas encore alimentés (vérifier l’app iOS et le seuil d’envoi des snapshots).

---

## Résumé

| Objectif | Action |
|----------|--------|
| Vérifier que l’UI reflète bien ce que renvoient les services | Aller sur **/verify**, comparer le JSON avec Dashboard / Timeline / Games / Cost. |
| Vérifier que les services reflètent bien la BDD | Exécuter **export-cockpit-verification.sql** dans Neon, comparer les résultats avec **/verify** ou avec l’UI. |

Les deux méthodes peuvent être utilisées ensemble : SQL → export BDD, /verify → sortie des services ; si SQL = /verify = UI, la chaîne BDD → services → Cockpit est cohérente.
