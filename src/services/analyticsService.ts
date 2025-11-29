import { supabase } from '../lib/supabase'

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

export class AnalyticsService {
    static async getKPIs(days: number = 7): Promise<KPIData | null> {
        try {
            const { data, error } = await supabase.rpc('get_kpis', { days_back: days })
            if (error) throw error
            return data?.[0] || {
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
            const { data, error } = await supabase.rpc('get_games_analytics', { days_back: days })
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching games analytics:', error)
            throw error
        }
    }

    static async getUsersAnalytics(limit: number = 100): Promise<UserAnalytics[]> {
        try {
            const { data, error } = await supabase.rpc('get_users_analytics', { limit_count: limit })
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching users analytics:', error)
            throw error
        }
    }

    static async getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
        try {
            const { data, error } = await supabase.rpc('get_daily_metrics', { days_back: days })
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching daily metrics:', error)
            throw error
        }
    }
}
