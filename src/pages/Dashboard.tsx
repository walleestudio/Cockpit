import React, { useEffect, useState } from 'react'
import { Users, Clock, Gamepad2, TrendingUp, Activity, Trophy } from 'lucide-react'
import { KPICard } from '../components/ui/KPICard'
import { MetricHelp } from '../components/ui/MetricHelp'
import { AnalyticsLineChart } from '../components/ui/charts/LineChart'
import { AnalyticsDonutChart } from '../components/ui/charts/DonutChart'
import { DataTable } from '../components/ui/DataTable'
import { ExpandableTable } from '../components/ui/ExpandableTable'
import { AnalyticsService, type KPIData, type GameAnalytics, type DailyMetrics, type PromotedGame } from '../services/analyticsService'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { APP_HELP } from '../help/appHelp'

export const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [kpis, setKpis] = useState<KPIData | null>(null)
    const [topGames, setTopGames] = useState<GameAnalytics[]>([])
    const [promotedGames, setPromotedGames] = useState<PromotedGame[]>([])
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
    const [kpiTrends, setKpiTrends] = useState({
        unique_players: 0,
        total_play_time_hours: 0,
        total_sessions: 0,
        conversion_rate_percent: 0
    })
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const days = Math.max(
                    1,
                    Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
                )
                const results = await Promise.allSettled([
                    AnalyticsService.getKPIs(days),
                    AnalyticsService.getGamesAnalytics(days),
                    AnalyticsService.getDailyMetrics(days),
                    AnalyticsService.getPromotedGames(days, 5)
                ])
                const [kpiRes, gamesRes, dailyRes, promotedRes] = results

                const kpiData = kpiRes.status === 'fulfilled' ? kpiRes.value : null
                const gamesData = gamesRes.status === 'fulfilled' ? gamesRes.value : []
                const metricsData = dailyRes.status === 'fulfilled' ? dailyRes.value : []
                const promotedData = promotedRes.status === 'fulfilled' ? promotedRes.value : []

                setKpis(kpiData)
                setTopGames(gamesData.slice(0, 5))
                setPromotedGames(promotedData)
                setDailyMetrics(metricsData)

                if (kpiData) {
                    try {
                        const prevKpiData = await AnalyticsService.getKPIs(days, days)
                        setKpiTrends({
                            unique_players: computeTrend(kpiData?.unique_players || 0, prevKpiData?.unique_players || 0),
                            total_play_time_hours: computeTrend(kpiData?.total_play_time_hours || 0, prevKpiData?.total_play_time_hours || 0),
                            total_sessions: computeTrend(kpiData?.total_sessions || 0, prevKpiData?.total_sessions || 0),
                            conversion_rate_percent: computeTrend(kpiData?.conversion_rate_percent || 0, prevKpiData?.conversion_rate_percent || 0)
                        })
                    } catch (prevErr) {
                        console.error('Dashboard previous KPI fetch failed:', prevErr)
                        setKpiTrends({
                            unique_players: 0,
                            total_play_time_hours: 0,
                            total_sessions: 0,
                            conversion_rate_percent: 0
                        })
                    }
                } else {
                    setKpiTrends({
                        unique_players: 0,
                        total_play_time_hours: 0,
                        total_sessions: 0,
                        conversion_rate_percent: 0
                    })
                }

                const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
                if (rejected.length > 0) {
                    console.error('Some dashboard queries failed:', rejected.map(r => r.reason))
                }

                if (rejected.length === results.length) {
                    setError('Erreur lors du chargement des données')
                } else {
                    setError(null)
                }
            } catch (err) {
                setError('Erreur lors du chargement des données')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [dateRange])

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    const chartData = dailyMetrics.map(m => ({
        date: new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        players: m.unique_players,
        sessions: m.total_sessions
    })).reverse()

    const gamesChartData = topGames.map(g => ({
        name: g.game_id,
        value: g.total_launches
    }))
    const trendLabel = `vs ${Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)))} jours précédents`

    const computeTrend = (current: number, previous: number) => {
        if (!previous) return current > 0 ? 100 : 0
        return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-text-muted mt-1">Vue d'ensemble des performances</p>
                </div>
                <DateRangePicker
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onChange={(start, end) => setDateRange({ start, end })}
                />
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Joueurs Uniques"
                    value={(kpis?.unique_players || 0).toLocaleString()}
                    trend={kpiTrends.unique_players}
                    trendLabel={trendLabel}
                    icon={Users}
                    content={APP_HELP['dashboard-joueurs-uniques']}
                />
                <KPICard
                    title="Temps de Jeu Total"
                    value={`${Math.round(kpis?.total_play_time_hours || 0)}h`}
                    trend={kpiTrends.total_play_time_hours}
                    trendLabel={trendLabel}
                    icon={Clock}
                    content={APP_HELP['dashboard-temps-jeu-total']}
                />
                <KPICard
                    title="Sessions Totales"
                    value={(kpis?.total_sessions || 0).toLocaleString()}
                    trend={kpiTrends.total_sessions}
                    trendLabel={trendLabel}
                    icon={Gamepad2}
                    content={APP_HELP['dashboard-sessions-totales']}
                />
                <KPICard
                    title="Taux de Conversion"
                    value={`${(kpis?.conversion_rate_percent || 0).toFixed(1)}%`}
                    trend={kpiTrends.conversion_rate_percent}
                    trendLabel={trendLabel}
                    icon={TrendingUp}
                    content={APP_HELP['dashboard-taux-conversion']}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Activity size={20} className="text-primary" />
                            Activité Joueurs
                            <MetricHelp content={APP_HELP['dashboard-activite-joueurs']} />
                        </h3>
                    </div>
                    <AnalyticsLineChart
                        data={chartData}
                        dataKey="players"
                        xKey="date"
                        color="#3b82f6"
                        name="Joueurs"
                    />
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Trophy size={20} className="text-yellow-500" />
                            Top Jeux
                            <MetricHelp content={APP_HELP['dashboard-top-jeux']} />
                        </h3>
                    </div>
                    <AnalyticsDonutChart
                        data={gamesChartData}
                        name="Lancements"
                    />
                </div>
            </div>

            {/* Jeux à mettre en avant */}
            {promotedGames.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            Jeux à mettre en avant
                            <MetricHelp content={APP_HELP['dashboard-jeux-a-mettre-en-avant']} />
                        </h3>
                        <span className="text-xs text-text-muted">Score = partages×2 + likes + bookmarks / joueurs (pondéré rétention & temps)</span>
                    </div>
                    <DataTable
                        data={promotedGames}
                        columns={[
                            { key: 'game_id', label: 'Jeu', sortable: true },
                            { key: 'promoted_score', label: 'Score', sortable: true, render: (val) => Number(val).toFixed(2) },
                            { key: 'unique_players', label: 'Joueurs', sortable: true },
                            { key: 'total_launches', label: 'Lancements', sortable: true },
                            { key: 'total_shares', label: 'Partages', sortable: true },
                            {
                                key: 'net_likes',
                                label: 'Likes',
                                sortable: true,
                                render: (_val, row) => (row && Number(row.net_likes ?? 0)) ?? '–'
                            },
                            {
                                key: 'total_bookmarks',
                                label: 'Favoris',
                                sortable: true,
                                render: (_val, row) => (row && Number(row.total_bookmarks ?? 0)) ?? '–'
                            },
                            {
                                key: 'exit_rate_percent',
                                label: 'Sortie %',
                                sortable: true,
                                render: (val) => (
                                    <span className={Number(val) > 50 ? 'text-red-500' : 'text-success'}>{Number(val).toFixed(1)}%</span>
                                )
                            }
                        ]}
                    />
                </div>
            )}

            {/* Recent Games Table */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        Jeux Populaires
                        <MetricHelp content={APP_HELP['dashboard-jeux-populaires']} />
                    </h3>
                </div>
                <ExpandableTable
                    data={topGames}
                    columns={[
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        { key: 'unique_players', label: 'Joueurs', sortable: true },
                        { key: 'total_launches', label: 'Lancements', sortable: true },
                        {
                            key: 'avg_play_time_minutes',
                            label: 'Temps Moyen',
                            sortable: true,
                            render: (val) => `${Math.round(Number(val))} min`
                        },
                        {
                            key: 'total_score_attempts',
                            label: 'Engagement',
                            sortable: true,
                            render: (_, item) => (
                                <div className="w-full bg-white/5 rounded-full h-1.5 max-w-[100px]">
                                    <div
                                        className="bg-success h-1.5 rounded-full"
                                        style={{ width: `${Math.min(100, (item.total_score_attempts / 1000) * 100)}%` }}
                                    />
                                </div>
                            )
                        }
                    ]}
                />
            </div>
        </div>
    )
}
