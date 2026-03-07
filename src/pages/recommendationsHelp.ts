import type { MetricHelpContent } from '../components/ui/MetricHelp'

export const RECOMMENDATIONS_HELP: Record<string, MetricHelpContent> = {
    'axe-10-priorites': {
        title: 'Actions prioritaires',
        definition: 'Synthèse des 5 actions les plus impactantes à traiter en premier, dérivées automatiquement des métriques (jeux toxiques, jeux aimés, moment d’achat, viralité, jeux bypassés).',
        calculation: 'Un score de priorité est attribué à chaque type d’action (ex. jeux avec exit_rate > 3%, jeux avec likes+bookmarks, tranche de temps qui convertit le mieux, etc.). Les 5 actions les plus pertinentes sont affichées.',
        utility: 'Permet au Product Owner de savoir par où commencer sans parcourir toute la page.',
        interpretation: 'Traiter en priorité les cartes « impact fort ». Les actions « moyen » ou « faible » peuvent être planifiées ensuite.',
        examples: 'Ex. : « Retirer ou retravailler les jeux toxiques » avec 2 jeux listés → corriger l’UX ou retirer ces jeux du feed en priorité.'
    },
    'axe-1': {
        title: 'Jeux à renforcer',
        definition: 'Liste des jeux les plus plébiscités par les joueurs via likes et favoris (bookmarks), triés par engagement social (likes + bookmarks décroissant).',
        calculation: 'Pour chaque jeu : somme (net_likes + net_bookmarks). Les jeux sont triés par cette somme en ordre décroissant. Les colonnes affichent aussi commentaires et nombre de joueurs uniques.',
        utility: 'Identifier les jeux qui plaisent le plus pour en créer des variantes ou renforcer le catalogue dans la même direction.',
        interpretation: 'Un jeu en tête avec beaucoup de likes/favoris est un « hit » à capitaliser. Un jeu avec peu de joueurs mais beaucoup de likes est un niche à développer.',
        examples: 'stack_boom en #1 avec 50 likes et 30 favoris → envisager une suite ou des jeux similaires (mécanique de stacking).'
    },
    'axe-2': {
        title: 'Jeux déclencheurs d\'achat',
        definition: 'Jeux pour lesquels les joueurs qui y ont joué ont le plus souvent effectué un achat (conversion) sur la période.',
        calculation: 'Pour chaque jeu : on compte les joueurs uniques qui ont lancé le jeu ET qui ont au moins un achat réussi (purchaseSuccesses) sur la période. Taux = (acheteurs / joueurs ayant lancé le jeu) × 100.',
        utility: 'Comprendre quels jeux sont associés aux achats pour y placer des offres ou en créer du même type.',
        interpretation: 'Un taux de conversion élevé sur un jeu = bon candidat pour afficher un paywall ou une offre IAP après une partie.',
        examples: 'speed_tap avec 12 % de conversion → proposer une offre « débloquer la suite » après une partie de speed_tap.'
    },
    'axe-3': {
        title: 'Jeux de rétention',
        definition: 'Jeux qui retiennent le plus les joueurs : combinaison de temps passé par partie et de récurrence (lancements par joueur).',
        calculation: 'Score de rétention = avg_play_time_minutes × launches_per_player. Plus le score est élevé, plus le jeu est « sticky ». Tri par ce score décroissant.',
        utility: 'Identifier les jeux sur lesquels s’appuyer pour garder les joueurs actifs (mise en avant, streaks, récompenses).',
        interpretation: 'Un score élevé = les joueurs reviennent souvent et restent longtemps. À mettre en tête de feed ou en « jeux du jour ».',
        examples: 'flipi_flap avec 5,8 min de moyenne et 4 lancements/joueur → score ~23 ; idéal pour une position « rétention » dans l’app.'
    },
    'axe-4': {
        title: 'Jeux toxiques',
        definition: 'Jeux après lesquels les joueurs quittent le plus souvent l’application (retour au menu ou fermeture).',
        calculation: 'Taux de sortie = (total_exits / total_launches) × 100 par jeu. Seuls les jeux avec exit_rate > 0 sont listés, triés par taux décroissant.',
        utility: 'Repérer les jeux qui font fuir pour les retravailler (difficulté, UX) ou les retirer du feed.',
        interpretation: 'Un taux > 5 % est préoccupant ; > 10 % justifie une action rapide. Croiser avec l’indice de frustration (flow) si disponible.',
        examples: 'memory_matrix avec 2,38 % de sortie → vérifier la courbe de difficulté et les messages d’échec.'
    },
    'axe-5': {
        title: 'Jeux bypassés (swipés sans jouer)',
        definition: 'Jeux que les joueurs « swipent » (passent) sans les lancer : le ratio swipes / (swipes + lancements) est élevé.',
        calculation: 'Taux de bypass = (total_swipes / (total_swipes + total_launches)) × 100. Tri par ce taux décroissant.',
        utility: 'Comprendre quels jeux ne captent pas l’attention pour améliorer la preview (visuel, titre) ou les retirer.',
        interpretation: '> 60 % = le jeu est largement ignoré. Entre 40 et 60 % = à surveiller. Faible bypass = bonne accroche.',
        examples: 'Un jeu à 75 % de bypass → repenser la vignette ou le titre ; sinon le retirer du feed principal.'
    },
    'axe-6': {
        title: 'Moteurs de viralité',
        definition: 'Jeux qui génèrent le plus de partages de score ou de contenu par joueur (taux de partage).',
        calculation: 'Partages/joueur = total_shares / nombre de joueurs uniques ayant lancé le jeu au moins une fois. Tri par ce ratio décroissant.',
        utility: 'Identifier les jeux à fort potentiel d’acquisition organique ; renforcer les CTA de partage sur ces jeux.',
        interpretation: 'Un ratio élevé = les joueurs partagent volontiers. À utiliser en campagne (stories, partage de score, défis).',
        examples: 'stack_boom avec 1,5 partages/joueur → rendre le bouton « Partager mon score » encore plus visible après une partie.'
    },
    'axe-7': {
        title: 'Jeux compétitifs',
        definition: 'Jeux qui déclenchent le plus de consultation du leaderboard et de sauvegardes de score (engagement compétitif).',
        calculation: 'Pour chaque jeu : somme (total_leaderboard_views + total_score_saves). Tri par cette somme décroissant. Données issues des métriques leaderboardViews et scoreSaves.',
        utility: 'Renforcer les mécaniques de compétition (défis, top 10, notifications) sur ces jeux pour augmenter la rétention.',
        interpretation: 'Beaucoup de vues leaderboard + sauvegardes = les joueurs veulent se comparer. Proposer des récompenses ou des événements hebdomadaires.',
        examples: 'speed_tap avec 200 vues leaderboard et 80 sauvegardes → lancer un « Défi de la semaine » avec classement dédié.'
    },
    'axe-8': {
        title: 'Funnel d\'achat — points de friction',
        definition: 'Vue sur le parcours d’achat : taux d’abandon (tentatives sans achat) et tranches de temps de jeu où la conversion est la plus forte.',
        calculation: 'Taux d’abandon = (purchaseCancels / purchaseAttempts) × 100 sur la période. Conversion par tranche = part des joueurs ayant acheté dans chaque tranche de temps de jeu cumulé (0-1h, 1-3h, 3-5h, 5h+).',
        utility: 'Réduire l’abandon en simplifiant le tunnel d’achat et proposer l’offre au bon moment (tranche qui convertit le mieux).',
        interpretation: 'Abandon > 50 % = friction (prix, étapes, clarté). La tranche avec la meilleure conversion indique quand déclencher le paywall.',
        examples: 'Meilleure conversion en 1-3h → afficher l’offre premium après ~1h30 de jeu cumulé.'
    },
    'axe-9': {
        title: 'Profil de session optimal',
        definition: 'Répartition des joueurs selon la durée moyenne de leurs sessions (0-5 min, 5-15 min, 15-30 min, 30+ min).',
        calculation: 'Pour chaque utilisateur on calcule la durée moyenne de session = totalSessionDuration / sessionCount (en minutes). On classe chaque user dans une tranche puis on compte le nombre par tranche.',
        utility: 'Adapter le design (courtes sessions vs longues) et les mécaniques de rétention (streaks, récompenses) pour viser la durée idéale.',
        interpretation: 'Si la majorité est en 0-5 min, renforcer l’accroche en début de session. Si 15-30 min domine, les joueurs sont engagés ; proposer des objectifs plus longs.',
        examples: 'Pic en 5-15 min → viser cette durée avec des objectifs quotidiens (ex. « 3 parties pour débloquer X »).'
    },
    'axe-11': {
        title: 'Jeux flash vs immersifs',
        definition: 'Classement des jeux par temps moyen par partie, avec une catégorie automatique : Flash (< 0,5 min), Court (0,5-2 min), Moyen (2-5 min), Immersif (5+ min).',
        calculation: 'Catégorie dérivée de avg_play_time_minutes. Tri par temps moyen décroissant. Permet de voir l’équilibre du catalogue.',
        utility: 'Équilibrer le feed : trop de jeux flash = zapping ; trop d’immersifs = blocage. Varier les types pour garder un mix.',
        interpretation: 'Une majorité en « Flash » peut fatiguer. Une majorité en « Immersif » peut rebuter les nouveaux. Viser un mix selon la cible.',
        examples: 'Catalogue à 70 % Flash → ajouter 2-3 jeux Moyen/Immersif pour les joueurs qui veulent rester plus longtemps.'
    },
    'axe-12': {
        title: 'Segmentation joueurs',
        definition: 'Répartition des utilisateurs en 4 profils : Baleine (achat + temps élevé), Engagé gratuit (temps élevé, pas d’achat), Casual (temps modéré), Dormant (quasi pas d’activité).',
        calculation: 'À partir des données utilisateur (total_play_time_hours, total_purchase_successes) : seuils appliqués par segment. Pour chaque segment : effectif, % du total, temps moyen, sessions moyennes, taux de conversion.',
        utility: 'Adapter les actions : offres ciblées aux Engagés gratuits, réactivation des Dormants, fidélisation des Baleines.',
        interpretation: 'Un fort % d’Engagés gratuits = potentiel de conversion inexploité. Beaucoup de Dormants = risque churn ; lancer des campagnes de réactivation.',
        examples: '30 % Engagés gratuits → test A/B d’une offre « première fois -30 % » après 2h de jeu.'
    },
    'axe-13': {
        title: 'Coût par joueur (efficience)',
        definition: 'Vue globale du coût infra (requêtes DB) et répartition par jeu : nombre de requêtes DB par joueur, Mo par joueur, taux de conversion par jeu.',
        calculation: 'Global : total_db_requests depuis cost_metrics sur la période ; avg = total / unique_players (user_analytics_snapshots). Par jeu : SUM(metric_value) pour db_request et game_id, divisé par unique_players du jeu.',
        utility: 'Optimiser les jeux les plus gourmands en requêtes (cache, batch) et privilégier ceux avec bon ROI (conversion / coût).',
        interpretation: 'Un jeu avec beaucoup de req./joueur et faible conversion = priorité pour l’optimisation. Forte conversion et coût raisonnable = à garder en avant.',
        examples: 'stack_boom : 200 req/joueur et 2 % conversion → auditer les appels API (scores, social) et mettre en cache.'
    },
    'axe-14': {
        title: 'Intensité d\'engagement',
        definition: 'Métriques de « flow » par jeu : nombre de swipes par heure de jeu (intensité) et taux de frustration (sorties / lancements).',
        calculation: 'Intensité = total_swipes / (total_play_time_seconds/3600). Frustration = (total_exits / total_launches) × 100. Complétion = (top10_attempts / score_attempts) × 100 quand pertinent.',
        utility: 'Distinguer l’engagement positif (intensité haute, frustration basse) de l’engagement négatif (intensité haute, frustration haute) pour revoir l’UX.',
        interpretation: 'Haute intensité + faible frustration = jeu addictif à mettre en avant. Haute intensité + haute frustration = revoir la difficulté ou les feedbacks.',
        examples: 'Jeu avec 80 swipes/h et 15 % frustration → revoir la courbe de difficulté et les messages d’échec.'
    },
    'axe-15': {
        title: 'Parcours social — jeux qui génèrent des discussions',
        definition: 'Jeux pour lesquels le ratio commentaires / joueurs est le plus élevé (et engagement social global : likes, partages, commentaires).',
        calculation: 'comments_to_players_ratio = total comments / unique players. social_engagement_rate agrège likes + comments + shares par joueur. Tri par ratio commentaires décroissant.',
        utility: 'Renforcer les CTA sociaux sur les jeux à fort potentiel mais peu commentés ; créer de la communauté autour des jeux les plus discutés.',
        interpretation: 'Un ratio élevé = les joueurs commentent ; bon pour la modération et les UGC. Un jeu joué mais peu commenté = opportunité d’ajouter des prompts de discussion.',
        examples: 'multiplicity avec 0,33 commentaires/joueur → ajouter une question « Quel mode préférez-vous ? » sous le leaderboard.'
    },
    'axe-16': {
        title: 'Performance des packs IAP',
        definition: 'Répartition des achats par produit (pack) : quel product_id est le plus acheté sur la période.',
        calculation: 'Agrégation des purchaseTypes dans les snapshots : pour chaque product_id, somme des achats (deltas sur la période). Affichage en barres (volume par pack).',
        utility: 'Mettre en avant les packs qui performent et revoir le pricing ou le positionnement de ceux qui ne vendent pas.',
        interpretation: 'Un pack dominant = bien positionné ou bien perçu. Un pack absent ou faible = à tester (promo, placement, message).',
        examples: 'remove_ads en tête → le mettre en évidence après une pub. premium en retrait → tester une offre bundle ou un message différenciant.'
    },
    'axe-17': {
        title: 'Jeux tremplin (onboarding)',
        definition: 'Pour les joueurs dont ce jeu a été le « premier » joué (jeu dominant dans leur premier snapshot), on mesure la rétention (lifetime en jours) et le temps de jeu moyen.',
        calculation: 'Pour chaque user : premier snapshot dans la fenêtre ; jeu avec le plus de lancements dans ce snapshot = premier jeu. Puis agrégation par ce jeu : nombre d’users, moyenne (last_snapshot - first_snapshot) en jours, moyenne temps de jeu cumulé.',
        utility: 'Identifier le meilleur jeu d’entrée pour le placer en premier dans le feed ou en onboarding et maximiser la rétention des nouveaux.',
        interpretation: 'Un jeu avec fort avg_lifetime_days quand il est premier = excellent tremplin. À placer en tête de feed pour les nouveaux utilisateurs.',
        examples: 'stack_boom en premier jeu → 25 j de lifetime moyen → le proposer en première position aux nouveaux inscrits.'
    },
    'axe-18': {
        title: 'Tendance hebdo',
        definition: 'Agrégation des métriques quotidiennes par semaine : temps de jeu total, sessions, joueurs-jours, achats. Permet de voir l’évolution sur plusieurs semaines.',
        calculation: 'Les dailyMetrics (par jour) sont regroupés par semaine (début de semaine). Pour chaque semaine : somme de total_play_time_hours, total_sessions, unique_players (joueurs-jours), total_purchase_successes.',
        utility: 'Détecter une baisse sur 2 semaines consécutives pour déclencher des actions (push, offres, nouveau contenu).',
        interpretation: 'Deux semaines de baisse = alerte. Une hausse après une campagne = mesurer l’effet. Comparer les semaines pour voir la tendance.',
        examples: 'Semaine 1 : 50 h, Semaine 2 : 48 h, Semaine 3 : 45 h → lancer une campagne de réactivation ou une offre limitée.'
    },
    'axe-19': {
        title: 'Jeux sous-exploités (hidden gems)',
        definition: 'Jeux qui ont une rétention élevée (score de rétention au-dessus de la médiane) mais un nombre de joueurs en dessous de la médiane = peu exposés malgré leur potentiel.',
        calculation: 'Médiane du retention_score et médiane de unique_players sur tous les jeux. On garde les jeux tels que retention_score > médiane_retention ET unique_players < médiane_players. Tri par retention_score décroissant.',
        utility: 'Remonter ces jeux dans le feed, les proposer en « À découvrir » ou en notification pour augmenter leur exposition.',
        interpretation: 'Ce sont des « pépites » peu vues : les joueurs qui y arrivent restent, mais peu y arrivent. À mettre en avant.',
        examples: 'flipi_flap : rétention haute, 3 joueurs → le placer en « Jeu du jour » ou en bannière « Les joueurs adorent ».'
    },
    'axe-20': {
        title: 'Coût du churn (jeux toxiques × infra)',
        definition: 'Jeux qui cumulent un taux de sortie élevé (> 10 %) et un coût infra (requêtes DB) important : ils « gaspillent » des requêtes en faisant quitter les joueurs.',
        calculation: 'Par jeu : total_db_requests (cost_metrics, game_id) et exit_rate_percent (gameExits / gameLaunches). Indice churn_cost = total_db_requests × exit_rate / 100. Tri par cet indice décroissant.',
        utility: 'Prioriser l’amélioration ou le retrait des jeux qui coûtent cher tout en dégradant l’expérience (sorties).',
        interpretation: 'Un indice élevé = le jeu consomme de l’infra et fait fuir. À retravailler en priorité ou à retirer du feed.',
        examples: 'rush_hour : 500 req et 15 % exit → indice 75 ; revoir la difficulté ou réduire les appels API sur ce jeu.'
    },
    'cross-roi-jeu': {
        title: 'ROI jeu (valeur vs coût infra)',
        definition: 'Métrique croisée : pour chaque jeu, on rapporte la conversion (valeur) au coût en requêtes DB. Un ROI élevé = le jeu convertit bien sans surconsommer l’infra.',
        calculation: 'ROI = conversion_rate_percent / (db_requests_per_player + 1). Les jeux sont triés par ce ratio décroissant. Données : conversionByGame et gameEfficiency.',
        utility: 'Prioriser les jeux à fort ROI pour la mise en avant et optimiser (ou déprioriser) ceux à faible ROI.',
        interpretation: 'ROI élevé = bon rapport conversion/coût. ROI faible avec forte conversion = optimiser les requêtes. ROI faible avec faible conversion = candidat à retirer ou refonte.',
        examples: 'speed_tap : 8 % conversion, 50 req/joueur → ROI ≈ 0,16. stack_boom : 2 %, 200 req → ROI ≈ 0,01 ; priorité optimisation stack_boom.'
    },
    'cross-sante': {
        title: 'Score de santé jeu (0–100)',
        definition: 'Indicateur composite par jeu qui agrège rétention, sorties, bypass, partages et conversion en un score normalisé pour prioriser les actions.',
        calculation: 'Composantes normalisées (ex. 0–100) : + retention_score_norm, + share_rate_norm, + conversion_norm, - exit_rate_norm, - bypass_rate_norm. Score = somme pondérée, recalée entre 0 et 100.',
        utility: 'Un seul chiffre par jeu pour décider quels jeux renforcer (santé haute) et quels jeux traiter en priorité (santé basse).',
        interpretation: 'Score > 70 = jeu en bonne santé. Score < 30 = à traiter en priorité (UX, difficulté, exposition).',
        examples: 'flipi_flap : 78 → maintenir en avant. brain_freeze : 22 → analyser exit et bypass, puis corriger ou retirer.'
    },
    'cross-tremplin-expo': {
        title: 'Tremplin sous-exploité',
        definition: 'Jeux qui sont d’excellents « premiers jeux » (forte rétention quand ils sont le premier joué) mais qui ont une exposition actuelle faible (peu de joueurs uniques dans les analytics globales).',
        calculation: 'Croisement firstGameLifetime (avg_lifetime_days par jeu en tant que 1er jeu) et games (unique_players). On filtre : avg_lifetime_days > seuil (ex. médiane) ET unique_players < seuil. Tri par avg_lifetime_days décroissant.',
        utility: 'Mettre ces jeux en tête de feed ou en onboarding pour maximiser la rétention des nouveaux sans les « cacher » au milieu du catalogue.',
        interpretation: 'Ce sont les meilleurs tremplins actuellement sous-exposés. Les remonter augmente la rétention globale des nouveaux.',
        examples: 'orbit_dodge : 30 j de lifetime en 1er jeu mais seulement 4 joueurs sur la période → le placer en 2e ou 3e position du feed.'
    },
    'cross-piege-cout': {
        title: 'Piège à coût',
        definition: 'Jeux qui cumulent un indice de coût du churn élevé (infra × sorties) et un score de rétention faible : ils coûtent cher et ne retiennent pas.',
        calculation: 'Croisement churnCost (churn_cost_index) et enriched (retention_score). On filtre les jeux avec churn_cost_index au-dessus d’un seuil et retention_score en dessous de la médiane. Tri par churn_cost_index décroissant.',
        utility: 'Cibler en priorité ces jeux pour refonte ou retrait : ils dégradent à la fois l’expérience et les coûts.',
        interpretation: 'Priorité maximale : réduire les requêtes (cache, simplification) ou retirer le jeu du feed jusqu’à refonte.',
        examples: 'rush_hour : fort churn cost, faible rétention → auditer l’UX et les appels API ; si pas d’amélioration rapide, le retirer temporairement.'
    },
    'cross-viralite-cout': {
        title: 'Viralité par coût',
        definition: 'Ratio partages / coût infra (requêtes DB par joueur) : quels jeux génèrent le plus de partages pour un coût donné.',
        calculation: 'Pour chaque jeu : viralite_cout = share_rate / (db_requests_per_player + 1). Données : games (share_rate) et gameEfficiency (db_requests_per_player). Tri par ce ratio décroissant.',
        utility: 'Mettre en avant les jeux qui génèrent le plus de viralité (acquisition organique) pour un coût infra maîtrisé.',
        interpretation: 'Ratio élevé = excellent levier d’acquisition à faible coût. À utiliser en campagnes (partage de score, défis).',
        examples: 'stack_boom : 0,5 partages/joueur, 200 req → ratio 0,0025. speed_tap : 0,3 partages, 30 req → ratio 0,01 ; privilégier speed_tap pour les campagnes de partage.'
    },
    'cross-moment-achat': {
        title: 'Moment d\'achat idéal',
        definition: 'Croisement de la tranche de temps de jeu cumulé qui convertit le mieux (conversion_by_play_time) et de la distribution des durées de session pour affiner le moment où proposer l’achat.',
        calculation: 'On identifie la tranche (ex. 1-3h) où conversion_by_play_time est maximale. On croise avec la distribution des sessions (0-5 min, 5-15, etc.) pour proposer une règle du type « après X h de jeu ET session de Y–Z min ».',
        utility: 'Déclencher le paywall ou l’offre au moment où la probabilité de conversion est la plus élevée (temps cumulé + contexte de session).',
        interpretation: 'Ex. « 1-3h + session 15-30 min » = proposer l’offre quand le joueur a entre 1h et 3h de jeu total et est dans une session de 15-30 min.',
        examples: 'Si la meilleure conversion est en 1-3h et que les sessions 15-30 min sont les plus fréquentes → afficher l’offre après ~1h30 de jeu, en fin de session 15-30 min.'
    },
    'cross-potentiel-conversion': {
        title: 'Potentiel conversion inexploité',
        definition: 'Jeux avec un fort engagement (temps de jeu, lancements) mais un taux de conversion inférieur à la moyenne de l’app : candidats pour tester des offres ciblées.',
        calculation: 'Pour chaque jeu : on compare conversion_rate_percent à la conversion moyenne globale. On filtre les jeux avec temps de jeu ou lancements au-dessus de la médiane et conversion en dessous de la moyenne. Tri par écart (potentiel).',
        utility: 'Cibler ces jeux pour des tests d’offres IAP, promos ou placement de bannières sans dégrader l’expérience des jeux déjà convertisseurs.',
        interpretation: 'Ces joueurs jouent beaucoup mais n’achètent pas encore = bonne cible pour une offre « première fois » ou un message différenciant.',
        examples: 'jump_rails : 2h de jeu/joueur, 0 % conversion (moyenne app 5 %) → tester une offre « Débloquer tous les modes » après 3 parties.'
    },
    'cross-social-cout': {
        title: 'Engagement social par coût',
        definition: 'Ratio engagement social (commentaires, likes, partages par joueur) sur coût infra (requêtes DB par joueur) pour prioriser les jeux « communauté » à faible coût.',
        calculation: 'Par jeu : social_engagement_rate / (db_requests_per_player + 1). Données : socialMetrics et gameEfficiency. Tri par ce ratio décroissant.',
        utility: 'Développer la communauté (commentaires, likes) sur les jeux qui génèrent déjà de l’engagement sans surcoût infra.',
        interpretation: 'Ratio élevé = bon levier pour la modération et l’UGC à coût maîtrisé. Renforcer les CTA sociaux sur ces jeux.',
        examples: 'multiplicity : engagement 0,5, 20 req/joueur → ratio 0,025. Idéal pour ajouter des prompts de discussion sans alourdir l’infra.'
    },
    'cross-risque-churn': {
        title: 'Risque churn par segment',
        definition: 'Évolution dans le temps de la répartition des segments (Dormant, Casual, Engagé, Baleine) et des indicateurs globaux (joueurs actifs, temps total) pour détecter une dégradation.',
        calculation: 'Sur les 2 à 4 dernières semaines (weeklyTrend) : évolution du total joueurs-jours, temps de jeu, achats. En parallèle, les segments sont calculés sur la base actuelle (usersAnalytics). On peut afficher la tendance + part des Dormants/Casuals.',
        utility: 'Alerter si la part de Dormants ou de Casuals augmente ou si les indicateurs globaux baissent sur 2 semaines consécutives → lancer des campagnes de réactivation.',
        interpretation: 'Hausse des Dormants ou baisse des joueurs-jours = risque churn. Réagir par push, email ou offre limitée.',
        examples: 'Semaine 1 : 20 % Dormants ; Semaine 4 : 35 % → campagne « On vous a manqué » avec une offre réactivation.'
    },
    'cross-funnel-achat': {
        title: 'Funnel achat par jeu',
        definition: 'Croisement du taux de conversion par jeu (tentatives → achats) avec le taux d’abandon global et la répartition des achats par jeu (purchases_by_game) pour identifier les frictions.',
        calculation: 'Par jeu : conversion_rate (acheteurs / joueurs). Global : cart_abandonment_rate. purchases_by_game indique après quels jeux les achats ont lieu. On peut calculer un « taux de complétion » par jeu si on avait les tentatives par jeu (sinon vue qualitative).',
        utility: 'Comprendre quels jeux déclenchent des tentatives mais beaucoup d’abandons (friction prix, UX, moment) pour simplifier le parcours ou ajuster l’offre.',
        interpretation: 'Un jeu avec beaucoup d’achats associés mais abandon global élevé = vérifier le tunnel (étapes, clarté du prix). Jeu avec peu d’achats = tester une offre dédiée.',
        examples: 'stack_boom en tête des purchases_by_game ; abandon 60 % → simplifier le tunnel d’achat après une partie de stack_boom (moins d’étapes, prix mis en avant).'
    }
}
