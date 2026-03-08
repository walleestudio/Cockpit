import React, { useEffect, useState, useCallback } from 'react'
import {
    Heart, ShoppingCart, Clock, DoorOpen, SkipForward, Share2,
    Trophy, ShoppingBag, Timer, Lightbulb, AlertTriangle,
    Star, Eye, Target, Zap, Calendar, Gamepad2, Users, DollarSign,
    Activity, MessageCircle, Package, Rocket, TrendingUp, TrendingDown, Gem
} from 'lucide-react'
import { AnalyticsService } from '../services/analyticsService'
import type {
    GameAnalytics, ConversionByGame, SessionDurationBucket,
    GameFlowMetrics, SocialMetrics, MonetizationMetrics,
    DailyMetrics, FirstGameLifetime, UserAnalytics
} from '../services/analyticsService'
import { CostMetricsService } from '../services/costMetricsService'
import type { CostOverview, GameEfficiency, ChurnCost } from '../services/costMetricsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { AnalyticsBarChart } from '../components/ui/charts/BarChart'
import { ExpandableTable } from '../components/ui/ExpandableTable'
import { MetricHelp } from '../components/ui/MetricHelp'
import { RECOMMENDATIONS_HELP } from './recommendationsHelp'
import { computeCrossMetrics } from './recommendationsComputed'

const PERIOD_OPTIONS = [
    { label: '7 jours', days: 7 },
    { label: '14 jours', days: 14 },
    { label: '30 jours', days: 30 },
    { label: '90 jours', days: 90 },
]

interface EnrichedGame extends GameAnalytics {
    bypass_rate: number
    retention_score: number
}

interface PriorityAction {
    icon: React.ElementType
    title: string
    games: string[]
    description: string
    impact: 'fort' | 'moyen' | 'faible'
    color: string
}


function enrichGames(games: GameAnalytics[]): EnrichedGame[] {
    return games.map(g => {
        const bypass_rate = (g.total_swipes + g.total_launches) > 0
            ? Math.round((g.total_swipes / (g.total_swipes + g.total_launches)) * 10000) / 100
            : 0
        const retention_score = (g.avg_play_time_minutes || 0) * (g.launches_per_player || 0)
        return ({ ...g, bypass_rate, retention_score })
    })
}

function buildPriorityActions(
    enriched: EnrichedGame[],
    _conversionByGame: ConversionByGame[],
    monetization: MonetizationMetrics | null
): PriorityAction[] {
    const actions: PriorityAction[] = []

    const toxicGames = enriched.filter(g => g.exit_rate_percent > 3).sort((a, b) => b.exit_rate_percent - a.exit_rate_percent)
    if (toxicGames.length > 0) {
        actions.push({
            icon: DoorOpen,
            title: 'Retirer ou retravailler les jeux toxiques',
            games: toxicGames.slice(0, 3).map(g => g.game_id),
            description: `${toxicGames.length} jeu(x) avec un taux de sortie > 3%. Ces jeux font quitter l'application.`,
            impact: 'fort',
            color: 'text-red-400'
        })
    }

    const bestSocial = enriched.filter(g => (g.net_likes || 0) + (g.net_bookmarks || 0) > 0)
        .sort((a, b) => ((b.net_likes || 0) + (b.net_bookmarks || 0)) - ((a.net_likes || 0) + (a.net_bookmarks || 0)))
    if (bestSocial.length > 0) {
        actions.push({
            icon: Heart,
            title: 'Mettre en avant les jeux les plus aimés',
            games: bestSocial.slice(0, 3).map(g => g.game_id),
            description: 'Jeux avec le plus de likes + bookmarks. Créez des variantes similaires.',
            impact: 'fort',
            color: 'text-pink-400'
        })
    }

    if (monetization && monetization.conversion_by_play_time.length > 0) {
        const bestRange = monetization.conversion_by_play_time.reduce((best, cur) =>
            cur.conversion_rate > best.conversion_rate ? cur : best
        )
        if (bestRange.conversion_rate > 0) {
            actions.push({
                icon: ShoppingCart,
                title: `Proposer l'achat au bon moment`,
                games: [],
                description: `La meilleure conversion se fait dans la tranche ${bestRange.hours_range} (${bestRange.conversion_rate.toFixed(1)}%). Déclenchez les offres à ce moment.`,
                impact: 'fort',
                color: 'text-green-400'
            })
        }
    }

    const viral = enriched.filter(g => (g.share_rate || 0) > 0).sort((a, b) => (b.share_rate || 0) - (a.share_rate || 0))
    if (viral.length > 0) {
        actions.push({
            icon: Share2,
            title: 'Amplifier la viralité',
            games: viral.slice(0, 3).map(g => g.game_id),
            description: `Jeux avec le meilleur taux de partage/joueur. Rendez le bouton partage plus visible.`,
            impact: 'moyen',
            color: 'text-blue-400'
        })
    }

    const bypassed = enriched.filter(g => g.bypass_rate > 60).sort((a, b) => b.bypass_rate - a.bypass_rate)
    if (bypassed.length > 0) {
        actions.push({
            icon: SkipForward,
            title: 'Corriger les jeux bypassés',
            games: bypassed.slice(0, 3).map(g => g.game_id),
            description: `${bypassed.length} jeu(x) swipés > 60% du temps. Changez le visuel ou retirez-les.`,
            impact: 'moyen',
            color: 'text-orange-400'
        })
    }

    return actions.slice(0, 5)
}

const impactBadge = (impact: 'fort' | 'moyen' | 'faible') => {
    const cls = impact === 'fort' ? 'bg-red-500/20 text-red-300' : impact === 'moyen' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{impact.toUpperCase()}</span>
}

function SectionCard({ icon: Icon, title, subtitle, children, sectionId }: {
    icon: React.ElementType
    title: string
    subtitle: string
    children: React.ReactNode
    sectionId?: string
}) {
    const helpContent = sectionId ? RECOMMENDATIONS_HELP[sectionId] : undefined
    return (
        <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Icon size={20} className="text-primary" />
                        {title}
                        {helpContent && <MetricHelp content={helpContent} />}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    )
}

export const Recommendations: React.FC = () => {
    const [days, setDays] = useState(30)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [games, setGames] = useState<GameAnalytics[]>([])
    const [conversionByGame, setConversionByGame] = useState<ConversionByGame[]>([])
    const [sessionBuckets, setSessionBuckets] = useState<SessionDurationBucket[]>([])
    const [flowMetrics, setFlowMetrics] = useState<GameFlowMetrics[]>([])
    const [socialMetrics, setSocialMetrics] = useState<SocialMetrics[]>([])
    const [monetization, setMonetization] = useState<MonetizationMetrics | null>(null)
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
    const [costOverview, setCostOverview] = useState<CostOverview | null>(null)
    const [gameEfficiency, setGameEfficiency] = useState<GameEfficiency[]>([])
    const [churnCost, setChurnCost] = useState<ChurnCost[]>([])
    const [firstGameLifetime, setFirstGameLifetime] = useState<FirstGameLifetime[]>([])
    const [usersAnalytics, setUsersAnalytics] = useState<UserAnalytics[]>([])

    const fetchAll = useCallback(async (period: number) => {
        try {
            setLoading(true)
            setError(null)
            const [
                g, c, s, f, so, m,
                daily, costOv, eff, churn, firstGame,
                users
            ] = await Promise.all([
                AnalyticsService.getGamesAnalytics(period),
                AnalyticsService.getConversionByGame(period),
                AnalyticsService.getSessionDurationDistribution(period),
                AnalyticsService.getGameFlowMetrics(period),
                AnalyticsService.getSocialMetrics(period),
                AnalyticsService.getMonetizationMetrics(period),
                AnalyticsService.getDailyMetrics(period),
                CostMetricsService.getCostOverview(period),
                CostMetricsService.getGameEfficiency(period),
                CostMetricsService.getChurnCost(period),
                AnalyticsService.getFirstGameLifetime(Math.min(period, 90)),
                AnalyticsService.getUsersAnalytics(500)
            ])
            setGames(g)
            setConversionByGame(c)
            setSessionBuckets(s)
            setFlowMetrics(f)
            setSocialMetrics(so)
            setMonetization(m)
            setDailyMetrics(daily)
            setCostOverview(costOv)
            setGameEfficiency(eff)
            setChurnCost(churn)
            setFirstGameLifetime(firstGame)
            setUsersAnalytics(users)
        } catch (err) {
            setError('Erreur lors du chargement des données de préconisations')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll(days) }, [days, fetchAll])

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    const enriched = enrichGames(games)
    const priorityActions = buildPriorityActions(enriched, conversionByGame, monetization)

    type Ranked<T> = T & { rank: number }
    function withRank<T extends object>(arr: T[]): Ranked<T>[] {
        return arr.map((item, i) => ({ ...item, rank: i + 1 }))
    }

    const favoriteGames = withRank([...enriched]
        .sort((a, b) => ((b.net_likes || 0) + (b.net_bookmarks || 0)) - ((a.net_likes || 0) + (a.net_bookmarks || 0))))

    const triggerGames = conversionByGame.filter(g => g.purchasers > 0)

    const retentionGames = withRank([...enriched]
        .sort((a, b) => b.retention_score - a.retention_score))

    const toxicGames = withRank([...enriched]
        .filter(g => g.exit_rate_percent > 0)
        .sort((a, b) => b.exit_rate_percent - a.exit_rate_percent))

    const bypassedGames = withRank([...enriched]
        .sort((a, b) => b.bypass_rate - a.bypass_rate))

    const viralGames = withRank([...enriched]
        .sort((a, b) => (b.share_rate || 0) - (a.share_rate || 0)))

    const competitiveGames = withRank([...enriched]
        .sort((a, b) => (b.total_leaderboard_views || 0) + (b.total_score_saves || 0) - (a.total_leaderboard_views || 0) - (a.total_score_saves || 0)))

    const flowByGame = new Map(flowMetrics.map(f => [f.game_id, f]))
    const socialByGame = new Map(socialMetrics.map(s => [s.game_id, s]))

    const favoriteGamesWithSocial = favoriteGames.map(g => ({
        ...g,
        social_engagement_rate: socialByGame.get(g.game_id)?.social_engagement_rate ?? 0
    }))

    const rankCol = ({ key: 'rank', label: '#', sortable: true }) as const

    // Axe 11 — Flash vs Immersifs (catégorie par temps moyen)
    type GameWithCategory = EnrichedGame & { category: string }
    const flashImmersiveGames = withRank(([...enriched]
        .map((g) => {
            const category = (g.avg_play_time_minutes || 0) < 0.5 ? 'Flash' : (g.avg_play_time_minutes || 0) < 2 ? 'Court' : (g.avg_play_time_minutes || 0) < 5 ? 'Moyen' : 'Immersif'
            const row: GameWithCategory = { ...g, category }
            return row
        })
        .sort((a, b) => (b.avg_play_time_minutes || 0) - (a.avg_play_time_minutes || 0))) as Ranked<GameWithCategory>[])

    // Axe 12 — Segmentation joueurs (répartition agrégée)
    const segmentDefs = [
        { id: 'baleine', label: 'Baleine (achat + temps élevé)', fn: (u: UserAnalytics) => (u.total_purchase_successes || 0) > 0 && (u.total_play_time_hours || 0) >= 1 },
        { id: 'engagé', label: 'Engagé gratuit', fn: (u: UserAnalytics) => (u.total_play_time_hours || 0) >= 1 && (u.total_purchase_successes || 0) === 0 },
        { id: 'casual', label: 'Casual', fn: (u: UserAnalytics) => (u.total_play_time_hours || 0) >= 0.1 && (u.total_play_time_hours || 0) < 1 },
        { id: 'dormant', label: 'Dormant', fn: (u: UserAnalytics) => (u.total_play_time_hours || 0) < 0.1 }
    ]
    const segments = segmentDefs.map(seg => {
        const list = usersAnalytics.filter(seg.fn)
        const n = list.length
        const total = usersAnalytics.length || 1
        const row = {
            segment: seg.label,
            count: n,
            pct: Math.round((n / total) * 1000) / 10,
            avg_play_time_hours: n ? list.reduce((s, u) => s + (u.total_play_time_hours || 0), 0) / n : 0,
            avg_sessions: n ? list.reduce((s, u) => s + (u.total_sessions || 0), 0) / n : 0,
            conversion_pct: n ? (list.filter(u => (u.total_purchase_successes || 0) > 0).length / n * 100) : 0
        }
        return row
    }).filter(s => s.count > 0)

    // Axe 14 — Intensité engagement (flowMetrics)
    const intensityGames = withRank([...flowMetrics].sort((a, b) => b.intensity_swipes_per_hour - a.intensity_swipes_per_hour))

    // Axe 18 — Tendance hebdo (agrégation des dailyMetrics par semaine)
    // Axe 19 — Jeux sous-exploités (rétention haute, peu de joueurs)
    const sortedRetention = [...enriched].sort((a, b) => b.retention_score - a.retention_score)
    const sortedPlayers = [...enriched].sort((a, b) => a.unique_players - b.unique_players)
    const medianRetention = sortedRetention[Math.floor(sortedRetention.length / 2)]?.retention_score ?? 0
    const medianPlayers = sortedPlayers[Math.floor(sortedPlayers.length / 2)]?.unique_players ?? 0
    const underExploitedGames = withRank([...enriched]
        .filter(g => g.retention_score > medianRetention && g.unique_players < medianPlayers)
        .sort((a, b) => b.retention_score - a.retention_score))

    // ——— Métriques croisées (calcul dans .ts pour éviter ambiguïté Babel/TSX)
    const cross = computeCrossMetrics({
        enriched,
        games,
        firstGameLifetime,
        conversionByGame,
        gameEfficiency,
        churnCost,
        dailyMetrics,
        monetization,
        socialMetrics,
    })
    const {
        purchasesByGameMap,
        roiByGame,
        healthScoreGames,
        tremplinUnderExposed,
        piegeCout,
        viraliteCout,
        potentielConversion,
        socialCout,
        weeklyTrend,
    } = cross

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Préconisations Produit</h1>
                    <p className="text-text-muted mt-1">Actions concrètes basées sur vos métriques — {days} derniers jours</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-text-muted" />
                    {PERIOD_OPTIONS.map(opt => (
                        <button
                            key={opt.days}
                            onClick={() => setDays(opt.days)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                days === opt.days
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-text-muted hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* AXE 10 — Synthèse des actions prioritaires */}
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={22} className="text-yellow-400" />
                    <h2 className="text-xl font-bold text-white">Actions prioritaires</h2>
                    {RECOMMENDATIONS_HELP['axe-10-priorites'] && <MetricHelp content={RECOMMENDATIONS_HELP['axe-10-priorites']} />}
                </div>
                {priorityActions.length === 0 ? (
                    <p className="text-text-muted">Pas assez de données pour générer des préconisations.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {priorityActions.map((action, i) => (
                            <div key={i} className="bg-surface/80 border border-border rounded-lg p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <action.icon size={18} className={action.color} />
                                        <span className="text-sm font-semibold text-white">{action.title}</span>
                                    </div>
                                    {impactBadge(action.impact)}
                                </div>
                                <p className="text-xs text-text-muted">{action.description}</p>
                                {action.games.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {action.games.map(g => (
                                            <span key={g} className="text-xs bg-white/10 px-2 py-0.5 rounded text-text-primary">{g}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AXE 1 — Jeux favoris à renforcer (tri : likes + bookmarks DESC) */}
            <SectionCard icon={Heart} title="1. Jeux à renforcer" subtitle="Triés par likes + bookmarks (les plus plébiscités en premier)" sectionId="axe-1">
                <ExpandableTable
                    data={favoriteGamesWithSocial}
                    columns={[
                        rankCol,
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        { key: 'net_likes', label: 'Likes', sortable: true },
                        { key: 'net_bookmarks', label: 'Favoris', sortable: true },
                        { key: 'total_comments', label: 'Commentaires', sortable: true },
                        { key: 'unique_players', label: 'Joueurs', sortable: true },
                        {
                            key: 'social_engagement_rate',
                            label: 'Engagement social',
                            sortable: true,
                            render: (v: unknown) => (v != null && v !== '') ? Number(v).toFixed(2) : '–'
                        }
                    ]}
                />
                <div className="mt-3 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                    <p className="text-sm text-pink-200">
                        <Star size={14} className="inline mr-1" />
                        <strong>Action :</strong> Ces jeux plaisent. Développez des variantes ou des jeux du même genre pour capitaliser sur cette préférence.
                    </p>
                </div>
            </SectionCard>

            {/* AXE 2 — Jeux déclencheurs d'achat */}
            <SectionCard icon={ShoppingCart} title="2. Jeux déclencheurs d'achat" subtitle="Jeux dont les joueurs achètent le plus — conversion triggers" sectionId="axe-2">
                {triggerGames.length > 0 ? (
                    <>
                        <AnalyticsBarChart
                            data={triggerGames.map(g => ({ name: g.game_id, value: g.conversion_rate_percent }))}
                            dataKey="value"
                            xKey="name"
                            color="#22c55e"
                            name="Conversion %"
                            layout="vertical"
                        />
                        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-sm text-green-200">
                                <Target size={14} className="inline mr-1" />
                                <strong>Action :</strong> Placez ces jeux en position prioritaire dans le feed. Utilisez-les comme « jeux d'appel » avant de proposer un achat.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-text-muted text-sm">Aucun achat enregistré sur la période.</p>
                )}
            </SectionCard>

            {/* AXE 3 — Jeux de rétention (tri : score rétention DESC = temps moyen × lancements/joueur) */}
            <SectionCard icon={Clock} title="3. Jeux de rétention" subtitle="Triés par score de rétention (temps moyen × lancements/joueur) — les plus sticky en premier" sectionId="axe-3">
                <ExpandableTable
                    data={retentionGames}
                    columns={[
                        rankCol,
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        {
                            key: 'retention_score', label: 'Score rétention',
                            sortable: true,
                            render: (val) => Number(val).toFixed(1)
                        },
                        {
                            key: 'avg_play_time_minutes', label: 'Temps moyen',
                            sortable: true,
                            render: (val) => `${Number(val).toFixed(1)} min`
                        },
                        {
                            key: 'launches_per_player', label: 'Lanc./joueur',
                            sortable: true,
                            render: (val) => val != null ? Number(val).toFixed(1) : '–'
                        },
                        { key: 'total_play_time_hours', label: 'Temps total (h)', sortable: true },
                        { key: 'unique_players', label: 'Joueurs', sortable: true }
                    ]}
                />
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-200">
                        <Zap size={14} className="inline mr-1" />
                        <strong>Action :</strong> Placez ces jeux tôt dans le feed pour accrocher le joueur. Ce sont vos « jeux stickys » — protégez-les, ne les modifiez pas.
                    </p>
                </div>
            </SectionCard>

            {/* AXE 4 — Jeux toxiques (tri : exit_rate DESC — le pire en premier) */}
            <SectionCard icon={DoorOpen} title="4. Jeux toxiques" subtitle="Triés par taux de sortie décroissant — les plus problématiques en premier" sectionId="axe-4">
                <ExpandableTable
                    data={toxicGames}
                    columns={[
                        rankCol,
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        {
                            key: 'exit_rate_percent', label: 'Taux de sortie',
                            sortable: true,
                            render: (val) => (
                                <span className={Number(val) > 5 ? 'text-red-400 font-semibold' : Number(val) > 2 ? 'text-orange-400' : 'text-success'}>
                                    {Number(val).toFixed(1)}%
                                </span>
                            )
                        },
                        { key: 'total_exits', label: 'Sorties', sortable: true },
                        { key: 'total_launches', label: 'Lancements', sortable: true },
                        {
                            key: 'game_id', label: 'Frustration',
                            render: (_: unknown, item: Record<string, any>) => {
                                const f = flowByGame.get(item.game_id)
                                return f ? `${f.frustration_index_percent.toFixed(1)}%` : '–'
                            }
                        }
                    ]}
                />
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-200">
                        <AlertTriangle size={14} className="inline mr-1" />
                        <strong>Action :</strong> Ces jeux font quitter l'app. Options : les retirer du feed, les placer en fin de rotation, ou les retravailler (difficulté, UX).
                    </p>
                </div>
            </SectionCard>

            {/* AXE 5 — Jeux bypassés (tri : bypass_rate DESC — le plus ignoré en premier) */}
            <SectionCard icon={SkipForward} title="5. Jeux bypassés (swipés sans jouer)" subtitle="Triés par taux de bypass décroissant — les plus ignorés en premier" sectionId="axe-5">
                <ExpandableTable
                    data={bypassedGames}
                    columns={[
                        rankCol,
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        {
                            key: 'bypass_rate', label: 'Taux de bypass',
                            sortable: true,
                            render: (val) => (
                                <span className={Number(val) > 60 ? 'text-red-400 font-semibold' : Number(val) > 40 ? 'text-orange-400' : 'text-text-primary'}>
                                    {Number(val).toFixed(1)}%
                                </span>
                            )
                        },
                        { key: 'total_swipes', label: 'Swipes', sortable: true },
                        { key: 'total_launches', label: 'Lancements', sortable: true },
                        {
                            key: 'avg_play_time_minutes', label: 'Temps moyen',
                            sortable: true,
                            render: (val) => `${Number(val).toFixed(1)} min`
                        }
                    ]}
                />
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-sm text-orange-200">
                        <Eye size={14} className="inline mr-1" />
                        <strong>Action :</strong> Ces jeux ne captent pas l'attention. Changez le visuel/preview, modifiez le titre, ou retirez du feed si le ratio persiste.
                    </p>
                </div>
            </SectionCard>

            {/* AXE 6 — Jeux viraux (tri : share_rate DESC — le plus partagé en premier) */}
            <SectionCard icon={Share2} title="6. Moteurs de viralité" subtitle="Triés par taux de partage/joueur décroissant — les plus viraux en premier" sectionId="axe-6">
                <ExpandableTable
                    data={viralGames}
                    columns={[
                        rankCol,
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        {
                            key: 'share_rate', label: 'Partages/joueur',
                            sortable: true,
                            render: (val) => val != null ? Number(val).toFixed(2) : '–'
                        },
                        { key: 'total_shares', label: 'Partages', sortable: true },
                        {
                            key: 'total_leaderboard_views', label: 'Vues leaderboard',
                            sortable: true,
                            render: (val) => val ?? '–'
                        },
                        { key: 'unique_players', label: 'Joueurs', sortable: true }
                    ]}
                />
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-200">
                        <Share2 size={14} className="inline mr-1" />
                        <strong>Action :</strong> Amplifiez les mécaniques de partage sur ces jeux (boutons plus visibles, rewards). Utilisez-les pour les campagnes d'acquisition.
                    </p>
                </div>
            </SectionCard>

            {/* AXE 7 — Jeux compétitifs (tri : vues leaderboard + sauvegardes DESC) */}
            <SectionCard icon={Trophy} title="7. Jeux compétitifs" subtitle="Triés par engagement compétitif (vues leaderboard + sauvegardes score) — les plus compétitifs en premier" sectionId="axe-7">
                <ExpandableTable
                    data={competitiveGames}
                    columns={[
                        rankCol,
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        {
                            key: 'total_leaderboard_views', label: 'Vues leaderboard',
                            sortable: true,
                            render: (val) => val ?? 0
                        },
                        {
                            key: 'total_score_saves', label: 'Sauvegardes score',
                            sortable: true,
                            render: (val) => val ?? 0
                        },
                        { key: 'total_score_attempts', label: 'Tentatives score', sortable: true },
                        {
                            key: 'top10_attempt_rate_percent', label: 'Taux Top 10',
                            sortable: true,
                            render: (val) => `${Number(val).toFixed(1)}%`
                        }
                    ]}
                />
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-200">
                        <Trophy size={14} className="inline mr-1" />
                        <strong>Action :</strong> Renforcez les mécaniques de compétition (notifications top 10, challenges hebdomadaires) sur ces jeux. Proposez des récompenses.
                    </p>
                </div>
            </SectionCard>

            {/* AXE 8 — Funnel d'achat */}
            <SectionCard icon={ShoppingBag} title="8. Funnel d'achat — points de friction" subtitle="Quand et pourquoi les joueurs abandonnent le processus d'achat" sectionId="axe-8">
                {monetization ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 rounded-lg p-4 text-center">
                                <div className="text-sm text-text-muted mb-1">Taux d'abandon panier</div>
                                <div className={`text-3xl font-bold ${monetization.cart_abandonment_rate > 50 ? 'text-red-400' : 'text-white'}`}>
                                    {monetization.cart_abandonment_rate}%
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 text-center">
                                <div className="text-sm text-text-muted mb-1">Pack le plus acheté</div>
                                <div className="text-lg font-bold text-white truncate">
                                    {monetization.most_purchased_pack}
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 text-center">
                                <div className="text-sm text-text-muted mb-1">Meilleure tranche</div>
                                <div className="text-lg font-bold text-green-400">
                                    {monetization.conversion_by_play_time.length > 0
                                        ? monetization.conversion_by_play_time.reduce((best, cur) => cur.conversion_rate > best.conversion_rate ? cur : best).hours_range
                                        : '–'}
                                </div>
                            </div>
                        </div>
                        {monetization.conversion_by_play_time.length > 0 && (
                            <AnalyticsBarChart
                                data={monetization.conversion_by_play_time.map(c => ({ name: c.hours_range, value: Math.round(c.conversion_rate * 100) / 100 }))}
                                dataKey="value"
                                xKey="name"
                                color="#22c55e"
                                name="Conversion %"
                            />
                        )}
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-sm text-green-200">
                                <ShoppingCart size={14} className="inline mr-1" />
                                <strong>Action :</strong> Si abandon &gt; 50%, simplifiez le processus d'achat. Proposez l'achat exactement dans la tranche de temps qui convertit le mieux.
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-text-muted text-sm">Données de monétisation non disponibles.</p>
                )}
            </SectionCard>

            {/* AXE 9 — Profil de session optimal */}
            <SectionCard icon={Timer} title="9. Profil de session optimal" subtitle="Durée de session idéale pour maximiser l'engagement et la conversion" sectionId="axe-9">
                {sessionBuckets.length > 0 ? (
                    <div className="space-y-4">
                        <AnalyticsBarChart
                            data={sessionBuckets.map(b => ({ name: b.range, value: b.count }))}
                            dataKey="value"
                            xKey="name"
                            color="#a855f7"
                            name="Utilisateurs"
                        />
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <p className="text-sm text-purple-200">
                                <Timer size={14} className="inline mr-1" />
                                <strong>Action :</strong> Optimisez le flow de jeux pour que le joueur atteigne la durée de session idéale. Si les sessions courtes dominent, ajoutez des mécaniques de rétention (streaks, daily rewards).
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-text-muted text-sm">Pas assez de données de session.</p>
                )}
            </SectionCard>

            {/* AXE 11 — Flash vs Immersifs */}
            <SectionCard icon={Gamepad2} title="11. Jeux flash vs immersifs" subtitle="Classés par temps moyen par partie — équilibrez le catalogue" sectionId="axe-11">
                <ExpandableTable
                    data={flashImmersiveGames}
                    columns={[
                        rankCol,
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        { key: 'category', label: 'Catégorie', sortable: true },
                        {
                            key: 'avg_play_time_minutes',
                            label: 'Temps moyen (min)',
                            sortable: true,
                            render: (val) => `${Number(val || 0).toFixed(1)}`
                        },
                        {
                            key: 'launches_per_player',
                            label: 'Lanc./joueur',
                            sortable: true,
                            render: (val) => val != null ? Number(val).toFixed(1) : '–'
                        },
                        { key: 'unique_players', label: 'Joueurs', sortable: true }
                    ]}
                />
                <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <p className="text-sm text-indigo-200">
                        <Gamepad2 size={14} className="inline mr-1" />
                        <strong>Action :</strong> Trop de jeux « Flash » fatigue en mode feed ; trop d’immersifs peut bloquer la découverte. Variez les types pour garder un mix équilibré.
                    </p>
                </div>
            </SectionCard>

            {/* AXE 12 — Segmentation joueurs */}
            <SectionCard icon={Users} title="12. Segmentation joueurs" subtitle="Répartition par profil (baleines, engagés gratuits, casuals, dormants)" sectionId="axe-12">
                {segments.length > 0 ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Segment</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Joueurs</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">%</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Temps moy. (h)</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Sessions moy.</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Conversion %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {segments.map((row, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="px-4 py-3 text-sm text-text-primary">{row.segment}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.count}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.pct}%</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.avg_play_time_hours.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.avg_sessions.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.conversion_pct.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                            <p className="text-sm text-cyan-200">
                                <Users size={14} className="inline mr-1" />
                                <strong>Action :</strong> Ciblez les « Engagés gratuits » pour la conversion. Réactivez les « Dormants » par push/email. Chouchoutez les « Baleines ».
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-text-muted text-sm">Pas assez de données utilisateurs pour segmenter.</p>
                )}
            </SectionCard>

            {/* AXE 13 — Coût par joueur */}
            <SectionCard icon={DollarSign} title="13. Coût par joueur (efficience)" subtitle="Requêtes DB et coût relatif par jeu — optimisez les plus gourmands" sectionId="axe-13">
                {costOverview != null && (
                    <div className="mb-4 p-3 bg-white/5 rounded-lg">
                        <p className="text-sm text-text-muted">
                            Global : <strong className="text-white">{Number(costOverview.total_db_requests ?? 0).toLocaleString()}</strong> requêtes DB,{' '}
                            <strong className="text-white">{Number(costOverview.avg_cost_per_player ?? 0).toFixed(0)}</strong> req./joueur (période)
                        </p>
                    </div>
                )}
                {gameEfficiency.length > 0 ? (
                    <>
                        <ExpandableTable
                            data={gameEfficiency}
                            columns={[
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                {
                                    key: 'db_requests_per_player',
                                    label: 'Req. DB / joueur',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(0)
                                },
                                {
                                    key: 'mb_per_player',
                                    label: 'Mo / joueur',
                                    sortable: true,
                                    render: (val) => (val != null ? Number(val).toFixed(2) : '–')
                                },
                                {
                                    key: 'conversion_rate',
                                    label: 'Conversion %',
                                    sortable: true,
                                    render: (val) => `${Number(val ?? 0).toFixed(1)}%`
                                },
                                { key: 'unique_players', label: 'Joueurs', sortable: true }
                            ]}
                        />
                        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <p className="text-sm text-emerald-200">
                                <DollarSign size={14} className="inline mr-1" />
                                <strong>Action :</strong> Réduisez les requêtes sur les jeux les plus coûteux (cache, batch). Les jeux avec bon ROI (conversion / coût) à privilégier.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-text-muted text-sm">Aucune donnée de coût par jeu (game_id dans cost_metrics). Vérifiez le tracking côté app.</p>
                )}
            </SectionCard>

            {/* AXE 14 — Intensité engagement */}
            <SectionCard icon={Activity} title="14. Intensité d'engagement" subtitle="Swipes/heure et frustration — distinguer engagement positif et négatif" sectionId="axe-14">
                {intensityGames.length > 0 ? (
                    <>
                        <ExpandableTable
                            data={intensityGames}
                            columns={[
                                rankCol,
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                {
                                    key: 'intensity_swipes_per_hour',
                                    label: 'Swipes / h',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(1)
                                },
                                {
                                    key: 'frustration_index_percent',
                                    label: 'Frustration %',
                                    sortable: true,
                                    render: (val) => (
                                        <span className={Number(val) > 10 ? 'text-red-400' : Number(val) > 5 ? 'text-orange-400' : 'text-success'}>
                                            {Number(val ?? 0).toFixed(1)}%
                                        </span>
                                    )
                                },
                                {
                                    key: 'completion_rate_percent',
                                    label: 'Complétion %',
                                    sortable: true,
                                    render: (val) => `${Number(val ?? 0).toFixed(1)}%`
                                }
                            ]}
                        />
                        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-sm text-amber-200">
                                <Activity size={14} className="inline mr-1" />
                                <strong>Action :</strong> Haute intensité + faible frustration = jeu addictif à mettre en avant. Haute intensité + haute frustration = revoir l’UX.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-text-muted text-sm">Pas de métriques de flow disponibles.</p>
                )}
            </SectionCard>

            {/* AXE 15 — Parcours social (commentaires) */}
            <SectionCard icon={MessageCircle} title="15. Parcours social — jeux qui génèrent des discussions" subtitle="Triés par ratio commentaires / joueurs" sectionId="axe-15">
                {socialMetrics.length > 0 ? (
                    <>
                        <ExpandableTable
                            data={withRank([...socialMetrics].sort((a, b) => b.comments_to_players_ratio - a.comments_to_players_ratio))}
                            columns={[
                                rankCol,
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                {
                                    key: 'comments_to_players_ratio',
                                    label: 'Commentaires / joueur',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(2)
                                },
                                {
                                    key: 'social_engagement_rate',
                                    label: 'Engagement social',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(2)
                                },
                                { key: 'total_bookmarks', label: 'Favoris', sortable: true }
                            ]}
                        />
                        <div className="mt-3 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                            <p className="text-sm text-sky-200">
                                <MessageCircle size={14} className="inline mr-1" />
                                <strong>Action :</strong> Renforcez les CTA sociaux sur les jeux à fort potentiel mais peu commentés. Créez de la communauté autour des jeux les plus discutés.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-text-muted text-sm">Pas de métriques sociales disponibles.</p>
                )}
            </SectionCard>

            {/* AXE 16 — Performance IAP */}
            <SectionCard icon={Package} title="16. Performance des packs IAP" subtitle="Packs les plus achetés — à mettre en avant ou à revoir" sectionId="axe-16">
                {monetization?.purchases_by_type && monetization.purchases_by_type.length > 0 ? (
                    <div className="space-y-4">
                        <AnalyticsBarChart
                            data={monetization.purchases_by_type.map(p => ({ name: p.product_id.replace(/.*\./, ''), value: p.count }))}
                            dataKey="value"
                            xKey="name"
                            color="#f59e0b"
                            name="Achats"
                        />
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-sm text-amber-200">
                                <Package size={14} className="inline mr-1" />
                                <strong>Action :</strong> Renforcez la visibilité des packs qui performent. Revoir pricing ou positionnement des packs ignorés.
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-text-muted text-sm">Aucun achat enregistré (purchaseTypes non alimenté).</p>
                )}
            </SectionCard>

            {/* AXE 17 — Jeux tremplin (onboarding) */}
            <SectionCard icon={Rocket} title="17. Jeux tremplin (onboarding)" subtitle="Premier jeu joué → rétention et temps de jeu moyen" sectionId="axe-17">
                {firstGameLifetime.length > 0 ? (
                    <>
                        <ExpandableTable
                            data={firstGameLifetime}
                            columns={[
                                { key: 'game_id', label: 'Jeu (1er joué)', sortable: true },
                                { key: 'users_count', label: 'Joueurs', sortable: true },
                                {
                                    key: 'avg_lifetime_days',
                                    label: 'Lifetime moyen (j)',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(1)
                                },
                                {
                                    key: 'avg_play_time_hours',
                                    label: 'Temps de jeu moy. (h)',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(2)
                                }
                            ]}
                        />
                        <div className="mt-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                            <p className="text-sm text-violet-200">
                                <Rocket size={14} className="inline mr-1" />
                                <strong>Action :</strong> Placez le meilleur « tremplin » (lifetime élevé) en premier dans le feed pour maximiser la rétention des nouveaux joueurs.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-text-muted text-sm">Pas assez de données pour identifier les jeux d’entrée (snapshots sur 90 j max).</p>
                )}
            </SectionCard>

            {/* AXE 18 — Tendance hebdo */}
            <SectionCard icon={TrendingUp} title="18. Tendance hebdo" subtitle="Évolution par semaine — joueurs, temps de jeu, achats" sectionId="axe-18">
                {weeklyTrend.length > 0 ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Semaine</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Temps (h)</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Sessions</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Joueurs-jours</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Achats</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {weeklyTrend.map((row, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="px-4 py-3 text-sm text-text-primary">{row.week}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.total_play_time_hours.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.total_sessions}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.player_days}</td>
                                            <td className="px-4 py-3 text-sm text-right text-text-primary">{row.purchases}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                            <p className="text-sm text-teal-200">
                                <TrendingUp size={14} className="inline mr-1" />
                                <strong>Action :</strong> Surveillez 2 semaines consécutives à la baisse pour déclencher des actions (push, offres, nouveau contenu).
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-text-muted text-sm">Pas de données quotidiennes pour agréger par semaine.</p>
                )}
            </SectionCard>

            {/* AXE 19 — Jeux sous-exploités */}
            <SectionCard icon={Gem} title="19. Jeux sous-exploités (hidden gems)" subtitle="Bonne rétention mais peu de joueurs — à mettre en avant" sectionId="axe-19">
                {underExploitedGames.length > 0 ? (
                    <>
                        <ExpandableTable
                            data={underExploitedGames}
                            columns={[
                                rankCol,
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                {
                                    key: 'retention_score',
                                    label: 'Score rétention',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(1)
                                },
                                { key: 'unique_players', label: 'Joueurs', sortable: true },
                                {
                                    key: 'avg_play_time_minutes',
                                    label: 'Temps moy. (min)',
                                    sortable: true,
                                    render: (val) => `${Number(val ?? 0).toFixed(1)}`
                                }
                            ]}
                        />
                        <div className="mt-3 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                            <p className="text-sm text-pink-200">
                                <Gem size={14} className="inline mr-1" />
                                <strong>Action :</strong> Remontez ces jeux dans le feed, proposez-les en « À découvrir », ou en notification.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-text-muted text-sm">Aucun jeu ne correspond (rétention au-dessus de la médiane et joueurs en dessous).</p>
                )}
            </SectionCard>

            {/* AXE 20 — Coût du churn */}
            <SectionCard icon={AlertTriangle} title="20. Coût du churn (jeux toxiques × infra)" subtitle="Jeux qui font quitter ET coûtent en requêtes — priorité à corriger" sectionId="axe-20">
                {churnCost.length > 0 ? (
                    <>
                        <ExpandableTable
                            data={churnCost}
                            columns={[
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                {
                                    key: 'total_db_requests',
                                    label: 'Requêtes DB',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toLocaleString()
                                },
                                {
                                    key: 'exit_rate_percent',
                                    label: 'Taux de sortie %',
                                    sortable: true,
                                    render: (val) => (
                                        <span className={Number(val) > 20 ? 'text-red-400 font-semibold' : 'text-orange-400'}>
                                            {Number(val ?? 0).toFixed(1)}%
                                        </span>
                                    )
                                },
                                {
                                    key: 'churn_cost_index',
                                    label: 'Indice coût churn',
                                    sortable: true,
                                    render: (val) => Number(val ?? 0).toFixed(0)
                                }
                            ]}
                        />
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-200">
                                <AlertTriangle size={14} className="inline mr-1" />
                                <strong>Action :</strong> Améliorez ou retirez ces jeux : ils coûtent de l’infra tout en faisant quitter les joueurs.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-text-muted text-sm">Aucun jeu avec taux de sortie &gt; 10% et coût enregistré (game_id dans cost_metrics).</p>
                )}
            </SectionCard>

            {/* ——— Métriques croisées ——— */}
            <SectionCard icon={Target} title="ROI jeu (valeur vs coût infra)" subtitle="Conversion / coût DB par jeu — prioriser les jeux à fort ROI" sectionId="cross-roi-jeu">
                {roiByGame.length > 0 ? (
                    <ExpandableTable
                        data={roiByGame}
                        columns={[
                            rankCol,
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'conversion_rate_percent', label: 'Conversion %', sortable: true, render: (v) => `${Number(v).toFixed(1)}%` },
                            { key: 'db_requests_per_player', label: 'Req. DB/joueur', sortable: true, render: (v) => Number(v).toFixed(0) },
                            { key: 'roi', label: 'ROI', sortable: true, render: (v) => Number(v).toFixed(3) }
                        ]}
                    />
                ) : (
                    <p className="text-text-muted text-sm">Données coût par jeu (game_id) requises.</p>
                )}
            </SectionCard>

            <SectionCard icon={Zap} title="Score de santé jeu (0–100)" subtitle="Indicateur composite : rétention, partage, conversion, exit, bypass" sectionId="cross-sante">
                {healthScoreGames.length > 0 ? (
                    <ExpandableTable
                        data={healthScoreGames}
                        columns={[
                            rankCol,
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'health_score', label: 'Santé', sortable: true, render: (v) => <span className={Number(v) >= 70 ? 'text-success' : Number(v) < 30 ? 'text-red-400' : 'text-orange-400'}>{Number(v)}</span> },
                            { key: 'retention_score', label: 'Rétention', sortable: true, render: (v) => Number(v).toFixed(1) },
                            { key: 'exit_rate_percent', label: 'Sortie %', sortable: true },
                            { key: 'bypass_rate', label: 'Bypass %', sortable: true }
                        ]}
                    />
                ) : (
                    <p className="text-text-muted text-sm">Pas de données jeux.</p>
                )}
            </SectionCard>

            <SectionCard icon={Rocket} title="Tremplin sous-exploité" subtitle="Meilleurs jeux d’entrée (lifetime élevé) mais peu exposés" sectionId="cross-tremplin-expo">
                {tremplinUnderExposed.length > 0 ? (
                    <ExpandableTable
                        data={tremplinUnderExposed}
                        columns={[
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'users_count', label: 'Joueurs (1er jeu)', sortable: true },
                            { key: 'avg_lifetime_days', label: 'Lifetime moy. (j)', sortable: true, render: (v) => Number(v).toFixed(1) },
                            { key: 'avg_play_time_hours', label: 'Temps moy. (h)', sortable: true, render: (v) => Number(v).toFixed(2) }
                        ]}
                    />
                ) : (
                    <p className="text-text-muted text-sm">Aucun tremplin sous-exploité identifié.</p>
                )}
            </SectionCard>

            <SectionCard icon={AlertTriangle} title="Piège à coût" subtitle="Fort coût churn et faible rétention — priorité refonte ou retrait" sectionId="cross-piege-cout">
                {piegeCout.length > 0 ? (
                    <ExpandableTable
                        data={piegeCout}
                        columns={[
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'churn_cost_index', label: 'Indice churn coût', sortable: true, render: (v) => Number(v).toFixed(0) },
                            { key: 'exit_rate_percent', label: 'Sortie %', sortable: true },
                            { key: 'retention_score', label: 'Rétention', sortable: true, render: (v) => Number(v).toFixed(1) }
                        ]}
                    />
                ) : (
                    <p className="text-text-muted text-sm">Aucun jeu ne cumule fort churn cost et faible rétention.</p>
                )}
            </SectionCard>

            <SectionCard icon={Share2} title="Viralité par coût" subtitle="Partages / requêtes DB — jeux viraux à coût maîtrisé" sectionId="cross-viralite-cout">
                {viraliteCout.length > 0 ? (
                    <ExpandableTable
                        data={viraliteCout}
                        columns={[
                            rankCol,
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'share_rate', label: 'Partages/joueur', sortable: true, render: (v) => Number(v).toFixed(2) },
                            { key: 'db_requests_per_player', label: 'Req. DB/joueur', sortable: true },
                            { key: 'viralite_cout', label: 'Viralité/coût', sortable: true, render: (v) => Number(v).toFixed(4) }
                        ]}
                    />
                ) : (
                    <p className="text-text-muted text-sm">Données coût par jeu requises.</p>
                )}
            </SectionCard>

            <SectionCard icon={Timer} title="Moment d’achat idéal" subtitle="Tranche de temps de jeu et contexte où la conversion est maximale" sectionId="cross-moment-achat">
                {monetization?.conversion_by_play_time && monetization.conversion_by_play_time.length > 0 ? (
                    <div className="space-y-3">
                        <p className="text-sm text-text-primary">
                            Meilleure tranche de temps de jeu : <strong className="text-primary">
                                {monetization.conversion_by_play_time.reduce((best, cur) => cur.conversion_rate > best.conversion_rate ? cur : best, monetization.conversion_by_play_time[0]).hours_range}
                            </strong>
                            {' '}(conversion max). Abandon panier global : <strong className="text-white">{Number(monetization.cart_abandonment_rate ?? 0).toFixed(0)}%</strong>.
                        </p>
                        <p className="text-xs text-text-muted">Proposez l’offre après cette durée de jeu cumulé ; si abandon &gt; 50 %, simplifiez le tunnel d’achat.</p>
                    </div>
                ) : (
                    <p className="text-text-muted text-sm">Données de conversion par temps de jeu non disponibles.</p>
                )}
            </SectionCard>

            <SectionCard icon={ShoppingCart} title="Potentiel conversion inexploité" subtitle="Jeux à fort engagement mais conversion en dessous de la moyenne app" sectionId="cross-potentiel-conversion">
                {potentielConversion.length > 0 ? (
                    <ExpandableTable
                        data={potentielConversion.slice(0, 20)}
                        columns={[
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'conversion_rate_percent', label: 'Conversion %', sortable: true, render: (v) => `${Number(v).toFixed(1)}%` },
                            { key: 'app_avg', label: 'Moy. app %', sortable: true, render: (v) => `${Number(v).toFixed(1)}%` },
                            { key: 'total_play_time_hours', label: 'Temps (h)', sortable: true },
                            { key: 'unique_players', label: 'Joueurs', sortable: true }
                        ]}
                    />
                ) : (
                    <p className="text-text-muted text-sm">Aucun jeu avec fort engagement et conversion sous la moyenne.</p>
                )}
            </SectionCard>

            <SectionCard icon={MessageCircle} title="Engagement social par coût" subtitle="Ratio engagement social / requêtes DB par jeu" sectionId="cross-social-cout">
                {socialCout.length > 0 ? (
                    <ExpandableTable
                        data={socialCout}
                        columns={[
                            rankCol,
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'social_engagement_rate', label: 'Engagement social', sortable: true, render: (v) => Number(v).toFixed(2) },
                            { key: 'db_requests_per_player', label: 'Req. DB/joueur', sortable: true },
                            { key: 'social_cout', label: 'Social/coût', sortable: true, render: (v) => Number(v).toFixed(4) }
                        ]}
                    />
                ) : (
                    <p className="text-text-muted text-sm">Données coût par jeu requises.</p>
                )}
            </SectionCard>

            <SectionCard icon={TrendingDown} title="Risque churn par segment" subtitle="Tendance hebdo et répartition des segments (dormants, casuals…)" sectionId="cross-risque-churn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-medium text-white mb-2">Segments actuels</h4>
                        <p className="text-xs text-text-muted">{segments.length} segments avec effectifs. Surveillez la part de Dormants et Casuals.</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-white mb-2">Dernières semaines</h4>
                        {weeklyTrend.length > 0 ? (
                            <p className="text-xs text-text-muted">Joueurs-jours et achats par semaine ci-dessus (axe 18). Deux semaines de baisse = alerte.</p>
                        ) : (
                            <p className="text-xs text-text-muted">Pas de tendance hebdo disponible.</p>
                        )}
                    </div>
                </div>
            </SectionCard>

            <SectionCard icon={ShoppingBag} title="Funnel achat par jeu" subtitle="Conversion et achats associés par jeu — identifier les frictions" sectionId="cross-funnel-achat">
                <div className="space-y-3">
                    {monetization && (
                        <p className="text-sm text-text-primary">
                            Abandon panier global : <strong className="text-white">{Number(monetization.cart_abandonment_rate ?? 0).toFixed(0)}%</strong>.
                            {monetization.cart_abandonment_rate > 50 && ' Simplifiez le tunnel d’achat.'}
                        </p>
                    )}
                    {conversionByGame.filter(c => c.purchasers > 0).length > 0 ? (
                        <ExpandableTable<ConversionByGame>
                            data={conversionByGame.filter(c => c.purchasers > 0).sort((a, b) => b.conversion_rate_percent - a.conversion_rate_percent)}
                            columns={[
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                { key: 'purchasers', label: 'Acheteurs', sortable: true },
                                { key: 'conversion_rate_percent', label: 'Conversion %', sortable: true, render: (v) => `${Number(v).toFixed(1)}%` },
                                {
                                    key: 'game_id',
                                    label: 'Achats (période)',
                                    render: (_, row) => purchasesByGameMap.get(row.game_id) ?? '–'
                                }
                            ]}
                        />
                    ) : (
                        <p className="text-text-muted text-sm">Aucun achat par jeu sur la période.</p>
                    )}
                </div>
            </SectionCard>

            {/* Axe 10 rappel en bas */}
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
                <p className="text-sm text-text-muted">
                    Données sur les <strong className="text-white">{days} derniers jours</strong> — {games.length} jeux analysés — {enriched.filter(g => g.unique_players > 0).length} jeux actifs
                </p>
            </div>
        </div>
    )
}
