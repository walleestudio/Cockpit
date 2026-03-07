import { pool } from '../lib/neon'

export interface CostOverview {
    total_db_requests: number
    total_bandwidth_bytes: number
    total_auth_sessions: number
    avg_cost_per_player: number
    trend_db_requests: number
    trend_bandwidth: number
    trend_auth: number
}

export interface GameEfficiency {
    game_id: string
    db_requests_per_player: number
    mb_per_player: number
    purchases_per_million_cost: number
    conversion_rate: number
    unique_players: number
}

export interface CostAlert {
    metric_date: string
    metric_type: string
    total_value: number
    threshold: number
    overage_percent: number
}

export interface DailyCostTrend {
    metric_date: string
    metric_type: string
    total_value: number
    previous_value: number | null
    difference: number | null
    percent_change: number | null
}

export interface BandwidthIntensity {
    game_id: string
    total_mb: number
    total_hours: number
    mb_per_hour: number
}

export interface ChurnCost {
    game_id: string
    total_db_requests: number
    exit_rate_percent: number
    churn_cost_index: number
}

export interface SessionEfficiency {
    metric_date: string
    total_sessions: number
    active_players: number
    sessions_per_active_player: number
}

export class CostMetricsService {
    static async getCostOverview(days: number = 7): Promise<CostOverview | null> {
        try {
            const query = `
                WITH cost_totals AS (
                    SELECT 
                        SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests,
                        SUM(CASE WHEN metric_type = 'bandwidth' THEN metric_value ELSE 0 END) AS total_bandwidth_bytes,
                        SUM(CASE WHEN metric_type = 'auth_session' THEN metric_value ELSE 0 END) AS total_auth_sessions
                    FROM cost_metrics
                    WHERE created_at >= NOW() - INTERVAL '${days} days'
                ),
                player_count AS (
                    SELECT COUNT(DISTINCT user_id) AS unique_players
                    FROM user_analytics_snapshots
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                ),
                trends AS (
                    SELECT 
                        metric_type,
                        SUM(metric_value) AS current_value,
                        (
                            SELECT SUM(metric_value)
                            FROM cost_metrics cm2
                            WHERE cm2.metric_type = cm1.metric_type
                              AND cm2.created_at >= NOW() - INTERVAL '${days * 2} days'
                              AND cm2.created_at < NOW() - INTERVAL '${days} days'
                        ) AS previous_value
                    FROM cost_metrics cm1
                    WHERE created_at >= NOW() - INTERVAL '${days} days'
                    GROUP BY metric_type
                )
                SELECT 
                    ct.total_db_requests::bigint,
                    ct.total_bandwidth_bytes::bigint,
                    ct.total_auth_sessions::bigint,
                    ROUND((ct.total_db_requests::numeric / NULLIF(pc.unique_players, 0)), 2)::float AS avg_cost_per_player,
                    ROUND(((t1.current_value - t1.previous_value) / NULLIF(t1.previous_value, 0) * 100)::numeric, 2)::float AS trend_db_requests,
                    ROUND(((t2.current_value - t2.previous_value) / NULLIF(t2.previous_value, 0) * 100)::numeric, 2)::float AS trend_bandwidth,
                    ROUND(((t3.current_value - t3.previous_value) / NULLIF(t3.previous_value, 0) * 100)::numeric, 2)::float AS trend_auth
                FROM cost_totals ct
                CROSS JOIN player_count pc
                LEFT JOIN trends t1 ON t1.metric_type = 'db_request'
                LEFT JOIN trends t2 ON t2.metric_type = 'bandwidth'
                LEFT JOIN trends t3 ON t3.metric_type = 'auth_session'
            `
            const { rows } = await pool.query(query)
            return rows[0] || null
        } catch (error) {
            console.error('Error fetching cost overview:', error)
            throw error
        }
    }

    static async getGameEfficiency(days: number = 7): Promise<GameEfficiency[]> {
        try {
            const query = `
                WITH cost_totals AS (
                    SELECT 
                        game_id,
                        SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests,
                        SUM(CASE WHEN metric_type = 'bandwidth' THEN metric_value ELSE 0 END) AS total_bandwidth,
                        SUM(metric_value) AS total_cost_units
                    FROM cost_metrics
                    WHERE created_at >= NOW() - INTERVAL '${days} days'
                      AND game_id IS NOT NULL
                    GROUP BY game_id
                ),
                user_game_activity AS (
                    SELECT 
                        s.user_id,
                        g.game_id,
                        SUM(COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0)) AS launches,
                        MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(s.metrics->'gameLaunches') AS g(game_id)
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY s.user_id, g.game_id
                ),
                player_totals AS (
                    SELECT 
                        game_id,
                        COUNT(DISTINCT user_id) AS unique_players
                    FROM user_game_activity
                    WHERE launches > 0
                    GROUP BY game_id
                ),
                conversion_stats AS (
                    SELECT 
                        game_id,
                        COUNT(DISTINCT CASE WHEN purchase_successes > 0 THEN user_id END) AS purchasers,
                        ROUND(
                            (
                                COUNT(DISTINCT CASE WHEN purchase_successes > 0 THEN user_id END)::numeric
                                / NULLIF(COUNT(DISTINCT user_id), 0) * 100
                            ),
                            2
                        ) AS conversion_rate
                    FROM user_game_activity
                    WHERE launches > 0
                    GROUP BY game_id
                )
                SELECT 
                    c.game_id,
                    ROUND((c.total_db_requests::numeric / NULLIF(p.unique_players, 0)), 2)::float AS db_requests_per_player,
                    ROUND((c.total_bandwidth::numeric / NULLIF(p.unique_players, 0) / 1024 / 1024), 2)::float AS mb_per_player,
                    ROUND((cs.purchasers::numeric / NULLIF(c.total_cost_units, 0) * 1000000), 2)::float AS purchases_per_million_cost,
                    COALESCE(cs.conversion_rate, 0)::float AS conversion_rate,
                    p.unique_players::int
                FROM cost_totals c
                JOIN player_totals p ON c.game_id = p.game_id
                LEFT JOIN conversion_stats cs ON c.game_id = cs.game_id
                ORDER BY purchases_per_million_cost DESC NULLS LAST
                LIMIT 20
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching game efficiency:', error)
            throw error
        }
    }

    static async getBandwidthIntensity(days: number = 7): Promise<BandwidthIntensity[]> {
        try {
            const query = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                bandwidth_totals AS (
                    SELECT 
                        game_id,
                        SUM(metric_value) AS total_bandwidth_bytes
                    FROM cost_metrics
                    WHERE metric_type = 'bandwidth'
                      AND created_at >= NOW() - INTERVAL '${days} days'
                      AND game_id IS NOT NULL
                    GROUP BY game_id
                ),
                snapshot_game_values AS (
                    SELECT
                        s.user_id,
                        s.snapshot_date,
                        g.game_id,
                        COALESCE((s.metrics->'gamePlayTime'->>g.game_id)::float, 0) AS play_time_seconds
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gamePlayTime', '{}'::jsonb)) AS g(game_id)
                    WHERE s.user_id IS NOT NULL
                ),
                in_window AS (
                    SELECT
                        v.user_id,
                        v.game_id,
                        MAX(v.play_time_seconds) AS play_time_seconds
                    FROM snapshot_game_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date >= p.start_ts
                    GROUP BY v.user_id, v.game_id
                ),
                before_start AS (
                    SELECT DISTINCT ON (v.user_id, v.game_id)
                        v.user_id,
                        v.game_id,
                        v.play_time_seconds
                    FROM snapshot_game_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date < p.start_ts
                    ORDER BY v.user_id, v.game_id, v.snapshot_date DESC
                ),
                playtime_totals AS (
                    SELECT
                        w.game_id,
                        SUM(GREATEST(w.play_time_seconds - COALESCE(b.play_time_seconds, 0), 0)) / 3600 AS total_play_time_hours
                    FROM in_window w
                    LEFT JOIN before_start b
                      ON b.user_id = w.user_id
                     AND b.game_id = w.game_id
                    GROUP BY w.game_id
                )
                SELECT 
                    b.game_id,
                    ROUND((b.total_bandwidth_bytes / 1024.0 / 1024.0)::numeric, 2)::float AS total_mb,
                    ROUND(p.total_play_time_hours::numeric, 2)::float AS total_hours,
                    ROUND((b.total_bandwidth_bytes / NULLIF(p.total_play_time_hours, 0) / 1024.0 / 1024.0)::numeric, 2)::float AS mb_per_hour
                FROM bandwidth_totals b
                JOIN playtime_totals p ON b.game_id = p.game_id
                ORDER BY mb_per_hour DESC
                LIMIT 10
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching bandwidth intensity:', error)
            throw error
        }
    }

    static async getChurnCost(days: number = 7): Promise<ChurnCost[]> {
        try {
            const query = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                cost_totals AS (
                    SELECT 
                        game_id,
                        SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests
                    FROM cost_metrics
                    WHERE created_at >= NOW() - INTERVAL '${days} days'
                      AND game_id IS NOT NULL
                    GROUP BY game_id
                ),
                snapshot_game_values AS (
                    SELECT
                        s.user_id,
                        s.snapshot_date,
                        g.game_id,
                        COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0) AS launches,
                        COALESCE((s.metrics->'gameExits'->>g.game_id)::int, 0) AS exits
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gameLaunches', '{}'::jsonb)) AS g(game_id)
                    WHERE s.user_id IS NOT NULL
                ),
                in_window AS (
                    SELECT
                        v.user_id,
                        v.game_id,
                        MAX(v.launches) AS launches,
                        MAX(v.exits) AS exits
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
                        v.exits
                    FROM snapshot_game_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date < p.start_ts
                    ORDER BY v.user_id, v.game_id, v.snapshot_date DESC
                ),
                game_deltas AS (
                    SELECT 
                        w.game_id,
                        GREATEST(w.exits - COALESCE(b.exits, 0), 0) AS exits_delta,
                        GREATEST(w.launches - COALESCE(b.launches, 0), 0) AS launches_delta
                    FROM in_window w
                    LEFT JOIN before_start b
                      ON b.user_id = w.user_id
                     AND b.game_id = w.game_id
                ),
                exit_rates AS (
                    SELECT
                        game_id,
                        SUM(exits_delta) AS total_exits,
                        SUM(launches_delta) AS total_launches,
                        ROUND((SUM(exits_delta)::numeric / NULLIF(SUM(launches_delta), 0) * 100), 2) AS exit_rate_percent
                    FROM game_deltas
                    GROUP BY game_id
                )
                SELECT 
                    c.game_id,
                    c.total_db_requests::bigint,
                    e.exit_rate_percent::float,
                    ROUND((c.total_db_requests * e.exit_rate_percent / 100)::numeric, 2)::float AS churn_cost_index
                FROM cost_totals c
                JOIN exit_rates e ON c.game_id = e.game_id
                WHERE e.exit_rate_percent > 10
                ORDER BY churn_cost_index DESC
                LIMIT 10
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching churn cost:', error)
            throw error
        }
    }

    static async getSessionEfficiency(days: number = 7): Promise<SessionEfficiency[]> {
        try {
            const query = `
                WITH daily_user_max AS (
                    SELECT 
                        user_id,
                        snapshot_date::date AS metric_date,
                        MAX(COALESCE((metrics->>'sessionCount')::int, 0)) AS session_count
                    FROM user_analytics_snapshots
                    WHERE user_id IS NOT NULL
                    GROUP BY user_id, snapshot_date::date
                ),
                daily_deltas AS (
                    SELECT
                        user_id,
                        metric_date,
                        GREATEST(
                            session_count - COALESCE(LAG(session_count) OVER (PARTITION BY user_id ORDER BY metric_date), 0),
                            0
                        ) AS session_delta
                    FROM daily_user_max
                ),
                session_totals AS (
                    SELECT
                        metric_date,
                        SUM(session_delta) AS total_sessions,
                        COUNT(DISTINCT CASE WHEN session_delta > 0 THEN user_id END) AS active_players
                    FROM daily_deltas
                    WHERE metric_date >= (NOW() - INTERVAL '${days} days')::date
                    GROUP BY metric_date
                )
                SELECT 
                    s.metric_date::text,
                    s.total_sessions::int,
                    s.active_players::int,
                    ROUND((s.total_sessions::numeric / NULLIF(s.active_players, 0)), 2)::float AS sessions_per_active_player
                FROM session_totals s
                ORDER BY s.metric_date DESC
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching session efficiency:', error)
            throw error
        }
    }

    static async getDailyCostTrend(days: number = 7): Promise<DailyCostTrend[]> {
        try {
            const query = `
                WITH daily_aggregates AS (
                    SELECT 
                        DATE(created_at) AS metric_date,
                        metric_type,
                        SUM(metric_value) AS total_value
                    FROM cost_metrics
                    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
                    GROUP BY DATE(created_at), metric_type
                )
                SELECT 
                    metric_date::text,
                    metric_type,
                    total_value::bigint,
                    LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date)::bigint AS previous_value,
                    (total_value - LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date))::bigint AS difference,
                    ROUND(
                        ((total_value - LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date)) 
                         / NULLIF(LAG(total_value) OVER (PARTITION BY metric_type ORDER BY metric_date), 0) * 100)::numeric, 
                        2
                    )::float AS percent_change
                FROM daily_aggregates
                ORDER BY metric_date DESC, metric_type
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching daily cost trend:', error)
            throw error
        }
    }

    static async getCostAlerts(days: number = 7): Promise<CostAlert[]> {
        try {
            const query = `
                WITH daily_aggregates AS (
                    SELECT 
                        DATE(created_at) AS metric_date,
                        metric_type,
                        SUM(metric_value) AS total_value
                    FROM cost_metrics
                    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
                    GROUP BY DATE(created_at), metric_type
                ),
                thresholds AS (
                    SELECT 'db_request' AS metric_type, 100000 AS threshold
                    UNION ALL
                    SELECT 'bandwidth', 1073741824
                    UNION ALL
                    SELECT 'auth_session', 10000
                )
                SELECT 
                    da.metric_date::text,
                    da.metric_type,
                    da.total_value::bigint,
                    t.threshold::bigint,
                    ROUND(((da.total_value - t.threshold) / t.threshold::numeric * 100), 2)::float AS overage_percent
                FROM daily_aggregates da
                JOIN thresholds t ON da.metric_type = t.metric_type
                WHERE da.total_value > t.threshold
                ORDER BY overage_percent DESC, da.metric_date DESC
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching cost alerts:', error)
            throw error
        }
    }
}
