

export interface DailyMetrics {
    date: string
    unique_players: number
    total_play_time_hours: number
    total_sessions: number
    avg_session_duration_minutes: number
    total_purchase_attempts: number
    total_purchase_successes: number
}

export interface GameAnalytics {
    game_id: string
    unique_players: number
    total_launches: number
    total_play_time_hours: number
    avg_play_time_minutes: number
    total_swipes: number
    total_exits: number
    exit_rate_percent: number
    net_likes: number
    net_bookmarks: number
    total_shares: number
    total_comments: number
    total_score_attempts: number
    total_top10_attempts: number
    top10_attempt_rate_percent: number
}

export interface UserAnalytics {
    user_id: string
    pseudo: string
    snapshot_count: number
    total_play_time_hours: number
    total_sessions: number
    avg_session_duration_minutes: number
    total_purchase_attempts: number
    total_purchase_successes: number
    total_purchase_cancels: number
    conversion_rate_percent: number
    first_snapshot_date: string
    last_snapshot_date: string
    user_lifetime_days: number
}

export interface KPIData {
    unique_players: number
    total_play_time_hours: number
    total_sessions: number
    conversion_rate_percent: number
}

export interface GameFlowMetrics {
    game_id: string
    completion_rate_percent: number
    frustration_index_percent: number
    intensity_swipes_per_hour: number
}

export interface SocialMetrics {
    game_id: string
    social_engagement_rate: number
    total_bookmarks: number
    comments_to_players_ratio: number
}

export interface MonetizationMetrics {
    conversion_by_play_time: {
        hours_range: string
        conversion_rate: number
    }[]
    cart_abandonment_rate: number
    most_purchased_pack: string
    purchases_by_game: {
        game_id: string
        purchase_count: number
    }[]
    purchases_by_type: {
        product_id: string
        count: number
    }[]
}

import { pool } from '../lib/neon'

export class AnalyticsService {
    static async getKPIs(days: number = 7): Promise<KPIData | null> {
        try {
            const query = `
                SELECT 
                    COUNT(DISTINCT user_id)::int as unique_players,
                    ROUND((SUM(cumulative_play_time_seconds) / 3600)::numeric, 2)::float as total_play_time_hours,
                    SUM((metrics->>'sessionCount')::int)::int as total_sessions,
                    ROUND(
                      (CASE 
                        WHEN SUM((metrics->>'purchaseAttempts')::int) > 0 
                        THEN (SUM((metrics->>'purchaseSuccesses')::int)::numeric / SUM((metrics->>'purchaseAttempts')::int) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as conversion_rate_percent
                FROM user_analytics_snapshots
                WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
            `
            const { rows } = await pool.query(query)
            return rows[0] || {
                unique_players: 0,
                total_play_time_hours: 0,
                total_sessions: 0,
                conversion_rate_percent: 0
            }
        } catch (error) {
            console.error('Error fetching KPIs:', error)
            throw error
        }
    }

    static async getGamesAnalytics(days: number = 30): Promise<GameAnalytics[]> {
        try {
            const query = `
                SELECT
                    game_id,
                    COUNT(DISTINCT user_id)::int as unique_players,
                    SUM((metrics->'gameLaunches'->>game_id)::int)::int as total_launches,
                    ROUND((SUM((metrics->'gamePlayTime'->>game_id)::float) / 3600)::numeric, 2)::float as total_play_time_hours,
                    ROUND((AVG((metrics->'gamePlayTime'->>game_id)::float / NULLIF((metrics->'gameLaunches'->>game_id)::int, 0)) / 60)::numeric, 2)::float as avg_play_time_minutes,
                    SUM((metrics->'gameSwipes'->>game_id)::int)::int as total_swipes,
                    SUM((metrics->'gameExits'->>game_id)::int)::int as total_exits,
                    ROUND(
                      (CASE
                        WHEN SUM((metrics->'gameLaunches'->>game_id)::int) > 0
                        THEN (SUM((metrics->'gameExits'->>game_id)::int)::numeric / SUM((metrics->'gameLaunches'->>game_id)::int) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as exit_rate_percent,
                    SUM((metrics->'likes'->>game_id)::int)::int as net_likes,
                    SUM((metrics->'bookmarks'->>game_id)::int)::int as net_bookmarks,
                    SUM((metrics->'shares'->>game_id)::int)::int as total_shares,
                    SUM((metrics->'comments'->>game_id)::int)::int as total_comments,
                    SUM((metrics->'scoreAttempts'->>game_id)::int)::int as total_score_attempts,
                    SUM((metrics->'top10Attempts'->>game_id)::int)::int as total_top10_attempts,
                    ROUND(
                      (CASE
                        WHEN SUM((metrics->'scoreAttempts'->>game_id)::int) > 0
                        THEN (SUM((metrics->'top10Attempts'->>game_id)::int)::numeric / SUM((metrics->'scoreAttempts'->>game_id)::int) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as top10_attempt_rate_percent
                FROM user_analytics_snapshots,
                     jsonb_object_keys(metrics->'gameLaunches') as game_id
                WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                GROUP BY game_id
                ORDER BY total_launches DESC
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching games analytics:', error)
            throw error
        }
    }

    static async getUsersAnalytics(limit: number = 100): Promise<UserAnalytics[]> {
        try {
            const query = `
                WITH latest_usernames AS (
                    SELECT DISTINCT ON (c.user_id)
                        c.user_id::text as user_id,
                        NULLIF(c.username::text, '') as username
                    FROM comments c
                    WHERE c.user_id IS NOT NULL
                      AND NULLIF(c.username::text, '') IS NOT NULL
                    ORDER BY c.user_id, c.created_at DESC
                )
                SELECT 
                    s.user_id::text,
                    COALESCE(
                      MAX(NULLIF((s.metrics->>'pseudo')::text, '')),
                      lu.username,
                      s.user_id::text
                    )::text as pseudo,
                    COUNT(*)::int as snapshot_count,
                    ROUND((SUM(s.cumulative_play_time_seconds) / 3600)::numeric, 2)::float as total_play_time_hours,
                    SUM((s.metrics->>'sessionCount')::int)::int as total_sessions,
                    ROUND((AVG((s.metrics->>'totalSessionDuration')::float) / 60)::numeric, 2)::float as avg_session_duration_minutes,
                    SUM((s.metrics->>'purchaseAttempts')::int)::int as total_purchase_attempts,
                    SUM((s.metrics->>'purchaseSuccesses')::int)::int as total_purchase_successes,
                    SUM((s.metrics->>'purchaseCancels')::int)::int as total_purchase_cancels,
                    ROUND(
                      (CASE 
                        WHEN SUM((s.metrics->>'purchaseAttempts')::int) > 0 
                        THEN (SUM((s.metrics->>'purchaseSuccesses')::int)::numeric / SUM((s.metrics->>'purchaseAttempts')::int) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as conversion_rate_percent,
                    MIN(s.snapshot_date)::date as first_snapshot_date,
                    MAX(s.snapshot_date)::date as last_snapshot_date,
                    (MAX(s.snapshot_date)::date - MIN(s.snapshot_date)::date)::int as user_lifetime_days
                FROM user_analytics_snapshots s
                LEFT JOIN latest_usernames lu ON lu.user_id = s.user_id::text
                GROUP BY s.user_id, lu.username
                ORDER BY total_play_time_hours DESC
                LIMIT ${limit}
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching users analytics:', error)
            throw error
        }
    }

    static async getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
        try {
            const query = `
                SELECT 
                    snapshot_date::date::text as date,
                    COUNT(DISTINCT user_id)::int as unique_players,
                    ROUND((SUM(cumulative_play_time_seconds) / 3600)::numeric, 2)::float as total_play_time_hours,
                    SUM((metrics->>'sessionCount')::int)::int as total_sessions,
                    ROUND((AVG((metrics->>'totalSessionDuration')::float) / 60)::numeric, 2)::float as avg_session_duration_minutes,
                    SUM((metrics->>'purchaseAttempts')::int)::int as total_purchase_attempts,
                    SUM((metrics->>'purchaseSuccesses')::int)::int as total_purchase_successes
                FROM user_analytics_snapshots
                WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                GROUP BY snapshot_date::date
                ORDER BY date DESC
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching daily metrics:', error)
            throw error
        }
    }
    static async getGameFlowMetrics(days: number = 30): Promise<GameFlowMetrics[]> {
        try {
            const query = `
                SELECT
                    game_id,
                    ROUND(
                      (CASE
                        WHEN SUM((metrics->'scoreAttempts'->>game_id)::int) > 0
                        THEN (SUM((metrics->'top10Attempts'->>game_id)::int)::numeric / SUM((metrics->'scoreAttempts'->>game_id)::int) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as completion_rate_percent,
                    ROUND(
                      (CASE
                        WHEN SUM((metrics->'gameLaunches'->>game_id)::int) > 0
                        THEN (SUM((metrics->'gameExits'->>game_id)::int)::numeric / SUM((metrics->'gameLaunches'->>game_id)::int) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as frustration_index_percent,
                    ROUND(
                      (CASE
                        WHEN SUM((metrics->'gamePlayTime'->>game_id)::float) > 0
                        THEN (SUM((metrics->'gameSwipes'->>game_id)::int)::numeric / (SUM((metrics->'gamePlayTime'->>game_id)::float) / 3600))
                        ELSE 0
                      END)::numeric, 2
                    )::float as intensity_swipes_per_hour
                FROM user_analytics_snapshots,
                     jsonb_object_keys(metrics->'gameLaunches') as game_id
                WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                GROUP BY game_id
                ORDER BY completion_rate_percent DESC
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching game flow metrics:', error)
            throw error
        }
    }

    static async getSocialMetrics(days: number = 30): Promise<SocialMetrics[]> {
        try {
            const query = `
                SELECT
                    game_id,
                    ROUND(
                      (CASE
                        WHEN COUNT(DISTINCT user_id) > 0
                        THEN ((SUM((metrics->'likes'->>game_id)::int) + SUM((metrics->'comments'->>game_id)::int) + SUM((metrics->'shares'->>game_id)::int))::numeric / COUNT(DISTINCT user_id))
                        ELSE 0
                      END)::numeric, 4
                    )::float as social_engagement_rate,
                    SUM((metrics->'bookmarks'->>game_id)::int)::int as total_bookmarks,
                    ROUND(
                      (CASE
                        WHEN COUNT(DISTINCT user_id) > 0
                        THEN (SUM((metrics->'comments'->>game_id)::int)::numeric / COUNT(DISTINCT user_id))
                        ELSE 0
                      END)::numeric, 4
                    )::float as comments_to_players_ratio
                FROM user_analytics_snapshots,
                     jsonb_object_keys(metrics->'gameLaunches') as game_id
                WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                GROUP BY game_id
                ORDER BY social_engagement_rate DESC
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching social metrics:', error)
            throw error
        }
    }

    static async getMonetizationMetrics(days: number = 30): Promise<MonetizationMetrics> {
        try {
            // 1. Conversion by Play Time Range
            const conversionQuery = `
                WITH ranges AS (
                    SELECT 
                        user_id,
                        MAX(cumulative_play_time_seconds) as max_time,
                        MAX((metrics->>'purchaseSuccesses')::int) as purchases
                    FROM user_analytics_snapshots
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                    GROUP BY user_id
                )
                SELECT 
                    CASE 
                        WHEN max_time < 3600 THEN '0-1h'
                        WHEN max_time < 10800 THEN '1-3h'
                        WHEN max_time < 18000 THEN '3-5h'
                        ELSE '5h+'
                    END as hours_range,
                    COUNT(*) as total_users,
                    SUM(CASE WHEN purchases > 0 THEN 1 ELSE 0 END) as purchasers
                FROM ranges
                GROUP BY 1
                ORDER BY MIN(max_time)
            `
            const conversionRes = await pool.query(conversionQuery)
            const conversion_by_play_time = conversionRes.rows.map(row => ({
                hours_range: row.hours_range,
                conversion_rate: row.total_users > 0 ? (row.purchasers / row.total_users) * 100 : 0
            }))

            // 2. Cart Abandonment & Most Purchased Pack
            const globalQuery = `
                SELECT 
                    ROUND(
                      (CASE 
                        WHEN SUM((metrics->>'purchaseAttempts')::int) > 0 
                        THEN (SUM((metrics->>'purchaseCancels')::int)::numeric / SUM((metrics->>'purchaseAttempts')::int) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as cart_abandonment_rate
                FROM user_analytics_snapshots
            `
            const globalRes = await pool.query(globalQuery)

            // Get most purchased pack
            const packQuery = `
                SELECT 
                    key as product_id,
                    SUM(value::int)::int as count
                FROM user_analytics_snapshots,
                     jsonb_each_text(metrics->'purchaseTypes')
                WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                GROUP BY key
                ORDER BY count DESC
                LIMIT 1
            `
            const packRes = await pool.query(packQuery)
            const most_purchased_pack = packRes.rows[0]?.product_id || 'N/A'

            // 3. Purchases by Game (Approximation: Game with most play time in purchasing snapshots)
            // 3. Purchases by Game (Approximation: Game with most play time in purchasing snapshots)
            // We find the max played game PER USER who purchased.

            const betterGameQuery = `
                WITH user_max_game AS (
                    SELECT 
                        user_id,
                        (
                            SELECT key 
                            FROM jsonb_each_text(metrics->'gamePlayTime') 
                            ORDER BY value::float DESC 
                            LIMIT 1
                        ) as top_game
                    FROM user_analytics_snapshots
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                      AND (metrics->>'purchaseSuccesses')::int > 0
                    GROUP BY user_id, top_game
                )
                SELECT 
                    top_game as game_id,
                    COUNT(*) as purchase_count
                FROM user_max_game
                WHERE top_game IS NOT NULL
                GROUP BY top_game
                ORDER BY purchase_count DESC
            `
            const gameRes = await pool.query(betterGameQuery)

            // 4. Purchases by Type
            const typeQuery = `
                SELECT 
                    key as product_id,
                    SUM(value::int)::int as count
                FROM user_analytics_snapshots,
                     jsonb_each_text(metrics->'purchaseTypes')
                WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                GROUP BY key
                ORDER BY count DESC
            `
            const typeRes = await pool.query(typeQuery)

            return {
                conversion_by_play_time,
                cart_abandonment_rate: globalRes.rows[0]?.cart_abandonment_rate || 0,
                most_purchased_pack,
                purchases_by_game: gameRes.rows,
                purchases_by_type: typeRes.rows
            }
        } catch (error) {
            console.error('Error fetching monetization metrics:', error)
            throw error
        }
    }
}
