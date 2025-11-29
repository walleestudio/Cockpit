-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS get_games_analytics(INTEGER);
DROP FUNCTION IF EXISTS get_users_analytics(INTEGER);
DROP FUNCTION IF EXISTS get_daily_metrics(INTEGER);

-- Fonction pour récupérer les métriques par jeu
CREATE OR REPLACE FUNCTION get_games_analytics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  game_id TEXT,
  unique_players BIGINT,
  total_launches BIGINT,
  total_play_time_hours NUMERIC,
  avg_play_time_minutes NUMERIC,
  total_swipes BIGINT,
  total_exits BIGINT,
  exit_rate_percent NUMERIC,
  net_likes BIGINT,
  net_bookmarks BIGINT,
  total_shares BIGINT,
  total_comments BIGINT,
  total_score_attempts BIGINT,
  total_top10_attempts BIGINT,
  top10_attempt_rate_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gd.game_id::TEXT,
    COUNT(DISTINCT gd.user_id)::BIGINT as unique_players,
    SUM(gd.launch_count)::BIGINT as total_launches,
    ROUND((SUM(gd.play_time_seconds) / 3600)::NUMERIC, 2) as total_play_time_hours,
    ROUND((AVG(gd.play_time_seconds / NULLIF(gd.launch_count, 0)) / 60)::NUMERIC, 2) as avg_play_time_minutes,
    SUM(gd.swipe_count)::BIGINT as total_swipes,
    SUM(gd.exit_count)::BIGINT as total_exits,
    ROUND(
      (CASE 
        WHEN SUM(gd.launch_count) > 0 
        THEN (SUM(gd.exit_count)::NUMERIC / SUM(gd.launch_count) * 100)
        ELSE 0
      END)::NUMERIC, 2
    ) as exit_rate_percent,
    SUM(gd.net_likes)::BIGINT as net_likes,
    SUM(gd.net_bookmarks)::BIGINT as net_bookmarks,
    SUM(gd.share_count)::BIGINT as total_shares,
    SUM(gd.comment_count)::BIGINT as total_comments,
    SUM(gd.score_attempts)::BIGINT as total_score_attempts,
    SUM(gd.top10_attempts)::BIGINT as total_top10_attempts,
    ROUND(
      (CASE 
        WHEN SUM(gd.score_attempts) > 0 
        THEN (SUM(gd.top10_attempts)::NUMERIC / SUM(gd.score_attempts) * 100)
        ELSE 0
      END)::NUMERIC, 2
    ) as top10_attempt_rate_percent
  FROM (
    SELECT 
      s.user_id,
      game_launches.game_id,
      (s.metrics->'gameLaunches'->>game_launches.game_id)::int as launch_count,
      (s.metrics->'gamePlayTime'->>game_launches.game_id)::double precision as play_time_seconds,
      (s.metrics->'gameSwipes'->>game_launches.game_id)::int as swipe_count,
      (s.metrics->'gameExits'->>game_launches.game_id)::int as exit_count,
      (s.metrics->'likes'->>game_launches.game_id)::int as net_likes,
      (s.metrics->'bookmarks'->>game_launches.game_id)::int as net_bookmarks,
      (s.metrics->'shares'->>game_launches.game_id)::int as share_count,
      (s.metrics->'comments'->>game_launches.game_id)::int as comment_count,
      (s.metrics->'scoreAttempts'->>game_launches.game_id)::int as score_attempts,
      (s.metrics->'top10Attempts'->>game_launches.game_id)::int as top10_attempts
    FROM user_analytics_snapshots s,
         LATERAL jsonb_each(s.metrics->'gameLaunches') AS game_launches(game_id, launch_count)
    WHERE s.snapshot_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
      AND s.metrics->'gameLaunches' IS NOT NULL
  ) gd
  GROUP BY gd.game_id
  ORDER BY total_launches DESC;
END;
$$;

-- Fonction pour récupérer les métriques utilisateurs
CREATE OR REPLACE FUNCTION get_users_analytics(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  user_id TEXT,
  snapshot_count BIGINT,
  total_play_time_hours NUMERIC,
  total_sessions BIGINT,
  avg_session_duration_minutes NUMERIC,
  total_purchase_attempts BIGINT,
  total_purchase_successes BIGINT,
  total_purchase_cancels BIGINT,
  conversion_rate_percent NUMERIC,
  first_snapshot_date DATE,
  last_snapshot_date DATE,
  user_lifetime_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id::TEXT,
    COUNT(*)::BIGINT as snapshot_count,
    ROUND((SUM(s.cumulative_play_time_seconds) / 3600)::NUMERIC, 2) as total_play_time_hours,
    SUM((s.metrics->>'sessionCount')::int)::BIGINT as total_sessions,
    ROUND((AVG((s.metrics->>'totalSessionDuration')::double precision) / 60)::NUMERIC, 2) as avg_session_duration_minutes,
    SUM((s.metrics->>'purchaseAttempts')::int)::BIGINT as total_purchase_attempts,
    SUM((s.metrics->>'purchaseSuccesses')::int)::BIGINT as total_purchase_successes,
    SUM((s.metrics->>'purchaseCancels')::int)::BIGINT as total_purchase_cancels,
    ROUND(
      (CASE 
        WHEN SUM((s.metrics->>'purchaseAttempts')::int) > 0 
        THEN (SUM((s.metrics->>'purchaseSuccesses')::int)::NUMERIC / 
              SUM((s.metrics->>'purchaseAttempts')::int) * 100)
        ELSE 0
      END)::NUMERIC, 2
    ) as conversion_rate_percent,
    MIN(s.snapshot_date)::date as first_snapshot_date,
    MAX(s.snapshot_date)::date as last_snapshot_date,
    (MAX(s.snapshot_date)::date - MIN(s.snapshot_date)::date)::int as user_lifetime_days
  FROM user_analytics_snapshots s
  GROUP BY s.user_id
  ORDER BY total_play_time_hours DESC
  LIMIT limit_count;
END;
$$;

-- Fonction pour récupérer les métriques quotidiennes
CREATE OR REPLACE FUNCTION get_daily_metrics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date TEXT,
  unique_players BIGINT,
  total_play_time_hours NUMERIC,
  total_sessions BIGINT,
  avg_session_duration_minutes NUMERIC,
  total_purchase_attempts BIGINT,
  total_purchase_successes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(s.snapshot_date)::TEXT as date,
    COUNT(DISTINCT s.user_id)::BIGINT as unique_players,
    ROUND((SUM(s.cumulative_play_time_seconds) / 3600)::NUMERIC, 2) as total_play_time_hours,
    SUM((s.metrics->>'sessionCount')::int)::BIGINT as total_sessions,
    ROUND((AVG((s.metrics->>'totalSessionDuration')::double precision) / 60)::NUMERIC, 2) as avg_session_duration_minutes,
    SUM((s.metrics->>'purchaseAttempts')::int)::BIGINT as total_purchase_attempts,
    SUM((s.metrics->>'purchaseSuccesses')::int)::BIGINT as total_purchase_successes
  FROM user_analytics_snapshots s
  WHERE s.snapshot_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY DATE(s.snapshot_date)
  ORDER BY date ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_games_analytics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_analytics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_games_analytics(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_users_analytics(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_daily_metrics(INTEGER) TO anon;
