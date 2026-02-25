import React, { useEffect, useState } from 'react'
import { Users, Clock, Gamepad2, TrendingUp, Activity, Trophy } from 'lucide-react'
import { KPICard } from '../components/ui/KPICard'
import { AnalyticsLineChart } from '../components/ui/charts/LineChart'
import { AnalyticsDonutChart } from '../components/ui/charts/DonutChart'
import { DataTable } from '../components/ui/DataTable'
import { AnalyticsService, type KPIData, type GameAnalytics, type DailyMetrics } from '../services/analyticsService'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

export const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [kpis, setKpis] = useState<KPIData | null>(null)
    const [topGames, setTopGames] = useState<GameAnalytics[]>([])
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [kpiData, gamesData, metricsData] = await Promise.all([
                    AnalyticsService.getKPIs(30),
                    AnalyticsService.getGamesAnalytics(30),
                    AnalyticsService.getDailyMetrics(30)
                ])
                setKpis(kpiData)
                setTopGames(gamesData.slice(0, 5))
                setDailyMetrics(metricsData)
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
                    trend={12.5}
                    trendLabel="vs 30 derniers jours"
                    icon={Users}
                    help={{
                        definition: "Nombre d'utilisateurs distincts ayant lancé au moins un jeu.",
                        usage: "Mesure la taille de votre audience active."
                    }}
                />
                <KPICard
                    title="Temps de Jeu Total"
                    value={`${Math.round(kpis?.total_play_time_hours || 0)}h`}
                    trend={8.2}
                    trendLabel="vs 30 derniers jours"
                    icon={Clock}
                    help={{
                        definition: "Somme de toutes les durées de sessions de jeu.",
                        usage: "Indicateur clé de l'engagement global."
                    }}
                />
                <KPICard
                    title="Sessions Totales"
                    value={(kpis?.total_sessions || 0).toLocaleString()}
                    trend={-2.4}
                    trendLabel="vs 30 derniers jours"
                    icon={Gamepad2}
                    help={{
                        definition: "Nombre total de parties lancées.",
                        usage: "Reflète la fréquence d'utilisation de l'application."
                    }}
                />
                <KPICard
                    title="Taux de Conversion"
                    value={`${(kpis?.conversion_rate_percent || 0).toFixed(1)}%`}
                    trend={5.1}
                    trendLabel="vs 30 derniers jours"
                    icon={TrendingUp}
                    help={{
                        definition: "Pourcentage d'utilisateurs passant à l'achat.",
                        usage: "Mesure l'efficacité de votre monétisation."
                    }}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Activity size={20} className="text-primary" />
                            Activité Joueurs
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
                        </h3>
                    </div>
                    <AnalyticsDonutChart
                        data={gamesChartData}
                        name="Lancements"
                    />
                </div>
            </div>

            {/* Recent Games Table */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Jeux Populaires</h3>
                </div>
                <DataTable
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
