import React, { useEffect, useState } from 'react'
import { History, TrendingUp } from 'lucide-react'
import { AnalyticsLineChart } from '../components/ui/charts/LineChart'
import { AnalyticsService, type DailyMetrics } from '../services/analyticsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { DateRangePicker } from '../components/ui/DateRangePicker'

export const Timeline: React.FC = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [metrics, setMetrics] = useState<DailyMetrics[]>([])
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    })

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true)
                const data = await AnalyticsService.getDailyMetrics(30)
                setMetrics(data)
            } catch (err) {
                setError('Erreur lors du chargement des données temporelles')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchMetrics()
    }, [dateRange])

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    const chartData = metrics.map(m => ({
        date: new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        players: m.unique_players,
        sessions: m.total_sessions,
        playtime: Math.round(m.total_play_time_hours)
    })).reverse()

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Analyse Temporelle</h1>
                    <p className="text-text-muted mt-1">Évolution des métriques clés</p>
                </div>
                <DateRangePicker
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onChange={(start, end) => setDateRange({ start, end })}
                />
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp size={20} className="text-primary" />
                            Joueurs Uniques & Sessions
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
                            <History size={20} className="text-purple-500" />
                            Temps de Jeu (Heures)
                        </h3>
                    </div>
                    <AnalyticsLineChart
                        data={chartData}
                        dataKey="playtime"
                        xKey="date"
                        color="#a855f7"
                        name="Heures"
                    />
                </div>
            </div>
        </div>
    )
}
