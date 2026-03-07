import { useEffect, useState } from 'react'
import {
    BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis
} from 'recharts'
import {
    DollarSign, TrendingUp, Database, Shield, AlertTriangle, Activity
} from 'lucide-react'
import { CostMetricsService } from '../services/costMetricsService'
import type {
    CostOverview, GameEfficiency, BandwidthIntensity, ChurnCost, SessionEfficiency, DailyCostTrend, CostAlert
} from '../services/costMetricsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { MetricHelp } from '../components/ui/MetricHelp'
import { KPICard } from '../components/ui/KPICard'
import { APP_HELP } from '../help/appHelp'

export default function CostMetrics() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'efficiency' | 'alerts' | 'trends'>('overview')

    const [overview, setOverview] = useState<CostOverview | null>(null)
    const [gameEfficiency, setGameEfficiency] = useState<GameEfficiency[]>([])
    const [bandwidthIntensity, setBandwidthIntensity] = useState<BandwidthIntensity[]>([])
    const [churnCost, setChurnCost] = useState<ChurnCost[]>([])
    const [sessionEfficiency, setSessionEfficiency] = useState<SessionEfficiency[]>([])
    const [dailyTrend, setDailyTrend] = useState<DailyCostTrend[]>([])
    const [alerts, setAlerts] = useState<CostAlert[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const results = await Promise.allSettled([
                CostMetricsService.getCostOverview(7),
                CostMetricsService.getGameEfficiency(7),
                CostMetricsService.getBandwidthIntensity(7),
                CostMetricsService.getChurnCost(7),
                CostMetricsService.getSessionEfficiency(7),
                CostMetricsService.getDailyCostTrend(7),
                CostMetricsService.getCostAlerts(7)
            ])
            const [
                overviewRes,
                efficiencyRes,
                bandwidthRes,
                churnRes,
                sessionRes,
                trendRes,
                alertsRes
            ] = results

            if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value)
            if (efficiencyRes.status === 'fulfilled') setGameEfficiency(efficiencyRes.value)
            if (bandwidthRes.status === 'fulfilled') setBandwidthIntensity(bandwidthRes.value)
            if (churnRes.status === 'fulfilled') setChurnCost(churnRes.value)
            if (sessionRes.status === 'fulfilled') setSessionEfficiency(sessionRes.value)
            if (trendRes.status === 'fulfilled') setDailyTrend(trendRes.value)
            if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value)

            const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            if (rejected.length > 0) {
                console.error('Some cost metrics queries failed:', rejected.map(r => r.reason))
            }

            if (rejected.length === results.length) {
                setError('Impossible de charger les métriques de coûts. Vérifiez les permissions sur les tables cost_metrics et user_analytics_snapshots.')
            } else {
                setError(null)
            }
        } catch (err) {
            console.error('Error loading cost metrics:', err)
            setError('Impossible de charger les métriques de coûts. Vérifiez les permissions sur les tables cost_metrics et user_analytics_snapshots.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    // Prepare chart data
    const trendChartData = dailyTrend.reduce((acc, item) => {
        const existing = acc.find(d => d.date === item.metric_date)
        if (existing) {
            existing[item.metric_type] = item.total_value
        } else {
            acc.push({
                date: new Date(item.metric_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                [item.metric_type]: item.total_value
            })
        }
        return acc
    }, [] as any[]).reverse()

    const sessionChartData = sessionEfficiency.map(a => ({
        date: new Date(a.metric_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        sessions_per_active_player: a.sessions_per_active_player
    })).reverse()

    const CHART_THEME = { surface: '#0A0A0A', border: '#222222', axis: '#71717a' }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Coûts & performance</h1>
                    <p className="text-text-muted mt-1">Requêtes DB, bande passante, alertes et tendances</p>
                </div>
                <div className="flex gap-2 bg-surface border border-border p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                    >
                        Vue d'ensemble
                    </button>
                    <button
                        onClick={() => setActiveTab('efficiency')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'efficiency' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                    >
                        Efficacité par jeu
                    </button>
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'alerts' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                    >
                        Alertes
                    </button>
                    <button
                        onClick={() => setActiveTab('trends')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'trends' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                    >
                        Tendances
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {!overview ? (
                        <div className="bg-surface border border-border rounded-xl p-8 text-center">
                            <p className="text-text-muted text-lg">Aucune donnée de coût disponible</p>
                            <p className="text-text-muted text-sm mt-2">La table cost_metrics est vide ou inaccessible</p>
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <KPICard
                                    title="DB Requests (7j)"
                                    value={(overview?.total_db_requests || 0).toLocaleString()}
                                    trend={overview?.trend_db_requests || 0}
                                    trendLabel="vs 7 derniers jours"
                                    icon={Database}
                                    content={APP_HELP['cost-db-requests']}
                                />
                                <KPICard
                                    title="Bandwidth (7j)"
                                    value={overview?.total_bandwidth_bytes ? `${(overview.total_bandwidth_bytes / 1024 / 1024 / 1024).toFixed(2)} GB` : '0 GB'}
                                    trend={overview?.trend_bandwidth || 0}
                                    trendLabel="vs 7 derniers jours"
                                    icon={Activity}
                                    content={APP_HELP['cost-bandwidth']}
                                />
                                <KPICard
                                    title="Auth Sessions (7j)"
                                    value={(overview?.total_auth_sessions || 0).toLocaleString()}
                                    trend={overview?.trend_auth || 0}
                                    trendLabel="vs 7 derniers jours"
                                    icon={Shield}
                                    content={APP_HELP['cost-auth-sessions']}
                                />
                                <KPICard
                                    title="Coût par Joueur"
                                    value={overview?.avg_cost_per_player?.toFixed(2) || '0'}
                                    icon={DollarSign}
                                    content={APP_HELP['cost-cout-par-joueur']}
                                />
                            </div>

                            {/* Daily Trend Chart */}
                            <div className="bg-surface border border-border rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="flex items-center">
                                            <h3 className="text-lg font-semibold text-white">Évolution Quotidienne</h3>
                                            <MetricHelp content={APP_HELP['cost-evolution-quotidienne']} />
                                        </div>
                                        <p className="text-sm text-text-muted">Requêtes DB, Bande passante, Sessions auth</p>
                                    </div>
                                    <TrendingUp className="text-blue-400 w-6 h-6" />
                                </div>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                            <XAxis dataKey="date" stroke={CHART_THEME.axis} />
                                            <YAxis stroke={CHART_THEME.axis} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend />
                                            <Line type="monotone" dataKey="db_request" stroke="#3b82f6" name="DB Requests" />
                                            <Line type="monotone" dataKey="bandwidth" stroke="#10b981" name="Bandwidth (bytes)" />
                                            <Line type="monotone" dataKey="auth_session" stroke="#f59e0b" name="Auth Sessions" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Games by Cost */}
                            <div className="bg-surface border border-border rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="flex items-center">
                                            <h3 className="text-lg font-semibold text-white">Top 10 Jeux par Coût</h3>
                                            <MetricHelp content={APP_HELP['cost-top10-jeux-cout']} />
                                        </div>
                                        <p className="text-sm text-text-muted">Requêtes DB + Bande passante</p>
                                    </div>
                                </div>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={gameEfficiency.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                            <XAxis type="number" stroke={CHART_THEME.axis} />
                                            <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={90} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Bar dataKey="db_requests_per_player" fill="#3b82f6" radius={[0, 4, 4, 0]} name="DB Req/Player" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'efficiency' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Scatter Plot: Cost vs Conversion */}
                    <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Coût par Joueur vs Taux de Conversion</h3>
                                    <MetricHelp content={APP_HELP['cost-cout-vs-conversion']} />
                                </div>
                                <p className="text-sm text-text-muted">Taille des bulles = Nombre de joueurs</p>
                            </div>
                        </div>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis dataKey="db_requests_per_player" name="DB Req/Player" stroke={CHART_THEME.axis} />
                                    <YAxis dataKey="conversion_rate" name="Conversion %" stroke={CHART_THEME.axis} />
                                    <ZAxis dataKey="unique_players" range={[100, 1000]} name="Players" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ strokeDasharray: '3 3' }}
                                    />
                                    <Scatter name="Games" data={gameEfficiency} fill="#8b5cf6" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Games by Monetization Efficiency */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Efficacité Monétisation</h3>
                                    <MetricHelp content={APP_HELP['cost-efficacite-monetisation']} />
                                </div>
                                <p className="text-sm text-text-muted">Achats / million d'unités de coût</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gameEfficiency.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis type="number" stroke={CHART_THEME.axis} />
                                    <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="purchases_per_million_cost" fill="#10b981" radius={[0, 4, 4, 0]} name="Efficacité" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bandwidth Intensity */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Intensité Bande Passante</h3>
                                    <MetricHelp content={APP_HELP['cost-intensite-bandwidth']} />
                                </div>
                                <p className="text-sm text-text-muted">Mo par heure</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={bandwidthIntensity} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis type="number" stroke={CHART_THEME.axis} />
                                    <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="mb_per_hour" fill="#f59e0b" radius={[0, 4, 4, 0]} name="MB/Hour" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'alerts' && (
                <div className="space-y-6">
                    {/* Alerts Table */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Alertes Actives</h3>
                                    <MetricHelp content={APP_HELP['cost-alertes-actives']} />
                                </div>
                                <p className="text-sm text-text-muted">7 derniers jours</p>
                            </div>
                            <AlertTriangle size={20} className="text-primary" />
                        </div>
                        {alerts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Date</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Type</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Valeur</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Seuil</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Dépassement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alerts.map((alert, idx) => (
                                            <tr key={idx} className="border-b border-border/50 hover:bg-white/5">
                                                <td className="py-3 px-4 text-sm text-white">{new Date(alert.metric_date).toLocaleDateString('fr-FR')}</td>
                                                <td className="py-3 px-4 text-sm text-white">{alert.metric_type}</td>
                                                <td className="py-3 px-4 text-sm text-white text-right">{(alert.total_value || 0).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-sm text-text-muted text-right">{(alert.threshold || 0).toLocaleString()}</td>
                                                <td className={`py-3 px-4 text-sm font-medium text-right ${alert.overage_percent > 20 ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    +{alert.overage_percent.toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-text-muted text-center py-8">Aucune alerte active</p>
                        )}
                    </div>

                    {/* Churn Cost Index */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Indice churn coût</h3>
                                    <MetricHelp content={APP_HELP['cost-churn-cost-index']} />
                                </div>
                                <p className="text-sm text-text-muted">Jeux coûteux avec fort taux d'abandon</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={churnCost} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis type="number" stroke={CHART_THEME.axis} />
                                    <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="churn_cost_index" fill="#ef4444" radius={[0, 4, 4, 0]} name="Churn coût" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trends' && (
                <div className="space-y-6">
                    {/* Session Efficiency */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Sessions par Joueur Actif</h3>
                                    <MetricHelp content={APP_HELP['cost-sessions-par-joueur-actif']} />
                                </div>
                                <p className="text-sm text-text-muted">Intensité d'usage journalière</p>
                            </div>
                            <Activity size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sessionChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis dataKey="date" stroke={CHART_THEME.axis} />
                                    <YAxis stroke={CHART_THEME.axis} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="sessions_per_active_player" stroke="#10b981" name="Sessions/Joueur actif" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Trend Table */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Évolution Quotidienne Détaillée</h3>
                                    <MetricHelp content={APP_HELP['cost-evolution-quotidienne-detaillee']} />
                                </div>
                                <p className="text-sm text-text-muted">Comparaison J vs J-1</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Type</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Valeur</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Précédent</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Différence</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Variation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyTrend.slice(0, 21).map((trend, idx) => (
                                        <tr key={idx} className="border-b border-border/50 hover:bg-white/5">
                                            <td className="py-3 px-4 text-sm text-white">{new Date(trend.metric_date).toLocaleDateString('fr-FR')}</td>
                                            <td className="py-3 px-4 text-sm text-white">{trend.metric_type}</td>
                                            <td className="py-3 px-4 text-sm text-white text-right">{(trend.total_value || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-sm text-text-muted text-right">{trend.previous_value?.toLocaleString() || '-'}</td>
                                            <td className="py-3 px-4 text-sm text-white text-right">{trend.difference?.toLocaleString() || '-'}</td>
                                            <td className={`py-3 px-4 text-sm font-medium text-right ${trend.percent_change === null ? 'text-text-muted' :
                                                trend.percent_change > 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {trend.percent_change !== null ? `${trend.percent_change > 0 ? '+' : ''}${trend.percent_change.toFixed(1)}%` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
