-- =============================================================================
-- Export BDD pour vérifier que Cockpit affiche les bonnes métriques
-- Exécuter chaque requête dans l'éditeur SQL Neon (ou psql), puis comparer
-- les résultats avec les écrans Cockpit (même période).
-- Période : les requêtes ci-dessous utilisent 7 j (KPIs, Cost) et 30 j (Daily, Games).
-- Pour changer, remplacez '7 days' / '30 days' dans chaque requête.

-- =============================================================================
-- 1. KPIs (Dashboard – 4 cartes du haut)
-- À comparer avec : Dashboard, période = 7 derniers jours
-- =============================================================================

WITH params AS (
    SELECT
        NOW() - INTERVAL '7 days' AS start_ts,
        NOW() AS end_ts
),
in_window AS (
    SELECT
        s.user_id,
        MAX(s.cumulative_play_time_seconds) AS play_time,
        MAX(COALESCE((s.metrics->>'sessionCount')::int, 0)) AS session_count,
        MAX(COALESCE((s.metrics->>'purchaseAttempts')::int, 0)) AS purchase_attempts,
        MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
    FROM user_analytics_snapshots s
    JOIN params p ON TRUE
    WHERE s.user_id IS NOT NULL
      AND s.snapshot_date >= p.start_ts
      AND s.snapshot_date < p.end_ts
    GROUP BY s.user_id
),
before_start AS (
    SELECT DISTINCT ON (s.user_id)
        s.user_id,
        s.cumulative_play_time_seconds AS play_time,
        COALESCE((s.metrics->>'sessionCount')::int, 0) AS session_count,
        COALESCE((s.metrics->>'purchaseAttempts')::int, 0) AS purchase_attempts,
        COALESCE((s.metrics->>'purchaseSuccesses')::int, 0) AS purchase_successes
    FROM user_analytics_snapshots s
    JOIN params p ON TRUE
    WHERE s.user_id IS NOT NULL
      AND s.snapshot_date < p.start_ts
    ORDER BY s.user_id, s.snapshot_date DESC
),
deltas AS (
    SELECT
        w.user_id,
        GREATEST(w.play_time - COALESCE(b.play_time, 0), 0) AS play_time_delta,
        GREATEST(w.session_count - COALESCE(b.session_count, 0), 0) AS session_count_delta,
        GREATEST(w.purchase_attempts - COALESCE(b.purchase_attempts, 0), 0) AS purchase_attempts_delta,
        GREATEST(w.purchase_successes - COALESCE(b.purchase_successes, 0), 0) AS purchase_successes_delta
    FROM in_window w
    LEFT JOIN before_start b ON b.user_id = w.user_id
)
SELECT
    'KPIs_7j' AS source,
    COUNT(*)::int AS unique_players,
    ROUND((SUM(play_time_delta) / 3600)::numeric, 2)::float AS total_play_time_hours,
    SUM(session_count_delta)::int AS total_sessions,
    ROUND(
        (CASE
            WHEN SUM(purchase_attempts_delta) > 0
            THEN (SUM(purchase_successes_delta)::numeric / SUM(purchase_attempts_delta) * 100)
            ELSE 0
        END)::numeric, 2
    )::float AS conversion_rate_percent
FROM deltas;


-- =============================================================================
-- 2. Métriques quotidiennes (Timeline + Export)
-- À comparer avec : Timeline, Export CSV/JSON – période 30 jours
-- =============================================================================

WITH daily_user_max AS (
    SELECT
        s.user_id,
        s.snapshot_date::date AS date,
        MAX(s.cumulative_play_time_seconds) AS play_time,
        MAX(COALESCE((s.metrics->>'sessionCount')::int, 0)) AS session_count,
        MAX(COALESCE((s.metrics->>'totalSessionDuration')::float, 0)) AS total_session_duration,
        MAX(COALESCE((s.metrics->>'purchaseAttempts')::int, 0)) AS purchase_attempts,
        MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
    FROM user_analytics_snapshots s
    WHERE s.user_id IS NOT NULL
    GROUP BY s.user_id, s.snapshot_date::date
),
daily_deltas AS (
    SELECT
        d.user_id,
        d.date,
        GREATEST(d.play_time - COALESCE(LAG(d.play_time) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS play_time_delta,
        GREATEST(d.session_count - COALESCE(LAG(d.session_count) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS session_count_delta,
        GREATEST(d.total_session_duration - COALESCE(LAG(d.total_session_duration) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS total_session_duration_delta,
        GREATEST(d.purchase_attempts - COALESCE(LAG(d.purchase_attempts) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS purchase_attempts_delta,
        GREATEST(d.purchase_successes - COALESCE(LAG(d.purchase_successes) OVER (PARTITION BY d.user_id ORDER BY d.date), 0), 0) AS purchase_successes_delta
    FROM daily_user_max d
)
SELECT
    date::text AS date,
    COUNT(DISTINCT user_id)::int AS unique_players,
    ROUND((SUM(play_time_delta) / 3600)::numeric, 2)::float AS total_play_time_hours,
    SUM(session_count_delta)::int AS total_sessions,
    ROUND((SUM(total_session_duration_delta) / NULLIF(SUM(session_count_delta), 0) / 60)::numeric, 2)::float AS avg_session_duration_minutes,
    SUM(purchase_attempts_delta)::int AS total_purchase_attempts,
    SUM(purchase_successes_delta)::int AS total_purchase_successes
FROM daily_deltas
WHERE date >= (NOW() - INTERVAL '30 days')::date
GROUP BY date
ORDER BY date DESC;


-- =============================================================================
-- 3. Résumé par jeu (Dashboard tableau + page Games)
-- À comparer avec : Dashboard « Jeux populaires », page Games – période 30 j
-- =============================================================================

WITH params AS (
    SELECT NOW() - INTERVAL '30 days' AS start_ts
),
snapshot_game_values AS (
    SELECT
        s.user_id,
        s.snapshot_date,
        g.game_id,
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
    WHERE s.user_id IS NOT NULL
),
in_window AS (
    SELECT
        v.user_id,
        v.game_id,
        MAX(v.launches) AS launches,
        MAX(v.play_time_seconds) AS play_time_seconds,
        MAX(v.swipes) AS swipes,
        MAX(v.exits) AS exits,
        MAX(v.likes) AS likes,
        MAX(v.bookmarks) AS bookmarks,
        MAX(v.shares) AS shares,
        MAX(v.comments) AS comments,
        MAX(v.score_attempts) AS score_attempts,
        MAX(v.top10_attempts) AS top10_attempts
    FROM snapshot_game_values v
    JOIN params p ON TRUE
    WHERE v.snapshot_date >= p.start_ts
    GROUP BY v.user_id, v.game_id
),
before_start AS (
    SELECT DISTINCT ON (v.user_id, v.game_id)
        v.user_id,
        v.game_id,
        v.launches,
        v.play_time_seconds,
        v.swipes,
        v.exits,
        v.likes,
        v.bookmarks,
        v.shares,
        v.comments,
        v.score_attempts,
        v.top10_attempts
    FROM snapshot_game_values v
    JOIN params p ON TRUE
    WHERE v.snapshot_date < p.start_ts
    ORDER BY v.user_id, v.game_id, v.snapshot_date DESC
),
game_deltas AS (
    SELECT
        w.user_id,
        w.game_id,
        GREATEST(w.launches - COALESCE(b.launches, 0), 0) AS launches,
        GREATEST(w.play_time_seconds - COALESCE(b.play_time_seconds, 0), 0) AS play_time_seconds,
        GREATEST(w.swipes - COALESCE(b.swipes, 0), 0) AS swipes,
        GREATEST(w.exits - COALESCE(b.exits, 0), 0) AS exits,
        GREATEST(w.likes - COALESCE(b.likes, 0), 0) AS likes,
        GREATEST(w.bookmarks - COALESCE(b.bookmarks, 0), 0) AS bookmarks,
        GREATEST(w.shares - COALESCE(b.shares, 0), 0) AS shares,
        GREATEST(w.comments - COALESCE(b.comments, 0), 0) AS comments,
        GREATEST(w.score_attempts - COALESCE(b.score_attempts, 0), 0) AS score_attempts,
        GREATEST(w.top10_attempts - COALESCE(b.top10_attempts, 0), 0) AS top10_attempts
    FROM in_window w
    LEFT JOIN before_start b ON b.user_id = w.user_id AND b.game_id = w.game_id
)
SELECT
    game_id,
    COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END)::int AS unique_players,
    SUM(launches)::int AS total_launches,
    ROUND((SUM(play_time_seconds) / 3600)::numeric, 2)::float AS total_play_time_hours,
    ROUND((SUM(play_time_seconds) / NULLIF(SUM(launches), 0) / 60)::numeric, 2)::float AS avg_play_time_minutes,
    SUM(exits)::int AS total_exits,
    ROUND((CASE WHEN SUM(launches) > 0 THEN (SUM(exits)::numeric / SUM(launches) * 100) ELSE 0 END)::numeric, 2)::float AS exit_rate_percent,
    SUM(likes)::int AS net_likes,
    SUM(shares)::int AS total_shares
FROM game_deltas
GROUP BY game_id
ORDER BY total_launches DESC
LIMIT 20;


-- =============================================================================
-- 4. Coûts (Cost & Performance – Overview)
-- À comparer avec : Cost & Performance, onglet Overview (7 j)
-- =============================================================================

WITH cost_totals AS (
    SELECT
        SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests,
        SUM(CASE WHEN metric_type = 'bandwidth' THEN metric_value ELSE 0 END) AS total_bandwidth_bytes,
        SUM(CASE WHEN metric_type = 'auth_session' THEN metric_value ELSE 0 END) AS total_auth_sessions
    FROM cost_metrics
    WHERE created_at >= NOW() - INTERVAL '7 days'
),
player_count AS (
    SELECT COUNT(DISTINCT user_id) AS unique_players
    FROM user_analytics_snapshots
    WHERE snapshot_date >= NOW() - INTERVAL '7 days'
)
SELECT
    ct.total_db_requests::bigint,
    ct.total_bandwidth_bytes::bigint,
    ct.total_auth_sessions::bigint,
    ROUND((ct.total_db_requests::numeric / NULLIF(pc.unique_players, 0)), 2)::float AS avg_cost_per_player
FROM cost_totals ct
CROSS JOIN player_count pc;
