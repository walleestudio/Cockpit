-- Copiez tout ce contenu et exécutez-le dans l'éditeur SQL de Supabase

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
