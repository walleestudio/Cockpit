-- Copiez tout ce contenu et exécutez-le dans l'éditeur SQL de Supabase

DROP FUNCTION IF EXISTS get_kpis(INTEGER);

CREATE OR REPLACE FUNCTION get_kpis(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  unique_players BIGINT,
  total_play_time_hours NUMERIC,
  total_sessions BIGINT,
  conversion_rate_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.user_id)::BIGINT as unique_players,
    ROUND((SUM(s.cumulative_play_time_seconds) / 3600)::NUMERIC, 2) as total_play_time_hours,
    SUM((s.metrics->>'sessionCount')::int)::BIGINT as total_sessions,
    ROUND(
      (CASE 
        WHEN SUM((s.metrics->>'purchaseAttempts')::int) > 0 
        THEN (SUM((s.metrics->>'purchaseSuccesses')::int)::NUMERIC / 
              SUM((s.metrics->>'purchaseAttempts')::int) * 100)
        ELSE 0
      END)::NUMERIC, 2
    ) as conversion_rate_percent
  FROM user_analytics_snapshots s
  WHERE s.snapshot_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_kpis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_kpis(INTEGER) TO anon;
