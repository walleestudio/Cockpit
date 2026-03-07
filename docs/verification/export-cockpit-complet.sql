-- =============================================================================
-- EXPORT COCKPIT COMPLET — Une seule requête SQL pour tout extraire
-- =============================================================================
-- Exécuter dans l'éditeur SQL Neon (ou psql). Retourne UNE ligne avec une
-- colonne JSON "cockpit_export" contenant toutes les données nécessaires pour
-- alimenter Dashboard, Games, Users, Timeline, Export, Game Insights,
-- Cost & Performance, Modération et Configuration.
--
-- Périodes : 7 jours pour Cost/KPIs courts, 30 jours pour analytics.
--
-- Contenu de cockpit_export :
--   kpis              → Dashboard (4 cartes KPI)
--   daily_metrics     → Timeline, Export CSV/JSON, courbe Dashboard
--   games_analytics   → Dashboard tableau « Jeux populaires », page Games
--   users_analytics   → Page Users (tableau)
--   game_flow_metrics → Game Insights onglet Game Flow
--   cost_overview     → Cost & Performance onglet Overview (KPIs + courbe)
--   cost_daily_trend → Cost courbe évolution + tableau Trends
--   cost_alerts      → Cost onglet Alertes
--   game_efficiency  → Cost Overview barres + onglet Game Efficiency
--   session_efficiency → Cost onglet Trends (sessions/joueur actif)
--   reported_comments → Modération (tableau commentaires signalés)
--   bandwidth_intensity → Cost Game Efficiency (barres bande passante)
--   churn_cost       → Cost Alertes (barres churn cost index)
--   game_configurations → Configuration (cartes par catégorie)
--   counts           → Comptages bruts (vérifier que les tables ont des lignes)
--
-- Si la requête s’exécute sans erreur et que "counts" montre des lignes dans
-- user_analytics_snapshots (et cost_metrics pour Cost), les vues Cockpit
-- sont remplissables. Comparer les chiffres avec l’app (même période).
--
-- Note : Les onglets Game Insights « Social & Virality » et « Monetization »
-- sont alimentés par getSocialMetrics() et getMonetizationMetrics() qui
-- exécutent plusieurs requêtes côté app sur les mêmes tables (snapshots,
-- metrics JSONB). Si games_analytics et game_flow_metrics sont remplis,
-- ces onglets le sont aussi (même source).
-- =============================================================================

SELECT json_build_object(

  -- ---------------------------------------------------------------------------
  -- 1. KPIs (Dashboard – 4 cartes du haut, période 7j)
  -- ---------------------------------------------------------------------------
  'kpis',
  (WITH params AS (
    SELECT NOW() - INTERVAL '7 days' AS start_ts, NOW() AS end_ts),
  in_window AS (
    SELECT s.user_id,
      MAX(s.cumulative_play_time_seconds) AS play_time,
      MAX(COALESCE((s.metrics->>'sessionCount')::int, 0)) AS session_count,
      MAX(COALESCE((s.metrics->>'purchaseAttempts')::int, 0)) AS purchase_attempts,
      MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
    FROM user_analytics_snapshots s
    JOIN params p ON TRUE
    WHERE s.user_id IS NOT NULL AND s.snapshot_date >= p.start_ts AND s.snapshot_date < p.end_ts
    GROUP BY s.user_id),
  before_start AS (
    SELECT DISTINCT ON (s.user_id) s.user_id,
      s.cumulative_play_time_seconds AS play_time,
      COALESCE((s.metrics->>'sessionCount')::int, 0) AS session_count,
      COALESCE((s.metrics->>'purchaseAttempts')::int, 0) AS purchase_attempts,
      COALESCE((s.metrics->>'purchaseSuccesses')::int, 0) AS purchase_successes
    FROM user_analytics_snapshots s
    JOIN params p ON TRUE
    WHERE s.user_id IS NOT NULL AND s.snapshot_date < p.start_ts
    ORDER BY s.user_id, s.snapshot_date DESC),
  deltas AS (
    SELECT w.user_id,
      GREATEST(w.play_time - COALESCE(b.play_time, 0), 0) AS play_time_delta,
      GREATEST(w.session_count - COALESCE(b.session_count, 0), 0) AS session_count_delta,
      GREATEST(w.purchase_attempts - COALESCE(b.purchase_attempts, 0), 0) AS purchase_attempts_delta,
      GREATEST(w.purchase_successes - COALESCE(b.purchase_successes, 0), 0) AS purchase_successes_delta
    FROM in_window w
    LEFT JOIN before_start b ON b.user_id = w.user_id)
  SELECT json_build_object(
    'unique_players', COUNT(*)::int,
    'total_play_time_hours', ROUND((SUM(play_time_delta) / 3600)::numeric, 2)::float,
    'total_sessions', SUM(session_count_delta)::int,
    'conversion_rate_percent', ROUND((CASE WHEN SUM(purchase_attempts_delta) > 0
      THEN (SUM(purchase_successes_delta)::numeric / SUM(purchase_attempts_delta) * 100) ELSE 0 END)::numeric, 2)::float
  ) FROM deltas),

  -- ---------------------------------------------------------------------------
  -- 2. Métriques quotidiennes (Timeline, Export, Dashboard courbe – 30j)
  -- ---------------------------------------------------------------------------
  'daily_metrics',
  (WITH daily_user_max AS (
    SELECT s.user_id, s.snapshot_date::date AS date,
      MAX(s.cumulative_play_time_seconds) AS play_time,
      MAX(COALESCE((s.metrics->>'sessionCount')::int, 0)) AS session_count,
      MAX(COALESCE((s.metrics->>'totalSessionDuration')::float, 0)) AS total_session_duration,
      MAX(COALESCE((s.metrics->>'purchaseAttempts')::int, 0)) AS purchase_attempts,
      MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
    FROM user_analytics_snapshots s
    WHERE s.user_id IS NOT NULL
    GROUP BY s.user_id, s.snapshot_date::date),
  daily_deltas AS (
    SELECT d.user_id, d.date,
      GREATEST(d.play_time - COALESCE(LAG(d.play_time) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS play_time_delta,
      GREATEST(d.session_count - COALESCE(LAG(d.session_count) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS session_count_delta,
      GREATEST(d.total_session_duration - COALESCE(LAG(d.total_session_duration) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS total_session_duration_delta,
      GREATEST(d.purchase_attempts - COALESCE(LAG(d.purchase_attempts) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS purchase_attempts_delta,
      GREATEST(d.purchase_successes - COALESCE(LAG(d.purchase_successes) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS purchase_successes_delta
    FROM daily_user_max d)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT date::text AS date, COUNT(DISTINCT user_id)::int AS unique_players,
      ROUND((SUM(play_time_delta) / 3600)::numeric, 2)::float AS total_play_time_hours,
      SUM(session_count_delta)::int AS total_sessions,
      ROUND((SUM(total_session_duration_delta) / NULLIF(SUM(session_count_delta), 0) / 60)::numeric, 2)::float AS avg_session_duration_minutes,
      SUM(purchase_attempts_delta)::int AS total_purchase_attempts,
      SUM(purchase_successes_delta)::int AS total_purchase_successes
    FROM daily_deltas
    WHERE date >= (NOW() - INTERVAL '30 days')::date
    GROUP BY date ORDER BY date DESC) t),

  -- ---------------------------------------------------------------------------
  -- 3. Résumé par jeu (Dashboard tableau + page Games – 30j)
  -- ---------------------------------------------------------------------------
  'games_analytics',
  (WITH params AS (SELECT NOW() - INTERVAL '30 days' AS start_ts),
  snapshot_game_values AS (
    SELECT s.user_id, s.snapshot_date, g.game_id,
      COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0) AS launches,
      COALESCE((s.metrics->'gamePlayTime'->>g.game_id)::float, 0) AS play_time_seconds,
      COALESCE((s.metrics->'gameSwipes'->>g.game_id)::int, 0) AS swipes,
      COALESCE((s.metrics->'gameExits'->>g.game_id)::int, 0) AS exits,
      COALESCE((s.metrics->'likes'->>g.game_id)::int, 0) AS likes,
      COALESCE((s.metrics->'bookmarks'->>g.game_id)::int, 0) AS bookmarks,
      COALESCE((s.metrics->'shares'->>g.game_id)::int, 0) AS shares,
      COALESCE((s.metrics->'comments'->>g.game_id)::int, 0) AS comments,
      COALESCE((s.metrics->'scoreAttempts'->>g.game_id)::int, 0) AS score_attempts,
      COALESCE((s.metrics->'top10Attempts'->>g.game_id)::int, 0) AS top10_attempts
    FROM user_analytics_snapshots s
    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gameLaunches', '{}'::jsonb)) AS g(game_id)
    WHERE s.user_id IS NOT NULL),
  in_window AS (
    SELECT v.user_id, v.game_id, MAX(v.launches) AS launches, MAX(v.play_time_seconds) AS play_time_seconds,
      MAX(v.swipes) AS swipes, MAX(v.exits) AS exits, MAX(v.likes) AS likes, MAX(v.bookmarks) AS bookmarks,
      MAX(v.shares) AS shares, MAX(v.comments) AS comments, MAX(v.score_attempts) AS score_attempts, MAX(v.top10_attempts) AS top10_attempts
    FROM snapshot_game_values v JOIN params p ON TRUE
    WHERE v.snapshot_date >= p.start_ts GROUP BY v.user_id, v.game_id),
  before_start AS (
    SELECT DISTINCT ON (v.user_id, v.game_id) v.user_id, v.game_id, v.launches, v.play_time_seconds, v.swipes, v.exits, v.likes, v.bookmarks, v.shares, v.comments, v.score_attempts, v.top10_attempts
    FROM snapshot_game_values v JOIN params p ON TRUE
    WHERE v.snapshot_date < p.start_ts ORDER BY v.user_id, v.game_id, v.snapshot_date DESC),
  game_deltas AS (
    SELECT w.user_id, w.game_id,
      GREATEST(w.launches - COALESCE(b.launches, 0), 0) AS launches,
      GREATEST(w.play_time_seconds - COALESCE(b.play_time_seconds, 0), 0) AS play_time_seconds,
      GREATEST(w.swipes - COALESCE(b.swipes, 0), 0) AS swipes, GREATEST(w.exits - COALESCE(b.exits, 0), 0) AS exits,
      GREATEST(w.likes - COALESCE(b.likes, 0), 0) AS likes, GREATEST(w.bookmarks - COALESCE(b.bookmarks, 0), 0) AS bookmarks,
      GREATEST(w.shares - COALESCE(b.shares, 0), 0) AS shares, GREATEST(w.comments - COALESCE(b.comments, 0), 0) AS comments,
      GREATEST(w.score_attempts - COALESCE(b.score_attempts, 0), 0) AS score_attempts,
      GREATEST(w.top10_attempts - COALESCE(b.top10_attempts, 0), 0) AS top10_attempts
    FROM in_window w LEFT JOIN before_start b ON b.user_id = w.user_id AND b.game_id = w.game_id)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT game_id, COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END)::int AS unique_players, SUM(launches)::int AS total_launches,
      ROUND((SUM(play_time_seconds) / 3600)::numeric, 2)::float AS total_play_time_hours,
      ROUND((SUM(play_time_seconds) / NULLIF(SUM(launches), 0) / 60)::numeric, 2)::float AS avg_play_time_minutes,
      SUM(swipes)::int AS total_swipes, SUM(exits)::int AS total_exits,
      ROUND((CASE WHEN SUM(launches) > 0 THEN (SUM(exits)::numeric / SUM(launches) * 100) ELSE 0 END)::numeric, 2)::float AS exit_rate_percent,
      SUM(likes)::int AS net_likes, SUM(bookmarks)::int AS net_bookmarks, SUM(shares)::int AS total_shares, SUM(comments)::int AS total_comments,
      SUM(score_attempts)::int AS total_score_attempts, SUM(top10_attempts)::int AS total_top10_attempts,
      ROUND((CASE WHEN SUM(score_attempts) > 0 THEN (SUM(top10_attempts)::numeric / SUM(score_attempts) * 100) ELSE 0 END)::numeric, 2)::float AS top10_attempt_rate_percent
    FROM game_deltas GROUP BY game_id ORDER BY total_launches DESC) t),

  -- ---------------------------------------------------------------------------
  -- 4. Utilisateurs (page Users – 100 premiers)
  -- ---------------------------------------------------------------------------
  'users_analytics',
  (WITH latest_usernames AS (
    SELECT DISTINCT ON (c.user_id) c.user_id::text AS user_id, NULLIF(c.username::text, '') AS username
    FROM comments c WHERE c.user_id IS NOT NULL AND NULLIF(c.username::text, '') IS NOT NULL
    ORDER BY c.user_id, c.created_at DESC)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT ls.user_id::text, COALESCE(NULLIF((ls.metrics->>'pseudo')::text, ''), NULLIF(p.username::text, ''), lu.username, ls.user_id::text)::text AS pseudo,
      a.snapshot_count::int AS snapshot_count, ROUND((ls.cumulative_play_time_seconds / 3600)::numeric, 2)::float AS total_play_time_hours,
      COALESCE((ls.metrics->>'sessionCount')::int, 0)::int AS total_sessions,
      ROUND((COALESCE((ls.metrics->>'totalSessionDuration')::float, 0) / NULLIF(COALESCE((ls.metrics->>'sessionCount')::float, 0), 0) / 60)::numeric, 2)::float AS avg_session_duration_minutes,
      COALESCE((ls.metrics->>'purchaseAttempts')::int, 0)::int AS total_purchase_attempts, COALESCE((ls.metrics->>'purchaseSuccesses')::int, 0)::int AS total_purchase_successes,
      COALESCE((ls.metrics->>'purchaseCancels')::int, 0)::int AS total_purchase_cancels,
      ROUND((CASE WHEN COALESCE((ls.metrics->>'purchaseAttempts')::int, 0) > 0 THEN (COALESCE((ls.metrics->>'purchaseSuccesses')::numeric, 0) / COALESCE((ls.metrics->>'purchaseAttempts')::numeric, 0) * 100) ELSE 0 END)::numeric, 2)::float AS conversion_rate_percent,
      a.first_snapshot_date::date AS first_snapshot_date, a.last_snapshot_date::date AS last_snapshot_date,
      (a.last_snapshot_date::date - a.first_snapshot_date::date)::int AS user_lifetime_days
    FROM (SELECT user_id, COUNT(*) AS snapshot_count, MIN(snapshot_date) AS first_snapshot_date, MAX(snapshot_date) AS last_snapshot_date
      FROM user_analytics_snapshots WHERE user_id IS NOT NULL GROUP BY user_id) a
    JOIN LATERAL (SELECT s.* FROM user_analytics_snapshots s WHERE s.user_id = a.user_id ORDER BY s.snapshot_date DESC LIMIT 1) ls ON TRUE
    LEFT JOIN profiles p ON p.user_id = ls.user_id
    LEFT JOIN latest_usernames lu ON lu.user_id = ls.user_id::text
    ORDER BY ls.cumulative_play_time_seconds DESC NULLS LAST LIMIT 100) t),

  -- ---------------------------------------------------------------------------
  -- 5. Game Flow (Insights – completion, frustration, intensity – 30j)
  -- ---------------------------------------------------------------------------
  'game_flow_metrics',
  (WITH params AS (SELECT NOW() - INTERVAL '30 days' AS start_ts),
  snapshot_game_values AS (
    SELECT s.user_id, s.snapshot_date, g.game_id,
      COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0) AS launches,
      COALESCE((s.metrics->'gameExits'->>g.game_id)::int, 0) AS exits,
      COALESCE((s.metrics->'gamePlayTime'->>g.game_id)::float, 0) AS play_time_seconds,
      COALESCE((s.metrics->'gameSwipes'->>g.game_id)::int, 0) AS swipes,
      COALESCE((s.metrics->'scoreAttempts'->>g.game_id)::int, 0) AS score_attempts,
      COALESCE((s.metrics->'top10Attempts'->>g.game_id)::int, 0) AS top10_attempts
    FROM user_analytics_snapshots s
    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gameLaunches', '{}'::jsonb)) AS g(game_id)
    WHERE s.user_id IS NOT NULL),
  in_window AS (SELECT v.user_id, v.game_id, MAX(v.launches) AS launches, MAX(v.exits) AS exits, MAX(v.play_time_seconds) AS play_time_seconds, MAX(v.swipes) AS swipes, MAX(v.score_attempts) AS score_attempts, MAX(v.top10_attempts) AS top10_attempts
    FROM snapshot_game_values v JOIN params p ON TRUE WHERE v.snapshot_date >= p.start_ts GROUP BY v.user_id, v.game_id),
  before_start AS (SELECT DISTINCT ON (v.user_id, v.game_id) v.user_id, v.game_id, v.launches, v.exits, v.play_time_seconds, v.swipes, v.score_attempts, v.top10_attempts
    FROM snapshot_game_values v JOIN params p ON TRUE WHERE v.snapshot_date < p.start_ts ORDER BY v.user_id, v.game_id, v.snapshot_date DESC),
  game_deltas AS (SELECT w.user_id, w.game_id, GREATEST(w.launches - COALESCE(b.launches, 0), 0) AS launches, GREATEST(w.exits - COALESCE(b.exits, 0), 0) AS exits,
      GREATEST(w.play_time_seconds - COALESCE(b.play_time_seconds, 0), 0) AS play_time_seconds, GREATEST(w.swipes - COALESCE(b.swipes, 0), 0) AS swipes,
      GREATEST(w.score_attempts - COALESCE(b.score_attempts, 0), 0) AS score_attempts, GREATEST(w.top10_attempts - COALESCE(b.top10_attempts, 0), 0) AS top10_attempts
    FROM in_window w LEFT JOIN before_start b ON b.user_id = w.user_id AND b.game_id = w.game_id)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT game_id, ROUND((CASE WHEN SUM(score_attempts) > 0 THEN (SUM(top10_attempts)::numeric / SUM(score_attempts) * 100) ELSE 0 END)::numeric, 2)::float AS completion_rate_percent,
      ROUND((CASE WHEN SUM(launches) > 0 THEN (SUM(exits)::numeric / SUM(launches) * 100) ELSE 0 END)::numeric, 2)::float AS frustration_index_percent,
      ROUND((CASE WHEN SUM(play_time_seconds) > 0 THEN (SUM(swipes)::numeric / (SUM(play_time_seconds) / 3600)) ELSE 0 END)::numeric, 2)::float AS intensity_swipes_per_hour
    FROM game_deltas GROUP BY game_id ORDER BY completion_rate_percent DESC) t),

  -- ---------------------------------------------------------------------------
  -- 6. Cost Overview (Cost & Performance – 7j)
  -- ---------------------------------------------------------------------------
  'cost_overview',
  (WITH cost_totals AS (
    SELECT SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests,
      SUM(CASE WHEN metric_type = 'bandwidth' THEN metric_value ELSE 0 END) AS total_bandwidth_bytes,
      SUM(CASE WHEN metric_type = 'auth_session' THEN metric_value ELSE 0 END) AS total_auth_sessions
    FROM cost_metrics WHERE created_at >= NOW() - INTERVAL '7 days'),
  player_count AS (SELECT COUNT(DISTINCT user_id) AS unique_players FROM user_analytics_snapshots WHERE snapshot_date >= NOW() - INTERVAL '7 days'),
  trends AS (SELECT metric_type, SUM(metric_value) AS current_value,
      (SELECT SUM(metric_value) FROM cost_metrics cm2 WHERE cm2.metric_type = cm1.metric_type AND cm2.created_at >= NOW() - INTERVAL '14 days' AND cm2.created_at < NOW() - INTERVAL '7 days') AS previous_value
    FROM cost_metrics cm1 WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY metric_type)
  SELECT json_build_object('total_db_requests', (SELECT total_db_requests FROM cost_totals), 'total_bandwidth_bytes', (SELECT total_bandwidth_bytes FROM cost_totals), 'total_auth_sessions', (SELECT total_auth_sessions FROM cost_totals),
    'avg_cost_per_player', ROUND((SELECT total_db_requests FROM cost_totals)::numeric / NULLIF((SELECT unique_players FROM player_count), 0), 2),
    'trend_db_requests', ROUND(((SELECT current_value - previous_value FROM trends WHERE metric_type = 'db_request') / NULLIF((SELECT previous_value FROM trends WHERE metric_type = 'db_request'), 0) * 100)::numeric, 2),
    'trend_bandwidth', ROUND(((SELECT current_value - previous_value FROM trends WHERE metric_type = 'bandwidth') / NULLIF((SELECT previous_value FROM trends WHERE metric_type = 'bandwidth'), 0) * 100)::numeric, 2),
    'trend_auth', ROUND(((SELECT current_value - previous_value FROM trends WHERE metric_type = 'auth_session') / NULLIF((SELECT previous_value FROM trends WHERE metric_type = 'auth_session'), 0) * 100)::numeric, 2))),

  -- ---------------------------------------------------------------------------
  -- 7. Cost Daily Trend (Cost – courbe et tableau – 7j)
  -- ---------------------------------------------------------------------------
  'cost_daily_trend',
  (WITH daily_aggregates AS (
    SELECT DATE(created_at) AS metric_date, metric_type, SUM(metric_value) AS total_value
    FROM cost_metrics WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at), metric_type)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT metric_date::text, metric_type, total_value::bigint,
      LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date)::bigint AS previous_value,
      (total_value - LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date))::bigint AS difference,
      ROUND(((total_value - LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date)) / NULLIF(LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date), 0) * 100)::numeric, 2)::float AS percent_change
    FROM daily_aggregates ORDER BY metric_date DESC, metric_type) t),

  -- ---------------------------------------------------------------------------
  -- 8. Cost Alerts (Cost – onglet Alertes – 7j)
  -- ---------------------------------------------------------------------------
  'cost_alerts',
  (WITH daily_aggregates AS (
    SELECT DATE(created_at) AS metric_date, metric_type, SUM(metric_value) AS total_value
    FROM cost_metrics WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at), metric_type),
  thresholds AS (SELECT 'db_request' AS metric_type, 100000 AS threshold UNION ALL SELECT 'bandwidth', 1073741824 UNION ALL SELECT 'auth_session', 10000)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT da.metric_date::text AS metric_date, da.metric_type, da.total_value::bigint AS total_value, t.threshold::bigint AS threshold,
      ROUND(((da.total_value - t.threshold) / t.threshold::numeric * 100), 2)::float AS overage_percent
    FROM daily_aggregates da JOIN thresholds t ON da.metric_type = t.metric_type WHERE da.total_value > t.threshold ORDER BY overage_percent DESC, da.metric_date DESC) t),

  -- ---------------------------------------------------------------------------
  -- 9. Game Efficiency (Cost – Overview barres + onglet Game Efficiency – 7j)
  -- ---------------------------------------------------------------------------
  'game_efficiency',
  (WITH cost_totals AS (
    SELECT game_id, SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests,
      SUM(CASE WHEN metric_type = 'bandwidth' THEN metric_value ELSE 0 END) AS total_bandwidth,
      SUM(metric_value) AS total_cost_units
    FROM cost_metrics WHERE created_at >= NOW() - INTERVAL '7 days' AND game_id IS NOT NULL GROUP BY game_id),
  user_game_activity AS (
    SELECT s.user_id, g.game_id, SUM(COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0)) AS launches,
      MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
    FROM user_analytics_snapshots s CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gameLaunches', '{}'::jsonb)) AS g(game_id)
    WHERE snapshot_date >= NOW() - INTERVAL '7 days' GROUP BY s.user_id, g.game_id),
  player_totals AS (SELECT game_id, COUNT(DISTINCT user_id) AS unique_players FROM user_game_activity WHERE launches > 0 GROUP BY game_id),
  conversion_stats AS (SELECT game_id, COUNT(DISTINCT CASE WHEN purchase_successes > 0 THEN user_id END) AS purchasers,
      ROUND(COUNT(DISTINCT CASE WHEN purchase_successes > 0 THEN user_id END)::numeric / NULLIF(COUNT(DISTINCT user_id), 0) * 100, 2) AS conversion_rate
    FROM user_game_activity WHERE launches > 0 GROUP BY game_id)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT c.game_id, ROUND((c.total_db_requests::numeric / NULLIF(p.unique_players, 0)), 2)::float AS db_requests_per_player,
      ROUND((c.total_bandwidth::numeric / NULLIF(p.unique_players, 0) / 1024 / 1024), 2)::float AS mb_per_player,
      ROUND((cs.purchasers::numeric / NULLIF(c.total_cost_units, 0) * 1000000), 2)::float AS purchases_per_million_cost,
      COALESCE(cs.conversion_rate, 0)::float AS conversion_rate, p.unique_players::int AS unique_players
    FROM cost_totals c JOIN player_totals p ON c.game_id = p.game_id LEFT JOIN conversion_stats cs ON c.game_id = cs.game_id ORDER BY purchases_per_million_cost DESC NULLS LAST LIMIT 20) t),

  -- ---------------------------------------------------------------------------
  -- 10. Session Efficiency (Cost – onglet Trends – 7j)
  -- ---------------------------------------------------------------------------
  'session_efficiency',
  (WITH daily_user_max AS (
    SELECT user_id, snapshot_date::date AS metric_date, MAX(COALESCE((metrics->>'sessionCount')::int, 0)) AS session_count
    FROM user_analytics_snapshots WHERE user_id IS NOT NULL GROUP BY user_id, snapshot_date::date),
  daily_deltas AS (SELECT user_id, metric_date, GREATEST(session_count - COALESCE(LAG(session_count) OVER (PARTITION BY user_id ORDER BY metric_date), 0), 0) AS session_delta FROM daily_user_max),
  session_totals AS (SELECT metric_date, SUM(session_delta) AS total_sessions, COUNT(DISTINCT CASE WHEN session_delta > 0 THEN user_id END) AS active_players
    FROM daily_deltas WHERE metric_date >= (NOW() - INTERVAL '7 days')::date GROUP BY metric_date)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT s.metric_date::text, s.total_sessions::int, s.active_players::int, ROUND((s.total_sessions::numeric / NULLIF(s.active_players, 0)), 2)::float AS sessions_per_active_player FROM session_totals s ORDER BY s.metric_date DESC) t),

  -- ---------------------------------------------------------------------------
  -- 11. Commentaires signalés (Modération)
  -- ---------------------------------------------------------------------------
  'reported_comments',
  (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (SELECT c.id AS commentaire_id, c.game_id AS jeu_id, LEFT(c.content, 100) AS contenu_preview, c.content AS contenu_complet,
      c.username AS auteur, c.user_id AS auteur_id, c.user_avatar_url AS avatar_auteur,
      c.created_at AS date_creation_commentaire, c.updated_at AS date_modification_commentaire, c.hidden_at AS date_masquage,
      c.likes_count AS nombre_likes, c.dislikes_count AS nombre_dislikes, c.replies_count AS nombre_reponses,
      COALESCE(actual_reports_count.count, 0) AS nombre_signalements_reel, c.reports_count AS nombre_signalements_cache,
      CASE WHEN c.is_deleted = TRUE THEN 'Supprimé' WHEN c.is_hidden = TRUE THEN 'Masqué'
        WHEN COALESCE(actual_reports_count.count, 0) >= 10 THEN 'Auto-masqué' WHEN COALESCE(actual_reports_count.count, 0) >= 5 THEN 'Critique'
        WHEN COALESCE(actual_reports_count.count, 0) >= 2 THEN 'Attention' ELSE 'Signalé' END AS statut,
      c.is_hidden AS est_masque, c.is_deleted AS est_supprime, MAX(cr.created_at) AS date_dernier_signalement,
      (SELECT json_agg(json_build_object('user_id', cr2.user_id, 'date_signalement', cr2.created_at) ORDER BY cr2.created_at DESC) FROM (SELECT user_id, created_at FROM comment_reports WHERE comment_id = c.id ORDER BY created_at DESC LIMIT 5) cr2) AS premiers_signalements
    FROM comments c INNER JOIN comment_reports cr ON cr.comment_id = c.id
    LEFT JOIN (SELECT comment_id, COUNT(*) AS count FROM comment_reports GROUP BY comment_id) actual_reports_count ON actual_reports_count.comment_id = c.id
    WHERE c.is_deleted = FALSE
    GROUP BY c.id, c.game_id, c.content, c.username, c.user_id, c.user_avatar_url, c.created_at, c.updated_at, c.hidden_at, c.likes_count, c.dislikes_count, c.replies_count, c.reports_count, c.is_hidden, c.is_deleted, actual_reports_count.count
    ORDER BY actual_reports_count.count DESC NULLS LAST, MAX(cr.created_at) DESC) t),

  -- ---------------------------------------------------------------------------
  -- 12. Bandwidth Intensity (Cost – Game Efficiency – 7j)
  -- ---------------------------------------------------------------------------
  'bandwidth_intensity',
  (WITH params AS (SELECT NOW() - INTERVAL '7 days' AS start_ts),
  bandwidth_totals AS (SELECT game_id, SUM(metric_value) AS total_bandwidth_bytes FROM cost_metrics WHERE metric_type = 'bandwidth' AND created_at >= NOW() - INTERVAL '7 days' AND game_id IS NOT NULL GROUP BY game_id),
  snapshot_game_values AS (SELECT s.user_id, s.snapshot_date, g.game_id, COALESCE((s.metrics->'gamePlayTime'->>g.game_id)::float, 0) AS play_time_seconds
    FROM user_analytics_snapshots s CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gamePlayTime', '{}'::jsonb)) AS g(game_id) WHERE s.user_id IS NOT NULL),
  in_window AS (SELECT v.user_id, v.game_id, MAX(v.play_time_seconds) AS play_time_seconds FROM snapshot_game_values v JOIN params p ON TRUE WHERE v.snapshot_date >= p.start_ts GROUP BY v.user_id, v.game_id),
  before_start AS (SELECT DISTINCT ON (v.user_id, v.game_id) v.user_id, v.game_id, v.play_time_seconds FROM snapshot_game_values v JOIN params p ON TRUE WHERE v.snapshot_date < p.start_ts ORDER BY v.user_id, v.game_id, v.snapshot_date DESC),
  playtime_totals AS (SELECT w.game_id, SUM(GREATEST(w.play_time_seconds - COALESCE(b.play_time_seconds, 0), 0)) / 3600 AS total_play_time_hours FROM in_window w LEFT JOIN before_start b ON b.user_id = w.user_id AND b.game_id = w.game_id GROUP BY w.game_id)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT b.game_id, ROUND((b.total_bandwidth_bytes / 1024.0 / 1024.0)::numeric, 2)::float AS total_mb, ROUND(p.total_play_time_hours::numeric, 2)::float AS total_hours,
    ROUND((b.total_bandwidth_bytes / NULLIF(p.total_play_time_hours, 0) / 1024.0 / 1024.0)::numeric, 2)::float AS mb_per_hour
    FROM bandwidth_totals b JOIN playtime_totals p ON b.game_id = p.game_id ORDER BY mb_per_hour DESC LIMIT 10) t),

  -- ---------------------------------------------------------------------------
  -- 13. Churn Cost (Cost – Alertes – 7j)
  -- ---------------------------------------------------------------------------
  'churn_cost',
  (WITH params AS (SELECT NOW() - INTERVAL '7 days' AS start_ts),
  cost_totals AS (SELECT game_id, SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests FROM cost_metrics WHERE created_at >= NOW() - INTERVAL '7 days' AND game_id IS NOT NULL GROUP BY game_id),
  snapshot_game_values AS (SELECT s.user_id, s.snapshot_date, g.game_id, COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0) AS launches, COALESCE((s.metrics->'gameExits'->>g.game_id)::int, 0) AS exits
    FROM user_analytics_snapshots s CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gameLaunches', '{}'::jsonb)) AS g(game_id) WHERE s.user_id IS NOT NULL),
  in_window AS (SELECT v.user_id, v.game_id, MAX(v.launches) AS launches, MAX(v.exits) AS exits FROM snapshot_game_values v JOIN params p ON TRUE WHERE v.snapshot_date >= p.start_ts GROUP BY v.user_id, v.game_id),
  before_start AS (SELECT DISTINCT ON (v.user_id, v.game_id) v.user_id, v.game_id, v.launches, v.exits FROM snapshot_game_values v JOIN params p ON TRUE WHERE v.snapshot_date < p.start_ts ORDER BY v.user_id, v.game_id, v.snapshot_date DESC),
  game_deltas AS (SELECT w.user_id, w.game_id, GREATEST(w.exits - COALESCE(b.exits, 0), 0) AS exits_delta, GREATEST(w.launches - COALESCE(b.launches, 0), 0) AS launches_delta FROM in_window w LEFT JOIN before_start b ON b.user_id = w.user_id AND b.game_id = w.game_id),
  exit_rates AS (SELECT game_id, SUM(exits_delta) AS total_exits, SUM(launches_delta) AS total_launches, ROUND((SUM(exits_delta)::numeric / NULLIF(SUM(launches_delta), 0) * 100), 2) AS exit_rate_percent FROM game_deltas GROUP BY game_id)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT c.game_id, c.total_db_requests::bigint, e.exit_rate_percent::float, ROUND((c.total_db_requests * e.exit_rate_percent / 100)::numeric, 2)::float AS churn_cost_index FROM cost_totals c JOIN exit_rates e ON c.game_id = e.game_id WHERE e.exit_rate_percent > 10 ORDER BY churn_cost_index DESC LIMIT 10) t),

  -- ---------------------------------------------------------------------------
  -- 14. Configuration (page Config)
  -- ---------------------------------------------------------------------------
  'game_configurations',
  (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT config_key, config_value FROM game_configurations ORDER BY config_key) t),

  -- ---------------------------------------------------------------------------
  -- 15. Comptages bruts (vérification présence données)
  -- ---------------------------------------------------------------------------
  'counts',
  (SELECT json_build_object(
    'user_analytics_snapshots', (SELECT COUNT(*) FROM user_analytics_snapshots),
    'cost_metrics', (SELECT COUNT(*) FROM cost_metrics),
    'comments', (SELECT COUNT(*) FROM comments),
    'comment_reports', (SELECT COUNT(*) FROM comment_reports),
    'profiles', (SELECT COUNT(*) FROM profiles),
    'game_configurations', (SELECT COUNT(*) FROM game_configurations)
  ))

) AS cockpit_export;
