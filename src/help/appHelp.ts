import type { MetricHelpContent } from '../components/ui/MetricHelp'

export const APP_HELP: Record<string, MetricHelpContent> = {
    // ——— Dashboard ———
    'dashboard-joueurs-uniques': {
        title: 'Joueurs Uniques',
        definition: "Nombre d'utilisateurs distincts ayant lancé au moins un jeu sur la période.",
        calculation: "Comptage des user_id distincts dans les snapshots dont la date est dans la plage sélectionnée, avec au moins un lancement de jeu (sessionCount ou activité).",
        utility: "Mesure la taille de l'audience active et l'évolution de la base utilisateurs.",
        interpretation: "Une hausse = bonne acquisition ou rétention. Une baisse = fuite ou désengagement à investiguer.",
        examples: "1000 joueurs uniques sur 30 j = 1000 comptes différents ont joué au moins une fois."
    },
    'dashboard-temps-jeu-total': {
        title: 'Temps de Jeu Total',
        definition: "Somme de toutes les durées de sessions de jeu (en heures) sur la période.",
        calculation: "Agrégation des cumulative_play_time_seconds (delta ou max selon la logique) par jour puis somme, convertie en heures.",
        utility: "Indicateur clé de l'engagement global et du temps passé dans l'app.",
        interpretation: "Plus le temps total est élevé, plus l'app retient. À croiser avec le nombre de joueurs pour le temps moyen par user.",
        examples: "500 h sur 30 j avec 200 joueurs ≈ 2,5 h par joueur en moyenne."
    },
    'dashboard-sessions-totales': {
        title: 'Sessions Totales',
        definition: "Nombre total de parties ou sessions lancées (lancements de jeux) sur la période.",
        calculation: "Somme des sessionCount (ou équivalent) agrégés à partir des user_analytics_snapshots sur la période.",
        utility: "Reflète la fréquence d'utilisation et l'activité répétée.",
        interpretation: "Sessions / joueurs = nombre moyen de sessions par utilisateur. Un ratio élevé indique une bonne rétention court terme.",
        examples: "5000 sessions pour 500 joueurs = 10 sessions/joueur en moyenne."
    },
    'dashboard-taux-conversion': {
        title: 'Taux de Conversion',
        definition: "Pourcentage d'utilisateurs ayant effectué au moins un achat réussi sur la période.",
        calculation: "(Nombre de users avec purchaseSuccesses > 0 / Joueurs uniques) × 100.",
        utility: "Mesure l'efficacité de la monétisation et l'acceptation des offres payantes.",
        interpretation: "Un taux de 2–5 % est courant en mobile gaming. Au-dessus = offre très attractive ou audience engagée.",
        examples: "3 % sur 1000 joueurs = 30 acheteurs."
    },
    'dashboard-activite-joueurs': {
        title: 'Activité Joueurs',
        definition: "Courbe quotidienne du nombre de joueurs uniques et du nombre de sessions sur la période.",
        calculation: "Pour chaque jour de la plage : unique_players et total_sessions issus des dailyMetrics.",
        utility: "Voir les tendances jour par jour, repérer les pics ou les chutes d'activité.",
        interpretation: "Pic le week-end = usage loisir. Chute brutale = bug ou incident à vérifier.",
        examples: "Graphique avec en abscisse les dates, en ordonnée joueurs et sessions."
    },
    'dashboard-top-jeux': {
        title: 'Top Jeux',
        definition: "Les 5 jeux avec le plus de lancements sur la période (donut).",
        calculation: "Tri des jeux par total_launches décroissant, prise des 5 premiers.",
        utility: "Identifier les jeux les plus joués pour les mettre en avant ou analyser les préférences.",
        interpretation: "Un jeu domine = hit à capitaliser. Répartition équilibrée = catalogue varié.",
        examples: "stack_boom 40 %, speed_tap 25 %… = stack_boom est le plus lancé."
    },
    'dashboard-jeux-a-mettre-en-avant': {
        title: 'Jeux à mettre en avant',
        definition: "Liste des jeux recommandés pour la mise en avant selon un score (partages, likes, favoris, rétention).",
        calculation: "Score = partages×2 + likes + bookmarks, pondéré par joueurs et éventuellement par temps de jeu / rétention. Tri par score décroissant.",
        utility: "Aider le product à choisir quels jeux promouvoir en tête de feed ou dans les campagnes.",
        interpretation: "Un jeu avec un score élevé plaît et engage ; le mettre en avant peut augmenter la rétention et la viralité.",
        examples: "flipi_flap avec score 12 → bon candidat pour « Jeu du jour »."
    },
    'dashboard-jeux-populaires': {
        title: 'Jeux Populaires',
        definition: "Tableau des jeux les plus joués avec joueurs, lancements, temps moyen et indicateur d'engagement (tentatives de score).",
        calculation: "Données getGamesAnalytics sur la période, tri par lancements ou joueurs. Engagement = total_score_attempts (barre de progression).",
        utility: "Vue détaillée des jeux qui performent pour équilibrer le catalogue et les parcours.",
        interpretation: "Joueurs et lancements élevés = jeu populaire. Barre d'engagement = propension à rejouer pour battre un score.",
        examples: "speed_tap : 200 joueurs, 800 lancements, barre 60 % = fort engagement."
    },

    // ——— Users ———
    'users-distribution-sessions': {
        title: 'Distribution des Sessions',
        definition: "Répartition des utilisateurs selon leur nombre total de sessions (1-5, 6-20, 21-50, 50+).",
        calculation: "Pour chaque user : total_sessions depuis les snapshots. Comptage du nombre d'users dans chaque tranche.",
        utility: "Comprendre le profil d'usage : beaucoup de petits joueurs vs gros joueurs très actifs.",
        interpretation: "Beaucoup en 1-5 = usage ponctuel. Beaucoup en 50+ = noyau dur à fidéliser.",
        examples: "40 users en 1-5, 20 en 6-20, 10 en 21-50, 5 en 50+."
    },
    'users-utilisateurs-actifs': {
        title: 'Utilisateurs Actifs',
        definition: "Nombre total d'utilisateurs distincts ayant eu au moins une activité sur la période (30 derniers jours).",
        calculation: "Même indicateur que Joueurs Uniques des KPIs : COUNT(DISTINCT user_id) sur la période.",
        utility: "Vue synthétique de la taille de l'audience active sur la page Utilisateurs.",
        interpretation: "À comparer avec les autres métriques (sessions, conversion) pour le taux de conversion et la fréquence.",
        examples: "150 utilisateurs actifs sur 30 j."
    },
    'users-moyenne-sessions-user': {
        title: 'Moyenne Sessions/User',
        definition: "Nombre moyen de sessions par utilisateur actif sur la période.",
        calculation: "Total sessions / Nombre d'utilisateurs actifs (unique_players).",
        utility: "Mesure la fréquence d'utilisation : combien de fois en moyenne un user revient jouer.",
        interpretation: "Valeur élevée = bonne rétention et habitude. Faible = usage ponctuel, à améliorer par notifications ou contenu.",
        examples: "8,5 sessions/user = en moyenne chaque user a lancé 8 à 9 parties sur 30 j."
    },
    'users-taux-conversion': {
        title: 'Taux de Conversion (Utilisateurs)',
        definition: "Pourcentage d'utilisateurs actifs ayant effectué au moins un achat sur la période.",
        calculation: "Conversion = (utilisateurs avec au moins un achat réussi / utilisateurs actifs) × 100.",
        utility: "Même sens que le KPI Dashboard mais contextualisé sur la page Utilisateurs.",
        interpretation: "Voir la fiche « Utilisateurs » pour le détail par user (sessions, temps, conversion).",
        examples: "5 % = 5 acheteurs pour 100 utilisateurs actifs."
    },
    'users-distribution-durees-session': {
        title: 'Distribution des durées de session',
        definition: "Répartition des utilisateurs selon la durée moyenne de leurs sessions (tranches en minutes).",
        calculation: "Par user : totalSessionDuration / sessionCount en minutes. Classement en tranches (ex. 0-5 min, 5-15, 15-30, 30+). Comptage par tranche.",
        utility: "Adapter le design et les mécaniques : courtes sessions = format casual ; longues = immersion.",
        interpretation: "Majorité en 0-5 min = usage très casual. Majorité en 30+ = joueurs engagés.",
        examples: "50 users en 0-5 min, 30 en 5-15, 15 en 15-30, 5 en 30+."
    },
    'users-comptes-inactifs-rgpd': {
        title: 'Comptes inactifs > 3 ans (suppression RGPD)',
        definition: "Liste des utilisateurs dont la dernière activité (last_snapshot_date) remonte à plus de 3 ans, éligibles à une suppression pour conformité RGPD.",
        calculation: "Requête sur user_analytics_snapshots : users avec MAX(snapshot_date) < NOW() - 3 ans. Tri par dernière activité (les plus anciens en premier).",
        utility: "Permet de planifier la purge des comptes inactifs selon la politique de rétention des données (droit à l'effacement, stockage limité).",
        interpretation: "Ces comptes peuvent être supprimés ou anonymisés si la politique le prévoit. Toujours vérifier les obligations légales.",
        examples: "15 comptes sans connexion depuis 3 ans → export pour procédure de suppression."
    },
    'users-liste-utilisateurs': {
        title: 'Liste des Utilisateurs',
        definition: "Tableau des utilisateurs avec pseudo, ID, sessions, temps total, durée moyenne de session, taux de conversion et dernière activité.",
        calculation: "Données getUsersAnalytics (100 premiers triés par temps de jeu). Dernière activité = last_snapshot_date.",
        utility: "Vue détaillée par utilisateur pour le support, l'analyse de cohortes ou le ciblage.",
        interpretation: "Tri par temps de jeu : les plus engagés en premier. Conversion et dernière activité aident à segmenter (payants, actifs récents).",
        examples: "User A : 50 sessions, 12 h, 5 min/session, 0 % conversion, dernière activité 01/03."
    },

    // ——— Games ———
    'games-top5-temps-jeu': {
        title: 'Top 5 - Temps de Jeu (heures)',
        definition: "Les 5 jeux avec le plus de temps de jeu total (en heures) sur la période.",
        calculation: "Tri des jeux par total_play_time_hours décroissant, prise des 5 premiers. Affichage en barres.",
        utility: "Identifier les jeux qui accaparent le plus le temps des joueurs.",
        interpretation: "Ces jeux sont les piliers de la rétention ; à maintenir et à ne pas dégrader.",
        examples: "stack_boom 80 h, speed_tap 50 h, flipi_flap 40 h…"
    },
    'games-total-jeux-actifs': {
        title: 'Total Jeux Actifs',
        definition: "Nombre de jeux distincts ayant été joués au moins une fois sur la période.",
        calculation: "Nombre de lignes retournées par getGamesAnalytics (chaque jeu avec au moins un lancement).",
        utility: "Taille du catalogue « vivant » ; combien de jeux sont réellement utilisés.",
        interpretation: "Proche du nombre total de jeux = catalogue bien exploré. Beaucoup moins = certains jeux ignorés.",
        examples: "25 jeux actifs sur 30 disponibles = 5 jeux jamais ou très peu lancés."
    },
    'games-temps-moyen-session': {
        title: 'Temps Moyen / Session',
        definition: "Durée moyenne d'une session de jeu (en minutes), tous jeux confondus.",
        calculation: "Moyenne des avg_play_time_minutes de chaque jeu, pondérée par le nombre de lancements ou simple moyenne des jeux.",
        utility: "Donne une idée de la longueur typique d'une partie (casual vs long).",
        interpretation: "Faible = parties courtes (hyper-casual). Élevé = parties longues ou jeu très engageant.",
        examples: "2,5 min en moyenne = format très court, type arcade."
    },
    'games-taux-retention': {
        title: 'Taux de Rétention',
        definition: "Indicateur inverse du taux de sortie : 100 - (moyenne des exit_rate_percent par jeu). Plus il est élevé, moins les joueurs quittent les jeux prématurément.",
        calculation: "Pour chaque jeu : exit_rate = (total_exits / total_launches)×100. Moyenne sur les jeux. Rétention affichée = 100 - cette moyenne.",
        utility: "Vue globale : les jeux retiennent-ils ou font-ils fuir ?",
        interpretation: "Rétention 95 % = en moyenne 5 % des lancements se terminent par une sortie prématurée. À affiner par jeu (voir Liste des Jeux).",
        examples: "Rétention 97 % = sorties faibles en moyenne sur le catalogue."
    },
    'games-liste-jeux': {
        title: 'Liste des Jeux',
        definition: "Tableau détaillé par jeu : joueurs, lancements, lancements/joueur, temps moyen, partage/joueur, taux de sortie, likes, partages, vues leaderboard, sauvegardes score.",
        calculation: "Données getGamesAnalytics. Colonnes dérivées : launches_per_player, share_rate, exit_rate_percent, etc.",
        utility: "Analyse fine par jeu pour équilibrer le catalogue, repérer les jeux toxiques ou sous-exploités.",
        interpretation: "Taux de sortie élevé = jeu frustrant. Partages et leaderboard élevés = jeu viral ou compétitif. À croiser avec les préconisations.",
        examples: "memory_matrix : exit 2,38 %, à surveiller. stack_boom : partages élevés = moteur viral."
    },

    // ——— CostMetrics ———
    'cost-db-requests': {
        title: 'DB Requests (7j)',
        definition: "Nombre total de requêtes SQL enregistrées dans cost_metrics sur les 7 derniers jours.",
        calculation: "Somme des metric_value pour metric_type = 'db_request' sur la période. Peut être ventilé par game_id si renseigné.",
        utility: "Mesure la charge sur la base de données et les pics d'utilisation.",
        interpretation: "Une hausse forte peut indiquer des requêtes non optimisées ou une croissance d'usage. À comparer avec le nombre de joueurs.",
        examples: "598 041 requêtes sur 7 j = charge à surveiller pour la scalabilité."
    },
    'cost-bandwidth': {
        title: 'Bandwidth (7j)',
        definition: "Volume total de données transférées (en bytes, affiché en GB) sur 7 jours.",
        calculation: "Somme des metric_value pour metric_type = 'bandwidth' sur la période.",
        utility: "Identifie les pics de consommation réseau et les coûts d'infra associés.",
        interpretation: "Bandwidth élevé = beaucoup d'échanges (médias, sync). À optimiser si les coûts explosent.",
        examples: "2,5 GB sur 7 j pour 500 joueurs = ~5 MB/joueur."
    },
    'cost-auth-sessions': {
        title: 'Auth Sessions (7j)',
        definition: "Nombre de sessions d'authentification créées sur 7 jours.",
        calculation: "Somme des metric_value pour metric_type = 'auth_session' sur la période.",
        utility: "Mesure l'activité de connexion (login, refresh token).",
        interpretation: "Proche du nombre de connexions. Un écart avec les joueurs uniques peut indiquer des reconnexions fréquentes.",
        examples: "1200 auth sessions pour 400 joueurs = ~3 connexions/joueur en moyenne."
    },
    'cost-cout-par-joueur': {
        title: 'Coût par Joueur',
        definition: "Ratio DB Requests / Joueurs uniques sur la période. Proxy du coût d'infrastructure par utilisateur.",
        calculation: "Total DB Requests (7j) / Unique players sur la même période. Parfois dérivé d'un coût monétaire si disponible.",
        utility: "Identifie l'efficacité de l'infrastructure : combien de requêtes par user.",
        interpretation: "Élevé = chaque joueur coûte cher en requêtes (à optimiser). Faible = bonne efficacité.",
        examples: "1500 requêtes/joueur sur 7 j = charge DB importante par user."
    },
    'cost-evolution-quotidienne': {
        title: 'Évolution Quotidienne',
        definition: "Courbe jour par jour des 3 types de métriques (DB Requests, Bandwidth, Auth Sessions) sur 7 jours.",
        calculation: "Pour chaque date : agrégation par metric_type. Affichage en lignes par type.",
        utility: "Détecte les pics anormaux de coûts et les tendances.",
        interpretation: "Pic un jour donné = événement ou bug. Tendance à la hausse = croissance ou fuite à investiguer.",
        examples: "Pic DB le mercredi = possible campagne ou feature utilisée ce jour-là."
    },
    'cost-top10-jeux-cout': {
        title: 'Top 10 Jeux par Coût',
        definition: "Les 10 jeux consommant le plus de ressources (DB + bande passante ou coût agrégé).",
        calculation: "Agrégation des coûts par game_id (db_request, bandwidth). Somme ou score pondéré. Tri décroissant, top 10.",
        utility: "Prioriser les optimisations : quels jeux réduire en charge ou en bande passante.",
        interpretation: "Un jeu très joué et coûteux = cible prioritaire pour l'optimisation. Peu joué mais coûteux = possible fuite ou mauvaise requête.",
        examples: "stack_boom en tête avec 18 req/joueur → vérifier les appels API de ce jeu."
    },
    'cost-cout-vs-conversion': {
        title: 'Coût par Joueur vs Taux de Conversion',
        definition: "Graphique en nuage de points : en X le coût (ex. DB req/joueur), en Y le taux de conversion. Taille des bulles = nombre de joueurs.",
        calculation: "Par jeu : db_requests_per_player (ou équivalent), conversion_rate. Chaque point = un jeu.",
        utility: "Identifier les jeux inefficaces : coût élevé et conversion faible = à optimiser ou repenser.",
        interpretation: "Quadrant coût haut / conversion basse = pires candidats. Coût bas / conversion haute = bons élèves.",
        examples: "Jeu A : coût 2000, conversion 2 % → à optimiser en priorité."
    },
    'cost-efficacite-monetisation': {
        title: 'Efficacité Monétisation',
        definition: "Achats (ou revenus) par million d'unités de coût (ex. requêtes). Plus la valeur est élevée, plus le jeu est rentable par rapport à la charge.",
        calculation: "Purchases (ou purchase_successes) / (total cost units / 1e6) par jeu. Ou revenus / coût.",
        utility: "Identifie les jeux les plus rentables par rapport à l'infrastructure qu'ils consomment.",
        interpretation: "Valeur élevée = bon ROI infra. Faible = jeu coûteux qui ne convertit pas assez.",
        examples: "Jeu B : 50 achats pour 1 M de requêtes = bonne efficacité."
    },
    'cost-intensite-bandwidth': {
        title: 'Intensité Bande Passante',
        definition: "Mégaoctets transférés par heure de jeu, par jeu.",
        calculation: "Bandwidth (bytes) agrégé par game_id / total play_time (heures) pour ce jeu. Conversion en MB/h.",
        utility: "Identifie les jeux gourmands en bande passante (streaming, assets lourds).",
        interpretation: "MB/h élevé = beaucoup de données par heure de jeu. À réduire (cache, compression) si coûts élevés.",
        examples: "2,5 MB/h pour orbit_dodge = chargements ou sync fréquents."
    },
    'cost-alertes-actives': {
        title: 'Alertes Actives',
        definition: "Liste des métriques (par date et type) qui dépassent les seuils configurés (ex. DB requests > X).",
        calculation: "Comparaison des totaux quotidiens aux seuils. Si total_value > threshold → alerte avec % de dépassement.",
        utility: "Réagir avant les dépassements de budget ou les surcharges.",
        interpretation: "Alerte rouge = dépassement important, à traiter en priorité. Jaune = vigilance.",
        examples: "DB requests 120 % du seuil le 03/03 → investiguer la cause."
    },
    'cost-churn-cost-index': {
        title: 'Churn Cost Index',
        definition: "Indice combinant le coût (ex. requêtes) et le taux d'abandon (exit) par jeu. Jeux coûteux avec fort taux de sortie = priorité.",
        calculation: "Coût par jeu × (exit_rate ou churn). Ou score = coût × (1 - rétention). Tri par indice décroissant.",
        utility: "Priorise les optimisations sur les jeux qui coûtent cher et font fuir les joueurs.",
        interpretation: "Index élevé = double peine : on paie pour un jeu que les users quittent. À retravailler ou retirer.",
        examples: "Jeu C : coût 5000, exit 15 % → index 750 ; à améliorer l'UX ou réduire la charge."
    },
    'cost-sessions-par-joueur-actif': {
        title: 'Sessions par Joueur Actif',
        definition: "Nombre moyen de sessions générées par joueur actif (sur la journée ou la période).",
        calculation: "Total sessions / unique_players sur la période (par jour pour la courbe).",
        utility: "Mesure l'intensité d'usage quotidienne des joueurs réellement actifs.",
        interpretation: "Hausse = les joueurs actifs jouent plus souvent. Baisse = désengagement relatif.",
        examples: "5 sessions/joueur actif = en moyenne 5 parties par user actif par jour."
    },
    'cost-evolution-quotidienne-detaillee': {
        title: 'Évolution Quotidienne Détaillée',
        definition: "Tableau jour par jour : valeur, valeur précédente, différence et variation en % pour chaque type de métrique.",
        calculation: "Par (date, metric_type) : total_value, previous_value (J-1), difference, percent_change.",
        utility: "Identifier les pics anormaux et les tendances jour à jour.",
        interpretation: "Variation +50 % = pic à expliquer. -20 % = baisse d'activité ou optimisation.",
        examples: "DB requests : 10 000 (préc. 8 000), +25 % → hausse à surveiller."
    },

    // ——— GameInsights ———
    'insights-completion-rate': {
        title: 'Completion Rate',
        definition: "Pourcentage de tentatives de score qui atteignent le Top 10 (ou un objectif défini).",
        calculation: "(total_top10_attempts / total_score_attempts) × 100 par jeu. Ou succès / tentatives.",
        utility: "Indique si le jeu est trop difficile (taux bas) ou trop facile (taux haut).",
        interpretation: "Très bas = frustration, risque de sortie. Très haut = pas de défi, possible ennui. Viser un équilibre.",
        examples: "Completion 20 % = 1 partie sur 5 atteint le top 10 ; ajuster la courbe de difficulté."
    },
    'insights-frustration-index': {
        title: 'Frustration Index',
        definition: "Pourcentage de parties quittées prématurément (exits / lancements), dit « Rage Quit ».",
        calculation: "(total_exits / total_launches) × 100 par jeu.",
        utility: "Un taux élevé signale un gameplay frustrant, des bugs ou une difficulté mal calibrée.",
        interpretation: "> 5 % = à investiguer. > 10 % = priorité pour améliorer l'UX ou la difficulté.",
        examples: "memory_matrix 2,38 % = acceptable ; un jeu à 12 % = à retravailler."
    },
    'insights-game-intensity': {
        title: 'Game Intensity',
        definition: "Nombre moyen de swipes (changements d'écran / jeux) par heure de jeu.",
        calculation: "total_swipes / (total_play_time_hours) par jeu. Ou swipes par session.",
        utility: "Mesure le rythme du jeu : calme vs intense. Utile pour équilibrer l'expérience.",
        interpretation: "Élevé = les joueurs zappent beaucoup (jeu rapide ou démotivation). Faible = immersion dans un seul jeu.",
        examples: "30 swipes/h = changement de jeu toutes les 2 min en moyenne."
    },
    'insights-social-engagement': {
        title: 'Social Engagement Rate',
        definition: "Moyenne des interactions sociales (likes + commentaires + partages) par joueur unique, par jeu.",
        calculation: "(net_likes + total_comments + total_shares) / unique_players pour chaque jeu.",
        utility: "Identifie les jeux qui créent de la communauté et de la viralité.",
        interpretation: "Taux élevé = les joueurs interagissent, partagent ; bon pour l'acquisition organique.",
        examples: "2,5 interactions/joueur pour stack_boom = fort potentiel viral."
    },
    'insights-total-bookmarks': {
        title: 'Total Bookmarks',
        definition: "Nombre total de fois qu'un jeu a été mis en favoris (bookmarks) par les utilisateurs.",
        calculation: "Somme des net_bookmarks (ou total_bookmarks) par jeu.",
        utility: "Indique les jeux « coup de cœur » que les joueurs veulent retrouver facilement.",
        interpretation: "Beaucoup de favoris = jeu apprécié ; à mettre en avant dans « Mes favoris » ou recommandations.",
        examples: "multiplicity 10 bookmarks, basket_ball_tap 8 = jeux plébiscités."
    },
    'insights-total-likes': {
        title: 'Aimés totaux',
        definition: "Nombre total de likes (aimés) reçus par chaque jeu sur la période.",
        calculation: "Somme des likes par jeu (metrics->'likes'->game_id), max par utilisateur puis agrégation.",
        utility: "Identifie les jeux les plus plébiscités par les joueurs ; à renforcer ou promouvoir.",
        interpretation: "Taille du nom dans le nuage = nombre de likes. Plus c’est gros, plus le jeu est aimé.",
        examples: "stack_boom en très gros = prioriser contenu similaire ou mise en avant."
    },
    'insights-comments-ratio': {
        title: 'Comments Ratio',
        definition: "Nombre moyen de commentaires par joueur unique, par jeu.",
        calculation: "total_comments / unique_players pour chaque jeu.",
        utility: "Mesure si un jeu suscite des discussions ou des débats (communauté).",
        interpretation: "Ratio > 0 = présence de commentaires. Élevé = sujet de débat ou de passion.",
        examples: "multiplicity 0,2 commentaires/joueur = quelques échanges."
    },
    'insights-conversion-by-play-time': {
        title: 'Conversion by Play Time',
        definition: "Taux de conversion (achat) en fonction du temps de jeu cumulé avant l'achat (tranches d'heures).",
        calculation: "Par tranche (ex. 0-1h, 1-3h, 3-5h, 5h+) : nombre d'acheteurs dont le temps cumulé est dans la tranche / joueurs dans la tranche. Ou répartition des achats par tranche.",
        utility: "Permet de savoir à quel moment du cycle de vie un joueur est prêt à payer.",
        interpretation: "Pic en 1-3h = proposer l'offre après ~1h30 de jeu. Pic en 5h+ = joueurs très engagés avant d'acheter.",
        examples: "Meilleure conversion en 1-3h → afficher le paywall après 1h30 de jeu cumulé."
    },
    'insights-cart-abandonment': {
        title: 'Cart Abandonment',
        definition: "Pourcentage d'initiations d'achat (tentatives) qui sont annulées sans achat réussi.",
        calculation: "(purchaseCancels / purchaseAttempts) × 100 sur la période.",
        utility: "Un taux élevé peut indiquer un prix trop haut, un processus trop long ou des frictions.",
        interpretation: "> 50 % = friction forte (simplifier le tunnel, revoir le prix ou le message).",
        examples: "60 % d'abandon = 6 paniers abandonnés sur 10 tentatives."
    },
    'insights-pack-plus-achete': {
        title: 'Pack le Plus Acheté',
        definition: "Type de pack (produit IAP) le plus fréquemment acheté sur la période.",
        calculation: "Agrégation des purchaseTypes (ou product_id) : count par type. Le type avec le count max.",
        utility: "Identifie l'offre la plus populaire auprès des utilisateurs payants.",
        interpretation: "Mettre en avant ce pack ou en créer des variantes. Si « Non renseigné » = données purchaseTypes manquantes.",
        examples: "Pack Premium 50 % des achats = offre star."
    },
    'insights-conversion-par-jeu': {
        title: 'Conversion par jeu',
        definition: "Pour chaque jeu : pourcentage des joueurs uniques qui ont acheté sur la période (30 j).",
        calculation: "(Joueurs du jeu ayant au moins un achat / Joueurs uniques du jeu) × 100.",
        utility: "Identifie les jeux qui font le plus convertir (triggers d'achat).",
        interpretation: "Taux élevé = bon moment ou bon contexte pour proposer l'offre après ce jeu.",
        examples: "speed_tap 12 % de conversion → proposer une offre après une partie de speed_tap."
    },
    'insights-top-trigger-games': {
        title: 'Top Trigger Games',
        definition: "Jeu le plus joué par les utilisateurs qui ont effectué un achat (jeu « déclencheur » avant achat).",
        calculation: "Pour chaque acheteur : jeu avec le plus de lancements (ou temps). Agrégation : count d'acheteurs dont le jeu #1 est X. Liste des jeux par count.",
        utility: "Identifie les jeux qui convertissent le mieux les utilisateurs gratuits en payants.",
        interpretation: "Le jeu en tête est celui après lequel les users achètent le plus souvent ; idéal pour placer une offre.",
        examples: "stack_boom en tête = les acheteurs ont beaucoup joué à stack_boom avant d'acheter."
    },
    'insights-purchases-by-type': {
        title: 'Purchases by Type',
        definition: "Répartition des ventes par type de produit (pack, abonnement, etc.).",
        calculation: "Count des achats groupés par product_id ou type. Affichage en camembert.",
        utility: "Voir quel produit est le plus populaire et ajuster le catalogue ou les promos.",
        interpretation: "Un type domine = focus sur cette offre. Répartition équilibrée = diversification.",
        examples: "Pack A 40 %, Pack B 35 %, Pack C 25 %."
    },

    // ——— Timeline ———
    'timeline-joueurs-sessions': {
        title: 'Joueurs Uniques & Sessions',
        definition: "Courbe d'évolution quotidienne du nombre de joueurs uniques et du nombre de sessions sur la période sélectionnée.",
        calculation: "Par jour : unique_players et total_sessions depuis getDailyMetrics(days).",
        utility: "Voir les tendances dans le temps : croissance, saisonnalité, pics.",
        interpretation: "Même lecture que « Activité Joueurs » du Dashboard mais avec plage de dates paramétrable.",
        examples: "Courbe en dents de scie = week-end vs semaine ; courbe en hausse = croissance."
    },
    'timeline-temps-jeu-heures': {
        title: 'Temps de Jeu (Heures)',
        definition: "Courbe d'évolution du temps de jeu total (en heures) par jour sur la période.",
        calculation: "Par jour : total_play_time_hours depuis getDailyMetrics(days).",
        utility: "Suivre l'engagement en volume de temps : les joueurs jouent-ils plus ou moins ?",
        interpretation: "Hausse = plus d'engagement. Baisse = désengagement ou moins de joueurs.",
        examples: "15 h/jour en moyenne sur 30 j = 450 h total sur la période."
    },

    // ——— Export ———
    'export-periode': {
        title: "Période d'export",
        definition: "Plage de dates sélectionnée pour exporter les données (métriques quotidiennes : joueurs, sessions, temps de jeu, achats).",
        calculation: "Date de début et date de fin choisies dans le DateRangePicker. Les données exportées sont celles de getDailyMetrics sur cette plage.",
        utility: "Permet de télécharger les données brutes pour analyse externe (Excel, BI) ou archivage.",
        interpretation: "Plus la période est longue, plus le fichier est lourd. Adapter selon le besoin (rapport mensuel, trimestriel).",
        examples: "Export du 01/02 au 28/02 = métriques jour par jour pour février."
    },
    'export-action': {
        title: "Export CSV / JSON",
        definition: "Téléchargement des métriques quotidiennes (date, unique_players, total_play_time_hours, sessions, durée moyenne, tentatives/achats) au format CSV ou JSON.",
        calculation: "Appel getDailyMetrics(days) avec la période, puis génération du fichier : CSV avec en-têtes et lignes échappées, ou JSON brut.",
        utility: "Rapports personnalisés, tableaux de bord externes, partage avec l'équipe ou la direction.",
        interpretation: "CSV = compatible Excel/Sheets. JSON = pour traitements techniques ou APIs.",
        examples: "Bouton CSV → télécharge analytics_export_2026-02-01_2026-02-28.csv."
    }
}
