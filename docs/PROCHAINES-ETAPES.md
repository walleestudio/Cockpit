# Prochaines étapes – après application du plan côté iOS

Les corrections analytics ont été appliquées côté app iOS (cumuls sans reset, trackSessionEnd, track* branchés). Voici quoi faire côté Cockpit et comment valider.

---

## 1. Côté Cockpit (fait ou à vérifier)

- [x] **Timeline dans la sidebar** : le lien « Timeline » a été ajouté dans la navigation (route `/timeline`).
- [ ] **Variables d’environnement** : vérifier que Cockpit pointe vers la même base Neon que l’app iOS :
  - `VITE_NEON_DATABASE_URL` (et `VITE_NEON_DATABASE_URL_DEV` si utilisé) pour les requêtes analytics et cost.
  - `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` pour l’auth (si vous utilisez Supabase pour le login Cockpit).
- [ ] **Pas de changement de code** requis pour les métriques : les requêtes lisent déjà les bonnes tables et clés ; les données arriveront dès que l’iOS enverra les nouveaux snapshots (cumuls + track*).

---

## 2. Valider avec des données réelles

1. **Lancer Cockpit** en local ou en staging :  
   `npm run dev` (ou la commande de démarrage du projet).

2. **Utiliser l’app iOS** (build avec les modifs) :
   - Se connecter, jouer un peu, lancer plusieurs jeux, like/bookmark, commenter si possible, faire un achat test.
   - Laisser passer du temps ou atteindre le seuil d’envoi des snapshots (ex. `analytics_play_time_threshold_hours` dans `game_configurations`).

3. **Vérifier dans Cockpit** (après quelques minutes / heures selon la fréquence d’envoi) :
   - **Dashboard** : KPIs (joueurs, temps de jeu, sessions, conversion) et courbe d’activité ; durée moyenne session > 0.
   - **Games** : tableau avec lancements, temps, swipes, exits, likes, bookmarks, etc.
   - **Users** : pseudos (depuis `profiles` ou `metrics.pseudo`), durées et conversion.
   - **Timeline** : courbes joueurs/sessions et temps de jeu par jour.
   - **Insights** (Flow, Social, Monetization) : indicateurs renseignés selon les actions effectuées.
   - **Cost & Performance** : rempli si l’iOS envoie bien des lignes dans `cost_metrics`.

---

## 3. Si les métriques restent vides

- **Même base Neon ?** Vérifier que l’app iOS et Cockpit utilisent la même base (même connection string / même projet Neon).
- **Seuil d’envoi** : les snapshots partent quand le temps de jeu cumulé depuis le dernier envoi atteint le seuil (ex. 8 h). En dev, vous pouvez temporairement baisser `analytics_play_time_threshold_hours` dans `game_configurations` pour déclencher des envois plus souvent.
- **Consentement analytics** : s’assurer que l’utilisateur a accepté l’analytics (sinon l’app peut ne pas envoyer les snapshots).
- **Logs** : côté iOS, vérifier qu’il n’y a pas d’erreur à l’envoi (NeonRepository, SnapshotManager). Côté Cockpit, ouvrir la console navigateur pour d’éventuelles erreurs sur les appels Neon.

---

## 4. Résumé

| Action | Statut |
|--------|--------|
| Modifs iOS (cumuls, trackSessionEnd, track*) | Appliqué |
| Timeline dans la sidebar Cockpit | Fait |
| Vérifier env Neon / Supabase | À faire de votre côté |
| Tester avec l’app iOS + vérifier les écrans Cockpit | À faire |

Une fois l’env vérifiée et un peu d’usage réel (ou de test) avec l’app iOS, les écrans Cockpit devraient se remplir progressivement avec les nouvelles données.
