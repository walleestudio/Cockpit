/**
 * Calculs des métriques croisées pour la page Préconisations.
 * Fichier .ts pour éviter les ambiguïtés de parsing Babel/TSX (return {, => {, etc.).
 */
import type {
    GameAnalytics,
    ConversionByGame,
    DailyMetrics,
    FirstGameLifetime,
    SocialMetrics,
    MonetizationMetrics,
} from '../services/analyticsService'
import type { GameEfficiency, ChurnCost } from '../services/costMetricsService'

export interface EnrichedGame extends GameAnalytics {
    bypass_rate: number
    retention_score: number
}

export type Ranked<T> = T & { rank: number }

export interface WeeklyValue {
    total_play_time_hours: number
    total_sessions: number
    player_days: number
    purchases: number
}
export type WeeklyAgg = Record<string, WeeklyValue>

export interface HealthRow extends EnrichedGame {
    health_score: number
}

export interface RoiRow {
    game_id: string
    conversion_rate_percent: number
    db_requests_per_player: number
    roi: number
}

export interface ViraliteRow {
    game_id: string
    share_rate: number
    db_requests_per_player: number
    viralite_cout: number
}

export interface SocialCoutRow {
    game_id: string
    social_engagement_rate: number
    db_requests_per_player: number
    social_cout: number
}

export interface ChurnCostWithRetention extends ChurnCost {
    retention_score: number
}

function withRank<T extends object>(arr: T[]): Ranked<T>[] {
    return arr.map((item, i) => ({ ...item, rank: i + 1 }))
}

const EMPTY_WEEK: WeeklyValue = { total_play_time_hours: 0, total_sessions: 0, player_days: 0, purchases: 0 }

export interface CrossMetricsInput {
    enriched: EnrichedGame[]
    games: GameAnalytics[]
    firstGameLifetime: FirstGameLifetime[]
    conversionByGame: ConversionByGame[]
    gameEfficiency: GameEfficiency[]
    churnCost: ChurnCost[]
    dailyMetrics: DailyMetrics[]
    monetization: MonetizationMetrics | null
    socialMetrics: SocialMetrics[]
}

export interface CrossMetricsResult {
    conversionByGameMap: Map<string, ConversionByGame>
    gameEfficiencyMap: Map<string, GameEfficiency>
    purchasesByGameMap: Map<string, number>
    roiByGame: Ranked<RoiRow>[]
    healthScoreGames: Ranked<HealthRow>[]
    firstGameMedianLifetime: number
    gamesMedianPlayers: number
    gamesByGameId: Map<string, GameAnalytics>
    tremplinUnderExposed: FirstGameLifetime[]
    churnCostWithRetention: ChurnCostWithRetention[]
    medianRetChurn: number
    piegeCout: ChurnCostWithRetention[]
    viraliteCout: Ranked<ViraliteRow>[]
    appAvgConversion: number
    potentielConversion: (EnrichedGame & { conversion_rate_percent: number; app_avg: number })[]
    socialCout: Ranked<SocialCoutRow>[]
    weeklyByWeek: WeeklyAgg
    weeklyTrend: (WeeklyValue & { week: string })[]
}

function weekKey(d: string): string {
    const dt = new Date(d)
    const start = new Date(dt)
    start.setDate(dt.getDate() - dt.getDay() + 1)
    return start.toISOString().slice(0, 10)
}

export function computeCrossMetrics(input: CrossMetricsInput): CrossMetricsResult {
    const {
        enriched,
        games,
        firstGameLifetime,
        conversionByGame,
        gameEfficiency,
        churnCost,
        dailyMetrics,
        monetization,
        socialMetrics,
    } = input

    const conversionByGameMap = new Map(conversionByGame.map(c => [c.game_id, c]))
    const gameEfficiencyMap = new Map(gameEfficiency.map(e => [e.game_id, e]))
    const purchasesByGameMap = new Map((monetization?.purchases_by_game ?? []).map(p => [p.game_id, p.purchase_count]))

    const roiByGame = withRank(
        gameEfficiency.map(e => {
            const c = conversionByGameMap.get(e.game_id)
            const conv = c?.conversion_rate_percent ?? 0
            const db = (e.db_requests_per_player ?? 0) + 1
            const roi = conv / db
            const row: RoiRow = { game_id: e.game_id, conversion_rate_percent: conv, db_requests_per_player: e.db_requests_per_player ?? 0, roi }
            return row
        }).sort((a, b) => b.roi - a.roi)
    )

    const maxRet = Math.max(...enriched.map(g => g.retention_score), 1)
    const maxShare = Math.max(...enriched.map(g => g.share_rate ?? 0), 1)
    const maxConv = Math.max(...Array.from(conversionByGameMap.values()).map(c => c.conversion_rate_percent), 1)
    const healthScoreGames = withRank(
        enriched.map(g => {
            const conv = conversionByGameMap.get(g.game_id)?.conversion_rate_percent ?? 0
            const retentionNorm = (g.retention_score / maxRet) * 100
            const shareNorm = ((g.share_rate ?? 0) / maxShare) * 100
            const convNorm = (conv / maxConv) * 100
            const exitNorm = Math.min(g.exit_rate_percent * 10, 100)
            const bypassNorm = Math.min(g.bypass_rate, 100)
            const health_score = Math.round(Math.max(0, Math.min(100, retentionNorm * 0.3 + shareNorm * 0.2 + convNorm * 0.3 - exitNorm * 0.1 - bypassNorm * 0.1)))
            const row: HealthRow = { ...g, health_score }
            return row
        }).sort((a, b) => b.health_score - a.health_score)
    )

    const sortedPlayers = [...enriched].sort((a, b) => a.unique_players - b.unique_players)
    const medianPlayers = sortedPlayers[Math.floor(sortedPlayers.length / 2)]?.unique_players ?? 0
    const firstGameMedianLifetime = firstGameLifetime.length
        ? firstGameLifetime.map(f => f.avg_lifetime_days).sort((a, b) => a - b)[Math.floor(firstGameLifetime.length / 2)] ?? 0
        : 0
    const gamesMedianPlayers = sortedPlayers[Math.floor(sortedPlayers.length / 2)]?.unique_players ?? 0
    const gamesByGameId = new Map(games.map(g => [g.game_id, g]))
    const tremplinUnderExposed = firstGameLifetime
        .filter(f => f.avg_lifetime_days >= firstGameMedianLifetime && (gamesByGameId.get(f.game_id)?.unique_players ?? 0) < gamesMedianPlayers)
        .sort((a, b) => b.avg_lifetime_days - a.avg_lifetime_days)

    const churnCostWithRetention: ChurnCostWithRetention[] = churnCost.map(c => {
        const g = enriched.find(e => e.game_id === c.game_id)
        const row: ChurnCostWithRetention = { ...c, retention_score: g?.retention_score ?? 0 }
        return row
    })
    const medianRetChurn = churnCostWithRetention.length
        ? [...churnCostWithRetention].sort((a, b) => a.retention_score - b.retention_score)[Math.floor(churnCostWithRetention.length / 2)]?.retention_score ?? 0
        : 0
    const piegeCout = churnCostWithRetention.filter(c => c.retention_score < medianRetChurn).sort((a, b) => b.churn_cost_index - a.churn_cost_index)

    const viraliteOut: ViraliteRow[] = []
    gameEfficiency.forEach(e => {
        const g = enriched.find(x => x.game_id === e.game_id)
        const share = g?.share_rate ?? 0
        const db = (e.db_requests_per_player ?? 0) + 1
        viraliteOut.push({ game_id: e.game_id, share_rate: share, db_requests_per_player: e.db_requests_per_player ?? 0, viralite_cout: share / db })
    })
    const viraliteCout = withRank(viraliteOut.sort((a, b) => b.viralite_cout - a.viralite_cout))

    const appAvgConversion =
        conversionByGame.reduce((s, c) => s + c.purchasers, 0) /
        Math.max(conversionByGame.reduce((s, c) => s + c.unique_players, 0), 1) *
        100
    const potentielConversion = enriched
        .filter(g => {
            const c = conversionByGameMap.get(g.game_id)
            const conv = c?.conversion_rate_percent ?? 0
            return conv < appAvgConversion && (g.total_play_time_hours >= 0.1 || g.unique_players >= medianPlayers)
        })
        .map(g => ({
            ...g,
            conversion_rate_percent: conversionByGameMap.get(g.game_id)?.conversion_rate_percent ?? 0,
            app_avg: appAvgConversion,
        }))
        .sort((a, b) => (b.app_avg - b.conversion_rate_percent) - (a.app_avg - a.conversion_rate_percent))

    const socialOut: SocialCoutRow[] = []
    gameEfficiency.forEach(e => {
        const s = socialMetrics.find(x => x.game_id === e.game_id)
        const rate = s?.social_engagement_rate ?? 0
        const db = (e.db_requests_per_player ?? 0) + 1
        socialOut.push({ game_id: e.game_id, social_engagement_rate: rate, db_requests_per_player: e.db_requests_per_player ?? 0, social_cout: rate / db })
    })
    const socialCout = withRank(socialOut.sort((a, b) => b.social_cout - a.social_cout))

    const weeklyByWeek = dailyMetrics.reduce<WeeklyAgg>((acc, row) => {
        const w = weekKey(row.date)
        if (!acc[w]) acc[w] = Object.assign({}, EMPTY_WEEK)
        acc[w].total_play_time_hours += row.total_play_time_hours || 0
        acc[w].total_sessions += row.total_sessions || 0
        acc[w].player_days += row.unique_players || 0
        acc[w].purchases += row.total_purchase_successes || 0
        return acc
    }, Object.create(null) as WeeklyAgg)
    const weeklyTrend = Object.entries(weeklyByWeek)
        .map(([week, v]) => ({ week, ...v }))
        .sort((a, b) => b.week.localeCompare(a.week))
        .slice(0, 8)

    return {
        conversionByGameMap,
        gameEfficiencyMap,
        purchasesByGameMap,
        roiByGame,
        healthScoreGames,
        firstGameMedianLifetime,
        gamesMedianPlayers,
        gamesByGameId,
        tremplinUnderExposed,
        churnCostWithRetention,
        medianRetChurn,
        piegeCout,
        viraliteCout,
        appAvgConversion,
        potentielConversion,
        socialCout,
        weeklyByWeek,
        weeklyTrend,
    }
}
