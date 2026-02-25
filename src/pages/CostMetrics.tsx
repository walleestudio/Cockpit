import { useEffect, useState } from 'react'
import {
    BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis
} from 'recharts'
import {
    DollarSign, TrendingUp, Database, Shield, AlertTriangle, Activity
} from 'lucide-react'
import { CostMetricsService } from '../services/costMetricsService'
import type {
    CostOverview, GameEfficiency, BandwidthIntensity, ChurnCost, AuthEfficiency, DailyCostTrend, CostAlert
} from '../services/costMetricsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { MetricHelp } from '../components/ui/MetricHelp'
import { KPICard } from '../components/ui/KPICard'

export default function CostMetrics() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'efficiency' | 'alerts' | 'trends'>('overview')

    const [overview, setOverview] = useState<CostOverview | null>(null)
    const [gameEfficiency, setGameEfficiency] = useState<GameEfficiency[]>([])
    const [bandwidthIntensity, setBandwidthIntensity] = useState<BandwidthIntensity[]>([])
    const [churnCost, setChurnCost] = useState<ChurnCost[]>([])
    const [authEfficiency, setAuthEfficiency] = useState<AuthEfficiency[]>([])
    const [dailyTrend, setDailyTrend] = useState<DailyCostTrend[]>([])
    const [alerts, setAlerts] = useState<CostAlert[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [
                overviewData,
                efficiencyData,
                bandwidthData,
                churnData,
                authData,
                trendData,
                alertsData
            ] = await Promise.all([
                CostMetricsService.getCostOverview(7),
                CostMetricsService.getGameEfficiency(7),
                CostMetricsService.getBandwidthIntensity(7),
                CostMetricsService.getChurnCost(7),
                CostMetricsService.getAuthEfficiency(7),
                CostMetricsService.getDailyCostTrend(7),
                CostMetricsService.getCostAlerts(7)
            ])
            setOverview(overviewData)
            setGameEfficiency(efficiencyData)
            setBandwidthIntensity(bandwidthData)
            setChurnCost(churnData)
            setAuthEfficiency(authData)
            setDailyTrend(trendData)
            setAlerts(alertsData)
            setError(null)
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

    const authChartData = authEfficiency.map(a => ({
        date: new Date(a.metric_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        sessions_per_auth: a.sessions_per_auth
    })).reverse()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Cost & Performance</h1>
                <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('efficiency')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'efficiency' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Game Efficiency
                    </button>
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'alerts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Alerts
                    </button>
                    <button
                        onClick={() => setActiveTab('trends')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'trends' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Trends
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {!overview ? (
                        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
                            <p className="text-slate-400 text-lg">Aucune donnée de coût disponible</p>
                            <p className="text-slate-500 text-sm mt-2">La table cost_metrics est vide ou inaccessible</p>
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
                                    help={{
                                        definition: "Nombre total de requêtes SQL exécutées.",
                                        usage: "Mesure la charge sur la base de données."
                                    }}
                                />
                                <KPICard
                                    title="Bandwidth (7j)"
                                    value={overview?.total_bandwidth_bytes ? `${(overview.total_bandwidth_bytes / 1024 / 1024 / 1024).toFixed(2)} GB` : '0 GB'}
                                    trend={overview?.trend_bandwidth || 0}
                                    trendLabel="vs 7 derniers jours"
                                    icon={Activity}
                                    help={{
                                        definition: "Volume total de données transférées.",
                                        usage: "Identifie les pics de consommation réseau."
                                    }}
                                />
                                <KPICard
                                    title="Auth Sessions (7j)"
                                    value={(overview?.total_auth_sessions || 0).toLocaleString()}
                                    trend={overview?.trend_auth || 0}
                                    trendLabel="vs 7 derniers jours"
                                    icon={Shield}
                                    help={{
                                        definition: "Nombre de sessions d'authentification créées.",
                                        usage: "Mesure l'activité de connexion des utilisateurs."
                                    }}
                                />
                                <KPICard
                                    title="Coût par Joueur"
                                    value={overview?.avg_cost_per_player?.toFixed(2) || '0'}
                                    icon={DollarSign}
                                    help={{
                                        definition: "DB Requests / Unique Players.",
                                        usage: "Identifie l'efficacité de l'infrastructure par utilisateur."
                                    }}
                                />
                            </div>

                            {/* Daily Trend Chart */}
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="flex items-center">
                                            <h3 className="text-lg font-semibold text-white">Évolution Quotidienne</h3>
                                            <MetricHelp
                                                title="Évolution Quotidienne"
                                                definition="Tendance des 3 types de métriques sur 7 jours."
                                                usage="Détecte les pics anormaux de coûts."
                                            />
                                        </div>
                                        <p className="text-sm text-slate-400">DB Requests, Bandwidth, Auth Sessions</p>
                                    </div>
                                    <TrendingUp className="text-blue-400 w-6 h-6" />
                                </div>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="date" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
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
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="flex items-center">
                                            <h3 className="text-lg font-semibold text-white">Top 10 Jeux par Coût</h3>
                                            <MetricHelp
                                                title="Top 10 Jeux par Coût"
                                                definition="Jeux consommant le plus de ressources (DB + Bandwidth)."
                                                usage="Priorise les optimisations."
                                            />
                                        </div>
                                        <p className="text-sm text-slate-400">DB Requests + Bandwidth</p>
                                    </div>
                                </div>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={gameEfficiency.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis type="number" stroke="#94a3b8" />
                                            <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={90} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
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
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Coût par Joueur vs Taux de Conversion</h3>
                                    <MetricHelp
                                        title="Coût vs Conversion"
                                        definition="Corrélation entre coût d'infrastructure et monétisation."
                                        usage="Identifie les jeux inefficaces (coût élevé, conversion faible)."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Taille des bulles = Nombre de joueurs</p>
                            </div>
                        </div>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="db_requests_per_player" name="DB Req/Player" stroke="#94a3b8" />
                                    <YAxis dataKey="conversion_rate" name="Conversion %" stroke="#94a3b8" />
                                    <ZAxis dataKey="unique_players" range={[100, 1000]} name="Players" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ strokeDasharray: '3 3' }}
                                    />
                                    <Scatter name="Games" data={gameEfficiency} fill="#8b5cf6" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Games by Monetization Efficiency */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Efficacité Monétisation</h3>
                                    <MetricHelp
                                        title="Efficacité Monétisation"
                                        definition="Achats par million d'unités de coût."
                                        usage="Identifie les jeux les plus rentables."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Purchases / Million Cost Units</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gameEfficiency.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" />
                                    <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="purchases_per_million_cost" fill="#10b981" radius={[0, 4, 4, 0]} name="Efficiency" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bandwidth Intensity */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Intensité Bande Passante</h3>
                                    <MetricHelp
                                        title="Intensité Bande Passante"
                                        definition="MB transférés par heure de jeu."
                                        usage="Identifie les jeux gourmands en bande passante."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">MB per Hour</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={bandwidthIntensity} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" />
                                    <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
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
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Alertes Actives</h3>
                                    <MetricHelp
                                        title="Alertes Actives"
                                        definition="Métriques dépassant les seuils définis."
                                        usage="Réagir avant les dépassements de budget."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">7 derniers jours</p>
                            </div>
                            <AlertTriangle className="text-red-400 w-6 h-6" />
                        </div>
                        {alerts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Type</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Valeur</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Seuil</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Dépassement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alerts.map((alert, idx) => (
                                            <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                                <td className="py-3 px-4 text-sm text-white">{new Date(alert.metric_date).toLocaleDateString('fr-FR')}</td>
                                                <td className="py-3 px-4 text-sm text-white">{alert.metric_type}</td>
                                                <td className="py-3 px-4 text-sm text-white text-right">{(alert.total_value || 0).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-sm text-slate-400 text-right">{(alert.threshold || 0).toLocaleString()}</td>
                                                <td className={`py-3 px-4 text-sm font-medium text-right ${alert.overage_percent > 20 ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    +{alert.overage_percent.toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center py-8">Aucune alerte active</p>
                        )}
                    </div>

                    {/* Churn Cost Index */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Churn Cost Index</h3>
                                    <MetricHelp
                                        title="Churn Cost Index"
                                        definition="Coût × Taux d'abandon (jeux coûteux avec fort taux d'exit)."
                                        usage="Priorise les optimisations sur les jeux abandonnés."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Jeux coûteux avec fort taux d'abandon</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={churnCost} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" />
                                    <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="churn_cost_index" fill="#ef4444" radius={[0, 4, 4, 0]} name="Churn Cost" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trends' && (
                <div className="space-y-6">
                    {/* Auth Efficiency */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Sessions par Auth</h3>
                                    <MetricHelp
                                        title="Sessions par Auth"
                                        definition="Nombre moyen de sessions par authentification."
                                        usage="Détecte les anomalies d'authentification (valeur basse = problème)."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Efficacité de l'authentification</p>
                            </div>
                            <Shield className="text-green-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={authChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="sessions_per_auth" stroke="#10b981" name="Sessions/Auth" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Trend Table */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Évolution Quotidienne Détaillée</h3>
                                    <MetricHelp
                                        title="Évolution Quotidienne"
                                        definition="Comparaison jour par jour avec variation en %."
                                        usage="Identifie les pics anormaux de coûts."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Comparaison J vs J-1</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Type</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Valeur</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Précédent</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Différence</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Variation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyTrend.slice(0, 21).map((trend, idx) => (
                                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                            <td className="py-3 px-4 text-sm text-white">{new Date(trend.metric_date).toLocaleDateString('fr-FR')}</td>
                                            <td className="py-3 px-4 text-sm text-white">{trend.metric_type}</td>
                                            <td className="py-3 px-4 text-sm text-white text-right">{(trend.total_value || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-sm text-slate-400 text-right">{trend.previous_value?.toLocaleString() || '-'}</td>
                                            <td className="py-3 px-4 text-sm text-white text-right">{trend.difference?.toLocaleString() || '-'}</td>
                                            <td className={`py-3 px-4 text-sm font-medium text-right ${trend.percent_change === null ? 'text-slate-400' :
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
