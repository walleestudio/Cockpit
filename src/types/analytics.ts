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

export interface DailyMetrics {
    date: string
    unique_players: number
    total_play_time_hours: number
    total_sessions: number
    avg_session_duration_minutes: number
    total_purchase_attempts: number
    total_purchase_successes: number
}

export interface KPIData {
    unique_players: number
    total_play_time_hours: number
    total_sessions: number
    conversion_rate_percent: number
}
