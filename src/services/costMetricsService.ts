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

export interface AuthEfficiency {
    metric_date: string
    total_auth_sessions: number
    total_sessions: number
    sessions_per_auth: number
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
                player_totals AS (
                    SELECT 
                        jsonb_object_keys(metrics->'gameLaunches') AS game_id,
                        COUNT(DISTINCT user_id) AS unique_players
                    FROM user_analytics_snapshots
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY jsonb_object_keys(metrics->'gameLaunches')
                ),
                purchase_totals AS (
                    SELECT 
                        key AS game_id,
                        SUM(value::int) AS total_purchases
                    FROM user_analytics_snapshots,
                         jsonb_each_text(metrics->'purchaseTypes')
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY key
                ),
                conversion_rates AS (
                    SELECT 
                        key AS game_id,
                        ROUND(
                            (SUM((metrics->>'purchaseSuccesses')::int)::numeric / 
                             NULLIF(SUM((metrics->>'purchaseAttempts')::int), 0) * 100), 2
                        ) AS conversion_rate
                    FROM user_analytics_snapshots,
                         jsonb_object_keys(metrics->'gameLaunches') AS key
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY key
                )
                SELECT 
                    c.game_id,
                    ROUND((c.total_db_requests::numeric / NULLIF(p.unique_players, 0)), 2)::float AS db_requests_per_player,
                    ROUND((c.total_bandwidth::numeric / NULLIF(p.unique_players, 0) / 1024 / 1024), 2)::float AS mb_per_player,
                    ROUND((pt.total_purchases::numeric / NULLIF(c.total_cost_units, 0) * 1000000), 2)::float AS purchases_per_million_cost,
                    COALESCE(cr.conversion_rate, 0)::float AS conversion_rate,
                    p.unique_players::int
                FROM cost_totals c
                JOIN player_totals p ON c.game_id = p.game_id
                LEFT JOIN purchase_totals pt ON c.game_id = pt.game_id
                LEFT JOIN conversion_rates cr ON c.game_id = cr.game_id
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
                WITH bandwidth_totals AS (
                    SELECT 
                        game_id,
                        SUM(metric_value) AS total_bandwidth_bytes
                    FROM cost_metrics
                    WHERE metric_type = 'bandwidth'
                      AND created_at >= NOW() - INTERVAL '${days} days'
                      AND game_id IS NOT NULL
                    GROUP BY game_id
                ),
                playtime_totals AS (
                    SELECT 
                        key AS game_id,
                        SUM(value::float) / 3600 AS total_play_time_hours
                    FROM user_analytics_snapshots,
                         jsonb_each_text(metrics->'gamePlayTime')
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY key
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
                WITH cost_totals AS (
                    SELECT 
                        game_id,
                        SUM(CASE WHEN metric_type = 'db_request' THEN metric_value ELSE 0 END) AS total_db_requests
                    FROM cost_metrics
                    WHERE created_at >= NOW() - INTERVAL '${days} days'
                      AND game_id IS NOT NULL
                    GROUP BY game_id
                ),
                exit_rates AS (
                    SELECT 
                        key AS game_id,
                        SUM((metrics->'gameExits'->>key)::int) AS total_exits,
                        SUM((metrics->'gameLaunches'->>key)::int) AS total_launches,
                        ROUND((SUM((metrics->'gameExits'->>key)::int)::numeric / NULLIF(SUM((metrics->'gameLaunches'->>key)::int), 0) * 100), 2) AS exit_rate_percent
                    FROM user_analytics_snapshots,
                         jsonb_object_keys(metrics->'gameLaunches') AS key
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY key
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

    static async getAuthEfficiency(days: number = 7): Promise<AuthEfficiency[]> {
        try {
            const query = `
                WITH auth_totals AS (
                    SELECT 
                        COUNT(*) AS total_auth_sessions,
                        DATE(created_at) AS metric_date
                    FROM cost_metrics
                    WHERE metric_type = 'auth_session'
                      AND created_at >= NOW() - INTERVAL '${days} days'
                    GROUP BY DATE(created_at)
                ),
                session_totals AS (
                    SELECT 
                        SUM((metrics->>'sessionCount')::int) AS total_sessions,
                        snapshot_date::date AS metric_date
                    FROM user_analytics_snapshots
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY snapshot_date::date
                )
                SELECT 
                    a.metric_date::text,
                    a.total_auth_sessions::int,
                    s.total_sessions::int,
                    ROUND((s.total_sessions::numeric / NULLIF(a.total_auth_sessions, 0)), 2)::float AS sessions_per_auth
                FROM auth_totals a
                JOIN session_totals s ON a.metric_date = s.metric_date
                ORDER BY a.metric_date DESC
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching auth efficiency:', error)
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
