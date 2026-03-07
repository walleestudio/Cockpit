

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
    /** Partages / joueurs uniques (taux de partage) */
    share_rate?: number
    /** Lancements / joueurs uniques (récurrence) */
    launches_per_player?: number
    /** Consultations leaderboard (metrics.leaderboardViews) */
    total_leaderboard_views?: number
    /** Sauvegardes de score (metrics.scoreSaves) */
    total_score_saves?: number
    /** Total actuel de likes (tous snapshots), pour affichage quand delta 30j = 0 */
    total_likes?: number
    /** Total actuel de favoris/bookmarks (tous snapshots), pour affichage quand delta 30j = 0 */
    total_bookmarks?: number
}

export interface PromotedGame {
    game_id: string
    promoted_score: number
    unique_players: number
    total_launches: number
    total_shares: number
    net_likes: number
    total_bookmarks: number
    total_play_time_hours: number
    exit_rate_percent: number
}

export interface SessionDurationBucket {
    range: string
    count: number
}

export interface ConversionByGame {
    game_id: string
    unique_players: number
    purchasers: number
    conversion_rate_percent: number
}

/** Jeu « premier joué » par user (dominant dans le 1er snapshot) → agrégats rétention. */
export interface FirstGameLifetime {
    game_id: string
    users_count: number
    avg_lifetime_days: number
    avg_play_time_hours: number
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
    total_likes: number
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
    static async getKPIs(days: number = 7, offsetDays: number = 0): Promise<KPIData | null> {
        try {
            const query = `
                WITH params AS (
                    SELECT
                        NOW() - INTERVAL '${days + offsetDays} days' AS start_ts,
                        NOW() - INTERVAL '${offsetDays} days' AS end_ts
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
                    COUNT(*)::int AS unique_players,
                    ROUND((SUM(play_time_delta) / 3600)::numeric, 2)::float AS total_play_time_hours,
                    SUM(session_count_delta)::int AS total_sessions,
                    ROUND(
                        (
                            CASE
                                WHEN SUM(purchase_attempts_delta) > 0
                                THEN (SUM(purchase_successes_delta)::numeric / SUM(purchase_attempts_delta) * 100)
                                ELSE 0
                            END
                        )::numeric, 2
                    )::float AS conversion_rate_percent
                FROM deltas
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
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
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
                        COALESCE((s.metrics->'top10Attempts'->>g.game_id)::int, 0) AS top10_attempts,
                        COALESCE((s.metrics->'leaderboardViews'->>g.game_id)::int, 0) AS leaderboard_views,
                        COALESCE((s.metrics->'scoreSaves'->>g.game_id)::int, 0) AS score_saves
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
                        MAX(v.top10_attempts) AS top10_attempts,
                        MAX(v.leaderboard_views) AS leaderboard_views,
                        MAX(v.score_saves) AS score_saves
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
                        v.top10_attempts,
                        v.leaderboard_views,
                        v.score_saves
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
                        GREATEST(w.top10_attempts - COALESCE(b.top10_attempts, 0), 0) AS top10_attempts,
                        GREATEST(w.leaderboard_views - COALESCE(b.leaderboard_views, 0), 0) AS leaderboard_views,
                        GREATEST(w.score_saves - COALESCE(b.score_saves, 0), 0) AS score_saves
                    FROM in_window w
                    LEFT JOIN before_start b
                      ON b.user_id = w.user_id
                     AND b.game_id = w.game_id
                )
                SELECT
                    game_id,
                    COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END)::int as unique_players,
                    SUM(launches)::int as total_launches,
                    ROUND((SUM(play_time_seconds) / 3600)::numeric, 2)::float as total_play_time_hours,
                    ROUND((SUM(play_time_seconds) / NULLIF(SUM(launches), 0) / 60)::numeric, 2)::float as avg_play_time_minutes,
                    SUM(swipes)::int as total_swipes,
                    SUM(exits)::int as total_exits,
                    ROUND(
                      (CASE
                        WHEN SUM(launches) > 0
                        THEN (SUM(exits)::numeric / SUM(launches) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as exit_rate_percent,
                    SUM(likes)::int as net_likes,
                    SUM(bookmarks)::int as net_bookmarks,
                    SUM(shares)::int as total_shares,
                    SUM(comments)::int as total_comments,
                    SUM(score_attempts)::int as total_score_attempts,
                    SUM(top10_attempts)::int as total_top10_attempts,
                    ROUND(
                      (CASE
                        WHEN SUM(score_attempts) > 0
                        THEN (SUM(top10_attempts)::numeric / SUM(score_attempts) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as top10_attempt_rate_percent,
                    ROUND((SUM(shares)::numeric / NULLIF(COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END), 0))::numeric, 2)::float as share_rate,
                    ROUND((SUM(launches)::numeric / NULLIF(COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END), 0))::numeric, 2)::float as launches_per_player,
                    SUM(leaderboard_views)::int as total_leaderboard_views,
                    SUM(score_saves)::int as total_score_saves
                FROM game_deltas
                GROUP BY game_id
                ORDER BY total_launches DESC
            `
            const { rows } = await pool.query(query)

            // Enrichir avec totaux actuels likes/bookmarks (tous snapshots) pour afficher même quand delta 30j = 0
            const bookmarksQuery = `
                WITH per_snapshot AS (
                    SELECT s.user_id, g.game_id, (s.metrics->'bookmarks'->>g.game_id)::int AS bookmarks
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'bookmarks', '{}'::jsonb)) AS g(game_id)
                    WHERE s.user_id IS NOT NULL
                ),
                max_per_user AS (
                    SELECT user_id, game_id, MAX(bookmarks) AS bookmarks
                    FROM per_snapshot WHERE bookmarks > 0
                    GROUP BY user_id, game_id
                )
                SELECT game_id, SUM(bookmarks)::int AS total_bookmarks FROM max_per_user GROUP BY game_id
            `
            const likesQuery = `
                WITH per_snapshot AS (
                    SELECT s.user_id, g.game_id, (s.metrics->'likes'->>g.game_id)::int AS likes
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'likes', '{}'::jsonb)) AS g(game_id)
                    WHERE s.user_id IS NOT NULL
                ),
                max_per_user AS (
                    SELECT user_id, game_id, MAX(likes) AS likes
                    FROM per_snapshot WHERE likes > 0
                    GROUP BY user_id, game_id
                )
                SELECT game_id, SUM(likes)::int AS total_likes FROM max_per_user GROUP BY game_id
            `
            try {
                const [bookmarksRes, likesRes] = await Promise.all([
                    pool.query(bookmarksQuery),
                    pool.query(likesQuery)
                ])
                const bookmarksByGame = new Map((bookmarksRes.rows as { game_id: string; total_bookmarks: number }[]).map(r => [r.game_id, r.total_bookmarks]))
                const likesByGame = new Map((likesRes.rows as { game_id: string; total_likes: number }[]).map(r => [r.game_id, r.total_likes]))
                for (const row of rows as GameAnalytics[]) {
                    const tb = bookmarksByGame.get(row.game_id)
                    const tl = likesByGame.get(row.game_id)
                    if (tb != null) row.total_bookmarks = tb
                    if (tl != null) row.total_likes = tl
                }
            } catch (e) {
                console.warn('Enrichment likes/bookmarks failed, using deltas only:', e)
            }

            // Retourner des objets simples pour que le front (Neon serverless) reçoive bien net_likes, net_bookmarks, total_likes, total_bookmarks
            return (rows as Record<string, unknown>[]).map(row => ({
                ...row,
                net_likes: Number(row.net_likes ?? 0),
                net_bookmarks: Number(row.net_bookmarks ?? 0),
                total_likes: row.total_likes != null ? Number(row.total_likes) : undefined,
                total_bookmarks: row.total_bookmarks != null ? Number(row.total_bookmarks) : undefined
            })) as GameAnalytics[]
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
                    ls.user_id::text,
                    COALESCE(
                      NULLIF((ls.metrics->>'pseudo')::text, ''),
                      NULLIF(p.username::text, ''),
                      lu.username,
                      ls.user_id::text
                    )::text as pseudo,
                    a.snapshot_count::int as snapshot_count,
                    ROUND((ls.cumulative_play_time_seconds / 3600)::numeric, 2)::float as total_play_time_hours,
                    COALESCE((ls.metrics->>'sessionCount')::int, 0)::int as total_sessions,
                    ROUND(
                      (
                        COALESCE((ls.metrics->>'totalSessionDuration')::float, 0)
                        / NULLIF(COALESCE((ls.metrics->>'sessionCount')::float, 0), 0)
                        / 60
                      )::numeric, 2
                    )::float as avg_session_duration_minutes,
                    COALESCE((ls.metrics->>'purchaseAttempts')::int, 0)::int as total_purchase_attempts,
                    COALESCE((ls.metrics->>'purchaseSuccesses')::int, 0)::int as total_purchase_successes,
                    COALESCE((ls.metrics->>'purchaseCancels')::int, 0)::int as total_purchase_cancels,
                    ROUND(
                      (CASE 
                        WHEN COALESCE((ls.metrics->>'purchaseAttempts')::int, 0) > 0 
                        THEN (COALESCE((ls.metrics->>'purchaseSuccesses')::numeric, 0) / COALESCE((ls.metrics->>'purchaseAttempts')::numeric, 0) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as conversion_rate_percent,
                    a.first_snapshot_date::date as first_snapshot_date,
                    a.last_snapshot_date::date as last_snapshot_date,
                    (a.last_snapshot_date::date - a.first_snapshot_date::date)::int as user_lifetime_days
                FROM (
                    SELECT
                        user_id,
                        COUNT(*) AS snapshot_count,
                        MIN(snapshot_date) AS first_snapshot_date,
                        MAX(snapshot_date) AS last_snapshot_date
                    FROM user_analytics_snapshots
                    WHERE user_id IS NOT NULL
                    GROUP BY user_id
                ) a
                JOIN LATERAL (
                    SELECT s.*
                    FROM user_analytics_snapshots s
                    WHERE s.user_id = a.user_id
                    ORDER BY s.snapshot_date DESC
                    LIMIT 1
                ) ls ON TRUE
                LEFT JOIN profiles p ON p.user_id = ls.user_id
                LEFT JOIN latest_usernames lu ON lu.user_id = ls.user_id::text
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

    /** Utilisateurs dont la dernière activité (last_snapshot_date) est antérieure à X années — pour suppression RGPD. */
    static async getUsersInactiveSinceYears(years: number, limit: number = 500): Promise<UserAnalytics[]> {
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
                ),
                agg AS (
                    SELECT
                        user_id,
                        COUNT(*) AS snapshot_count,
                        MIN(snapshot_date) AS first_snapshot_date,
                        MAX(snapshot_date) AS last_snapshot_date
                    FROM user_analytics_snapshots
                    WHERE user_id IS NOT NULL
                    GROUP BY user_id
                    HAVING MAX(snapshot_date) < NOW() - INTERVAL '${years} years'
                )
                SELECT
                    ls.user_id::text,
                    COALESCE(
                      NULLIF((ls.metrics->>'pseudo')::text, ''),
                      NULLIF(p.username::text, ''),
                      lu.username,
                      ls.user_id::text
                    )::text as pseudo,
                    a.snapshot_count::int as snapshot_count,
                    ROUND((ls.cumulative_play_time_seconds / 3600)::numeric, 2)::float as total_play_time_hours,
                    COALESCE((ls.metrics->>'sessionCount')::int, 0)::int as total_sessions,
                    ROUND(
                      (
                        COALESCE((ls.metrics->>'totalSessionDuration')::float, 0)
                        / NULLIF(COALESCE((ls.metrics->>'sessionCount')::float, 0), 0)
                        / 60
                      )::numeric, 2
                    )::float as avg_session_duration_minutes,
                    COALESCE((ls.metrics->>'purchaseAttempts')::int, 0)::int as total_purchase_attempts,
                    COALESCE((ls.metrics->>'purchaseSuccesses')::int, 0)::int as total_purchase_successes,
                    COALESCE((ls.metrics->>'purchaseCancels')::int, 0)::int as total_purchase_cancels,
                    ROUND(
                      (CASE 
                        WHEN COALESCE((ls.metrics->>'purchaseAttempts')::int, 0) > 0 
                        THEN (COALESCE((ls.metrics->>'purchaseSuccesses')::numeric, 0) / COALESCE((ls.metrics->>'purchaseAttempts')::numeric, 0) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as conversion_rate_percent,
                    a.first_snapshot_date::date as first_snapshot_date,
                    a.last_snapshot_date::date as last_snapshot_date,
                    (a.last_snapshot_date::date - a.first_snapshot_date::date)::int as user_lifetime_days
                FROM agg a
                JOIN LATERAL (
                    SELECT s.*
                    FROM user_analytics_snapshots s
                    WHERE s.user_id = a.user_id
                    ORDER BY s.snapshot_date DESC
                    LIMIT 1
                ) ls ON TRUE
                LEFT JOIN profiles p ON p.user_id = ls.user_id
                LEFT JOIN latest_usernames lu ON lu.user_id = ls.user_id::text
                ORDER BY a.last_snapshot_date ASC
                LIMIT ${limit}
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching users inactive since years:', error)
            throw error
        }
    }

    static async getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
        try {
            const query = `
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
                    date::text as date,
                    COUNT(DISTINCT user_id)::int as unique_players,
                    ROUND((SUM(play_time_delta) / 3600)::numeric, 2)::float as total_play_time_hours,
                    SUM(session_count_delta)::int as total_sessions,
                    ROUND((SUM(total_session_duration_delta) / NULLIF(SUM(session_count_delta), 0) / 60)::numeric, 2)::float as avg_session_duration_minutes,
                    SUM(purchase_attempts_delta)::int as total_purchase_attempts,
                    SUM(purchase_successes_delta)::int as total_purchase_successes
                FROM daily_deltas
                WHERE date >= (NOW() - INTERVAL '${days} days')::date
                GROUP BY date
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
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                snapshot_game_values AS (
                    SELECT
                        s.user_id,
                        s.snapshot_date,
                        g.game_id,
                        COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0) AS launches,
                        COALESCE((s.metrics->'gameExits'->>g.game_id)::int, 0) AS exits,
                        COALESCE((s.metrics->'gamePlayTime'->>g.game_id)::float, 0) AS play_time_seconds,
                        COALESCE((s.metrics->'gameSwipes'->>g.game_id)::int, 0) AS swipes,
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
                        MAX(v.exits) AS exits,
                        MAX(v.play_time_seconds) AS play_time_seconds,
                        MAX(v.swipes) AS swipes,
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
                        v.exits,
                        v.play_time_seconds,
                        v.swipes,
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
                        GREATEST(w.exits - COALESCE(b.exits, 0), 0) AS exits,
                        GREATEST(w.play_time_seconds - COALESCE(b.play_time_seconds, 0), 0) AS play_time_seconds,
                        GREATEST(w.swipes - COALESCE(b.swipes, 0), 0) AS swipes,
                        GREATEST(w.score_attempts - COALESCE(b.score_attempts, 0), 0) AS score_attempts,
                        GREATEST(w.top10_attempts - COALESCE(b.top10_attempts, 0), 0) AS top10_attempts
                    FROM in_window w
                    LEFT JOIN before_start b
                      ON b.user_id = w.user_id
                     AND b.game_id = w.game_id
                )
                SELECT
                    game_id,
                    ROUND(
                      (CASE
                        WHEN SUM(score_attempts) > 0
                        THEN (SUM(top10_attempts)::numeric / SUM(score_attempts) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as completion_rate_percent,
                    ROUND(
                      (CASE
                        WHEN SUM(launches) > 0
                        THEN (SUM(exits)::numeric / SUM(launches) * 100)
                        ELSE 0
                      END)::numeric, 2
                    )::float as frustration_index_percent,
                    ROUND(
                      (CASE
                        WHEN SUM(play_time_seconds) > 0
                        THEN (SUM(swipes)::numeric / (SUM(play_time_seconds) / 3600))
                        ELSE 0
                      END)::numeric, 2
                    )::float as intensity_swipes_per_hour
                FROM game_deltas
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
            const startTs = `NOW() - INTERVAL '${days} days'`
            // Requête dédiée bookmarks : total actuel par jeu (tous les snapshots pour avoir des données même anciennes)
            const bookmarksQuery = `
                WITH per_snapshot AS (
                    SELECT
                        s.user_id,
                        g.game_id,
                        (s.metrics->'bookmarks'->>g.game_id)::int AS bookmarks
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'bookmarks', '{}'::jsonb)) AS g(game_id)
                    WHERE s.user_id IS NOT NULL
                ),
                max_per_user AS (
                    SELECT user_id, game_id, MAX(bookmarks) AS bookmarks
                    FROM per_snapshot
                    WHERE bookmarks > 0
                    GROUP BY user_id, game_id
                )
                SELECT game_id, SUM(bookmarks)::int AS total_bookmarks
                FROM max_per_user
                GROUP BY game_id
            `
            const { rows: bookmarksRows } = await pool.query(bookmarksQuery)

            // Requête dédiée likes : total actuel par jeu (tous les snapshots pour avoir des données même anciennes)
            const likesQuery = `
                WITH per_snapshot AS (
                    SELECT
                        s.user_id,
                        g.game_id,
                        (s.metrics->'likes'->>g.game_id)::int AS likes
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'likes', '{}'::jsonb)) AS g(game_id)
                    WHERE s.user_id IS NOT NULL
                ),
                max_per_user AS (
                    SELECT user_id, game_id, MAX(likes) AS likes
                    FROM per_snapshot
                    WHERE likes > 0
                    GROUP BY user_id, game_id
                )
                SELECT game_id, SUM(likes)::int AS total_likes
                FROM max_per_user
                GROUP BY game_id
            `
            const { rows: likesRows } = await pool.query(likesQuery)

            // Requête engagement / comments (basée sur gameLaunches)
            const mainQuery = `
                WITH params AS (SELECT (${startTs})::timestamptz AS start_ts),
                snapshot_game_values AS (
                    SELECT
                        s.user_id,
                        s.snapshot_date,
                        g.game_id,
                        COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0) AS launches,
                        COALESCE((s.metrics->'likes'->>g.game_id)::int, 0) AS likes,
                        COALESCE((s.metrics->'comments'->>g.game_id)::int, 0) AS comments,
                        COALESCE((s.metrics->'shares'->>g.game_id)::int, 0) AS shares
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gameLaunches', '{}'::jsonb)) AS g(game_id)
                    WHERE s.user_id IS NOT NULL
                ),
                in_window AS (
                    SELECT v.user_id, v.game_id,
                        MAX(v.launches) AS launches,
                        MAX(v.likes) AS likes,
                        MAX(v.comments) AS comments,
                        MAX(v.shares) AS shares
                    FROM snapshot_game_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date >= p.start_ts
                    GROUP BY v.user_id, v.game_id
                ),
                before_start AS (
                    SELECT DISTINCT ON (v.user_id, v.game_id)
                        v.user_id, v.game_id, v.launches, v.likes, v.comments, v.shares
                    FROM snapshot_game_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date < p.start_ts
                    ORDER BY v.user_id, v.game_id, v.snapshot_date DESC
                ),
                game_deltas AS (
                    SELECT w.user_id, w.game_id,
                        GREATEST(w.launches - COALESCE(b.launches, 0), 0) AS launches,
                        GREATEST(w.likes - COALESCE(b.likes, 0), 0) AS likes,
                        GREATEST(w.comments - COALESCE(b.comments, 0), 0) AS comments,
                        GREATEST(w.shares - COALESCE(b.shares, 0), 0) AS shares
                    FROM in_window w
                    LEFT JOIN before_start b ON b.user_id = w.user_id AND b.game_id = w.game_id
                )
                SELECT
                    game_id,
                    ROUND((CASE WHEN COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END) > 0
                        THEN ((SUM(likes) + SUM(comments) + SUM(shares))::numeric / COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END))
                        ELSE 0 END)::numeric, 4)::float AS social_engagement_rate,
                    ROUND((CASE WHEN COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END) > 0
                        THEN (SUM(comments)::numeric / COUNT(DISTINCT CASE WHEN launches > 0 THEN user_id END))
                        ELSE 0 END)::numeric, 4)::float AS comments_to_players_ratio
                FROM game_deltas
                GROUP BY game_id
            `
            const { rows: mainRows } = await pool.query(mainQuery)

            const bookmarksByGame = new Map<string, number>()
            for (const r of bookmarksRows as { game_id: string; total_bookmarks: number }[]) {
                bookmarksByGame.set(r.game_id, r.total_bookmarks)
            }
            const likesByGame = new Map<string, number>()
            for (const r of likesRows as { game_id: string; total_likes: number }[]) {
                likesByGame.set(r.game_id, r.total_likes)
            }
            const mainByGame = new Map<string, { social_engagement_rate: number; comments_to_players_ratio: number }>()
            for (const r of mainRows as { game_id: string; social_engagement_rate: number; comments_to_players_ratio: number }[]) {
                mainByGame.set(r.game_id, { social_engagement_rate: r.social_engagement_rate, comments_to_players_ratio: r.comments_to_players_ratio })
            }
            const allGameIds = new Set([...bookmarksByGame.keys(), ...likesByGame.keys(), ...mainByGame.keys()])
            let result: SocialMetrics[] = Array.from(allGameIds).map(game_id => ({
                game_id,
                social_engagement_rate: mainByGame.get(game_id)?.social_engagement_rate ?? 0,
                total_bookmarks: bookmarksByGame.get(game_id) ?? 0,
                total_likes: likesByGame.get(game_id) ?? 0,
                comments_to_players_ratio: mainByGame.get(game_id)?.comments_to_players_ratio ?? 0
            }))

            // Fallback : si aucun bookmark/like depuis les requêtes dédiées, utiliser getGamesAnalytics (deltas 30j)
            const hasAnyBookmarks = result.some(r => (r.total_bookmarks || 0) > 0)
            const hasAnyLikes = result.some(r => (r.total_likes || 0) > 0)
            if (!hasAnyBookmarks || !hasAnyLikes) {
                const games = await this.getGamesAnalytics(days)
                const byGame = new Map(result.map(r => [r.game_id, r]))
                for (const g of games) {
                    let row = byGame.get(g.game_id)
                    if (!row) {
                        row = {
                            game_id: g.game_id,
                            social_engagement_rate: 0,
                            total_bookmarks: 0,
                            total_likes: 0,
                            comments_to_players_ratio: 0
                        }
                        result.push(row)
                        byGame.set(g.game_id, row)
                    }
                    if (!hasAnyBookmarks && ((g.total_bookmarks ?? g.net_bookmarks) || 0) > 0) row.total_bookmarks = g.total_bookmarks ?? g.net_bookmarks ?? 0
                    if (!hasAnyLikes && ((g.total_likes ?? g.net_likes) || 0) > 0) row.total_likes = g.total_likes ?? g.net_likes ?? 0
                }
            }

            result.sort((a, b) => b.total_bookmarks - a.total_bookmarks || b.total_likes - a.total_likes || b.social_engagement_rate - a.social_engagement_rate)
            return result
        } catch (error) {
            console.error('Error fetching social metrics:', error)
            throw error
        }
    }

    static async getMonetizationMetrics(days: number = 30): Promise<MonetizationMetrics> {
        try {
            // 1. Conversion by Play Time Range
            const conversionQuery = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                in_window AS (
                    SELECT
                        s.user_id,
                        MAX(s.cumulative_play_time_seconds) AS play_time,
                        MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date >= p.start_ts
                    GROUP BY s.user_id
                ),
                before_start AS (
                    SELECT DISTINCT ON (s.user_id)
                        s.user_id,
                        s.cumulative_play_time_seconds AS play_time,
                        COALESCE((s.metrics->>'purchaseSuccesses')::int, 0) AS purchase_successes
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date < p.start_ts
                    ORDER BY s.user_id, s.snapshot_date DESC
                ),
                ranges AS (
                    SELECT
                        w.user_id,
                        GREATEST(w.play_time - COALESCE(b.play_time, 0), 0) AS period_play_time,
                        GREATEST(w.purchase_successes - COALESCE(b.purchase_successes, 0), 0) AS period_purchases
                    FROM in_window w
                    LEFT JOIN before_start b ON b.user_id = w.user_id
                )
                SELECT 
                    CASE 
                        WHEN period_play_time < 3600 THEN '0-1h'
                        WHEN period_play_time < 10800 THEN '1-3h'
                        WHEN period_play_time < 18000 THEN '3-5h'
                        ELSE '5h+'
                    END as hours_range,
                    COUNT(*) as total_users,
                    SUM(CASE WHEN period_purchases > 0 THEN 1 ELSE 0 END) as purchasers
                FROM ranges
                GROUP BY 1
                ORDER BY MIN(period_play_time)
            `
            const conversionRes = await pool.query(conversionQuery)
            const conversion_by_play_time = conversionRes.rows.map(row => ({
                hours_range: row.hours_range,
                conversion_rate: row.total_users > 0 ? (row.purchasers / row.total_users) * 100 : 0
            }))

            // 2. Cart Abandonment & Most Purchased Pack
            const globalQuery = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                in_window AS (
                    SELECT
                        s.user_id,
                        MAX(COALESCE((s.metrics->>'purchaseAttempts')::int, 0)) AS purchase_attempts,
                        MAX(COALESCE((s.metrics->>'purchaseCancels')::int, 0)) AS purchase_cancels
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date >= p.start_ts
                    GROUP BY s.user_id
                ),
                before_start AS (
                    SELECT DISTINCT ON (s.user_id)
                        s.user_id,
                        COALESCE((s.metrics->>'purchaseAttempts')::int, 0) AS purchase_attempts,
                        COALESCE((s.metrics->>'purchaseCancels')::int, 0) AS purchase_cancels
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date < p.start_ts
                    ORDER BY s.user_id, s.snapshot_date DESC
                ),
                deltas AS (
                    SELECT
                        GREATEST(w.purchase_attempts - COALESCE(b.purchase_attempts, 0), 0) AS purchase_attempts_delta,
                        GREATEST(w.purchase_cancels - COALESCE(b.purchase_cancels, 0), 0) AS purchase_cancels_delta
                    FROM in_window w
                    LEFT JOIN before_start b ON b.user_id = w.user_id
                )
                SELECT
                    ROUND(
                      (
                        CASE
                          WHEN SUM(purchase_attempts_delta) > 0
                          THEN (SUM(purchase_cancels_delta)::numeric / SUM(purchase_attempts_delta) * 100)
                          ELSE 0
                        END
                      )::numeric, 2
                    )::float as cart_abandonment_rate
                FROM deltas
            `
            const globalRes = await pool.query(globalQuery)

            // Get most purchased pack
            const packQuery = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                purchase_values AS (
                    SELECT
                        s.user_id,
                        s.snapshot_date,
                        p.key AS product_id,
                        COALESCE(p.value::int, 0) AS purchase_count
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_each_text(COALESCE(s.metrics->'purchaseTypes', '{}'::jsonb)) p
                    WHERE s.user_id IS NOT NULL
                ),
                in_window AS (
                    SELECT
                        v.user_id,
                        v.product_id,
                        MAX(v.purchase_count) AS purchase_count
                    FROM purchase_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date >= p.start_ts
                    GROUP BY v.user_id, v.product_id
                ),
                before_start AS (
                    SELECT DISTINCT ON (v.user_id, v.product_id)
                        v.user_id,
                        v.product_id,
                        v.purchase_count
                    FROM purchase_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date < p.start_ts
                    ORDER BY v.user_id, v.product_id, v.snapshot_date DESC
                ),
                purchase_deltas AS (
                    SELECT
                        w.product_id,
                        GREATEST(w.purchase_count - COALESCE(b.purchase_count, 0), 0) AS purchase_delta
                    FROM in_window w
                    LEFT JOIN before_start b
                      ON b.user_id = w.user_id
                     AND b.product_id = w.product_id
                )
                SELECT 
                    product_id,
                    SUM(purchase_delta)::int as count
                FROM purchase_deltas
                GROUP BY product_id
                ORDER BY count DESC
                LIMIT 1
            `
            const packRes = await pool.query(packQuery)
            const most_purchased_pack = packRes.rows[0]?.count > 0
                ? packRes.rows[0].product_id
                : 'Non renseigné'

            // 3. Purchases by Game (Approximation: top game from latest purchasing snapshot per user)
            const betterGameQuery = `
                WITH purchaser_latest_snapshot AS (
                    SELECT DISTINCT ON (user_id)
                        user_id,
                        metrics
                    FROM user_analytics_snapshots
                    WHERE snapshot_date >= NOW() - INTERVAL '${days} days'
                      AND COALESCE((metrics->>'purchaseSuccesses')::int, 0) > 0
                    ORDER BY user_id, snapshot_date DESC
                ),
                user_max_game AS (
                    SELECT 
                        pls.user_id,
                        (
                            SELECT key 
                            FROM jsonb_each_text(pls.metrics->'gamePlayTime') 
                            ORDER BY value::float DESC 
                            LIMIT 1
                        ) as top_game
                    FROM purchaser_latest_snapshot pls
                )
                SELECT 
                    top_game as game_id,
                    COUNT(*)::int as purchase_count
                FROM user_max_game
                WHERE top_game IS NOT NULL
                GROUP BY top_game
                ORDER BY purchase_count DESC
            `
            const gameRes = await pool.query(betterGameQuery)

            // 4. Purchases by Type
            const typeQuery = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                purchase_values AS (
                    SELECT
                        s.user_id,
                        s.snapshot_date,
                        p.key AS product_id,
                        COALESCE(p.value::int, 0) AS purchase_count
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_each_text(COALESCE(s.metrics->'purchaseTypes', '{}'::jsonb)) p
                    WHERE s.user_id IS NOT NULL
                ),
                in_window AS (
                    SELECT
                        v.user_id,
                        v.product_id,
                        MAX(v.purchase_count) AS purchase_count
                    FROM purchase_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date >= p.start_ts
                    GROUP BY v.user_id, v.product_id
                ),
                before_start AS (
                    SELECT DISTINCT ON (v.user_id, v.product_id)
                        v.user_id,
                        v.product_id,
                        v.purchase_count
                    FROM purchase_values v
                    JOIN params p ON TRUE
                    WHERE v.snapshot_date < p.start_ts
                    ORDER BY v.user_id, v.product_id, v.snapshot_date DESC
                ),
                purchase_deltas AS (
                    SELECT
                        w.product_id,
                        GREATEST(w.purchase_count - COALESCE(b.purchase_count, 0), 0) AS purchase_delta
                    FROM in_window w
                    LEFT JOIN before_start b
                      ON b.user_id = w.user_id
                     AND b.product_id = w.product_id
                )
                SELECT 
                    product_id,
                    SUM(purchase_delta)::int as count
                FROM purchase_deltas
                GROUP BY product_id
                ORDER BY count DESC
            `
            const typeRes = await pool.query(typeQuery)
            const purchases_by_type = typeRes.rows.filter((row: { count: number }) => Number(row.count) > 0)

            return {
                conversion_by_play_time,
                cart_abandonment_rate: globalRes.rows[0]?.cart_abandonment_rate || 0,
                most_purchased_pack,
                purchases_by_game: gameRes.rows,
                purchases_by_type
            }
        } catch (error) {
            console.error('Error fetching monetization metrics:', error)
            throw error
        }
    }

    /** Jeux à mettre en avant : score composite (partages×2 + likes + bookmarks) / joueurs, pondéré par temps de jeu et faible exit. */
    static async getPromotedGames(days: number = 30, limit: number = 10): Promise<PromotedGame[]> {
        try {
            const games = await this.getGamesAnalytics(days)
            const scored: PromotedGame[] = games.map(g => {
                const up = g.unique_players || 1
                const likes = Number(g.total_likes ?? g.net_likes) || 0
                const bookmarks = Number(g.total_bookmarks ?? g.net_bookmarks) || 0
                const social = (Number(g.total_shares) || 0) * 2 + likes + bookmarks
                const baseScore = up > 0 ? social / up : 0
                const retentionBonus = Math.max(0, 100 - (g.exit_rate_percent || 0)) / 100
                const timeBonus = Math.min(1, (g.total_play_time_hours || 0) / 10)
                const promoted_score = Math.round((baseScore * (0.6 + 0.2 * retentionBonus + 0.2 * timeBonus)) * 100) / 100
                return {
                    game_id: g.game_id,
                    promoted_score,
                    unique_players: g.unique_players,
                    total_launches: g.total_launches,
                    total_shares: g.total_shares || 0,
                    net_likes: likes,
                    total_bookmarks: bookmarks,
                    total_play_time_hours: g.total_play_time_hours || 0,
                    exit_rate_percent: g.exit_rate_percent || 0
                }
            })
            scored.sort((a, b) => b.promoted_score - a.promoted_score)
            return scored.slice(0, limit)
        } catch (error) {
            console.error('Error fetching promoted games:', error)
            throw error
        }
    }

    /** Distribution des durées de session par tranche (0-5 min, 5-15, 15-30, 30+ min). */
    static async getSessionDurationDistribution(days: number = 30): Promise<SessionDurationBucket[]> {
        try {
            const query = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                latest_per_user AS (
                    SELECT DISTINCT ON (s.user_id)
                        s.user_id,
                        s.metrics
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date >= p.start_ts
                    ORDER BY s.user_id, s.snapshot_date DESC
                ),
                user_avg_session_min AS (
                    SELECT
                        user_id,
                        ROUND(
                            (COALESCE((metrics->>'totalSessionDuration')::float, 0) / NULLIF(COALESCE((metrics->>'sessionCount')::int, 0), 0) / 60)::numeric,
                            2
                        )::float AS avg_session_min
                    FROM latest_per_user
                    WHERE COALESCE((metrics->>'sessionCount')::int, 0) > 0
                )
                SELECT * FROM (
                    SELECT '0-5 min' AS range, COUNT(*)::int AS count FROM user_avg_session_min WHERE avg_session_min < 5
                    UNION ALL
                    SELECT '5-15 min', COUNT(*)::int FROM user_avg_session_min WHERE avg_session_min >= 5 AND avg_session_min < 15
                    UNION ALL
                    SELECT '15-30 min', COUNT(*)::int FROM user_avg_session_min WHERE avg_session_min >= 15 AND avg_session_min < 30
                    UNION ALL
                    SELECT '30+ min', COUNT(*)::int FROM user_avg_session_min WHERE avg_session_min >= 30
                ) t
                ORDER BY CASE range WHEN '0-5 min' THEN 1 WHEN '5-15 min' THEN 2 WHEN '15-30 min' THEN 3 ELSE 4 END
            `
            const { rows } = await pool.query(query)
            return rows as SessionDurationBucket[]
        } catch (error) {
            console.error('Error fetching session duration distribution:', error)
            throw error
        }
    }

    /** Conversion par jeu : pour chaque jeu, nombre de joueurs uniques et combien ont acheté (purchaseSuccesses > 0). */
    static async getConversionByGame(days: number = 30): Promise<ConversionByGame[]> {
        try {
            const query = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                in_window AS (
                    SELECT
                        s.user_id,
                        MAX(COALESCE((s.metrics->>'purchaseSuccesses')::int, 0)) AS purchase_successes
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date >= p.start_ts
                    GROUP BY s.user_id
                ),
                before_start AS (
                    SELECT DISTINCT ON (s.user_id)
                        s.user_id,
                        COALESCE((s.metrics->>'purchaseSuccesses')::int, 0) AS purchase_successes
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date < p.start_ts
                    ORDER BY s.user_id, s.snapshot_date DESC
                ),
                purchasers AS (
                    SELECT w.user_id
                    FROM in_window w
                    LEFT JOIN before_start b ON b.user_id = w.user_id
                    WHERE GREATEST(w.purchase_successes - COALESCE(b.purchase_successes, 0), 0) > 0
                ),
                in_window_launches AS (
                    SELECT s.user_id, g.game_id,
                        MAX(COALESCE((s.metrics->'gameLaunches'->>g.game_id)::int, 0)) AS launches
                    FROM user_analytics_snapshots s
                    CROSS JOIN LATERAL jsonb_object_keys(COALESCE(s.metrics->'gameLaunches', '{}'::jsonb)) AS g(game_id)
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL AND s.snapshot_date >= p.start_ts
                    GROUP BY s.user_id, g.game_id
                ),
                game_players AS (
                    SELECT game_id, COUNT(DISTINCT user_id)::int AS unique_players
                    FROM in_window_launches
                    WHERE launches > 0
                    GROUP BY game_id
                ),
                game_purchasers AS (
                    SELECT game_id,
                        COUNT(DISTINCT user_id)::int AS purchasers
                    FROM in_window_launches v
                    WHERE launches > 0 AND user_id IN (SELECT user_id FROM purchasers)
                    GROUP BY game_id
                )
                SELECT
                    gp.game_id,
                    gp.unique_players,
                    COALESCE(gpu.purchasers, 0)::int AS purchasers,
                    ROUND((COALESCE(gpu.purchasers, 0)::numeric / NULLIF(gp.unique_players, 0) * 100)::numeric, 2)::float AS conversion_rate_percent
                FROM game_players gp
                LEFT JOIN game_purchasers gpu ON gp.game_id = gpu.game_id
                ORDER BY conversion_rate_percent DESC NULLS LAST, gp.unique_players DESC
            `
            const { rows } = await pool.query(query)
            return rows as ConversionByGame[]
        } catch (error) {
            console.error('Error fetching conversion by game:', error)
            throw error
        }
    }

    /** Jeux « tremplin » : pour chaque jeu dominant au 1er snapshot par user, retourne le nombre d’users et les moyennes lifetime / temps de jeu. */
    static async getFirstGameLifetime(days: number = 90): Promise<FirstGameLifetime[]> {
        try {
            const query = `
                WITH params AS (
                    SELECT NOW() - INTERVAL '${days} days' AS start_ts
                ),
                first_snapshot_per_user AS (
                    SELECT DISTINCT ON (s.user_id)
                        s.user_id,
                        s.snapshot_date AS first_date,
                        s.metrics
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date >= p.start_ts
                    ORDER BY s.user_id, s.snapshot_date ASC
                ),
                dominant_game AS (
                    SELECT
                        f.user_id,
                        f.first_date,
                        (
                            SELECT key
                            FROM jsonb_each_text(COALESCE(f.metrics->'gameLaunches', '{}'::jsonb)) g
                            WHERE (g.value::int) > 0
                            ORDER BY (g.value::int) DESC, key ASC
                            LIMIT 1
                        ) AS first_game_id
                    FROM first_snapshot_per_user f
                ),
                last_snapshot_per_user AS (
                    SELECT DISTINCT ON (s.user_id)
                        s.user_id,
                        s.snapshot_date::date AS last_date,
                        s.cumulative_play_time_seconds
                    FROM user_analytics_snapshots s
                    JOIN params p ON TRUE
                    WHERE s.user_id IS NOT NULL
                      AND s.snapshot_date >= p.start_ts
                    ORDER BY s.user_id, s.snapshot_date DESC
                ),
                user_lifetime AS (
                    SELECT
                        d.user_id,
                        d.first_game_id,
                        (l.last_date - d.first_date::date)::int AS lifetime_days,
                        (l.cumulative_play_time_seconds / 3600.0)::float AS play_time_hours
                    FROM dominant_game d
                    JOIN last_snapshot_per_user l ON l.user_id = d.user_id
                    WHERE d.first_game_id IS NOT NULL
                )
                SELECT
                    first_game_id AS game_id,
                    COUNT(*)::int AS users_count,
                    ROUND(AVG(lifetime_days)::numeric, 1)::float AS avg_lifetime_days,
                    ROUND(AVG(play_time_hours)::numeric, 2)::float AS avg_play_time_hours
                FROM user_lifetime
                GROUP BY first_game_id
                ORDER BY users_count DESC, avg_lifetime_days DESC
            `
            const { rows } = await pool.query(query)
            return rows as FirstGameLifetime[]
        } catch (error) {
            console.error('Error fetching first game lifetime:', error)
            throw error
        }
    }
}
