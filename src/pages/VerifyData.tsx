import React, { useEffect, useState } from 'react'
import { CheckCircle2, Copy, AlertCircle } from 'lucide-react'
import { AnalyticsService } from '../services/analyticsService'
import { CostMetricsService } from '../services/costMetricsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

const DAYS_KPI = 7
const DAYS_DAILY = 30
const DAYS_GAMES = 30

export const VerifyData: React.FC = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [payload, setPayload] = useState<{
        kpis: unknown
        dailyMetrics: unknown
        games: unknown
        promotedGames: unknown
        sessionDurationDistribution: unknown
        conversionByGame: unknown
        costOverview: unknown
        fetchedAt: string
    } | null>(null)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true)
                setError(null)
                const [kpis, dailyMetrics, games, promotedGames, sessionDurationDistribution, conversionByGame, costOverview] = await Promise.all([
                    AnalyticsService.getKPIs(DAYS_KPI),
                    AnalyticsService.getDailyMetrics(DAYS_DAILY),
                    AnalyticsService.getGamesAnalytics(DAYS_GAMES),
                    AnalyticsService.getPromotedGames(DAYS_DAILY, 10),
                    AnalyticsService.getSessionDurationDistribution(DAYS_DAILY),
                    AnalyticsService.getConversionByGame(DAYS_DAILY),
                    CostMetricsService.getCostOverview(DAYS_KPI).catch(() => null)
                ])
                setPayload({
                    kpis,
                    dailyMetrics,
                    games: (games || []).slice(0, 15),
                    promotedGames,
                    sessionDurationDistribution,
                    conversionByGame: (conversionByGame || []).slice(0, 15),
                    costOverview,
                    fetchedAt: new Date().toISOString()
                })
            } catch (err) {
                setError('Erreur lors du chargement des données de vérification')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    const json = payload ? JSON.stringify(payload, null, 2) : ''

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-white">Vérification des données Cockpit</h1>
                <p className="text-sm text-text-muted">
                    Données brutes renvoyées par les mêmes services que le Dashboard, Timeline, Games et Cost.
                    Comparez avec l’écran correspondant (période : KPIs/Cost {DAYS_KPI} j, Daily/Games {DAYS_DAILY} j).
                </p>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-amber-200">
                    <strong>Usage :</strong> Vérifiez que les valeurs ci-dessous correspondent à ce que vous voyez
                    sur le Dashboard (4 KPIs), Timeline (courbes par jour), Games (tableau), Cost & Performance (Overview).
                    Si tout est cohérent, les métriques sont bien récupérées.
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-text-muted">
                    Récupéré à {payload?.fetchedAt ? new Date(payload.fetchedAt).toLocaleString('fr-FR') : '-'}
                </span>
                <button
                    type="button"
                    onClick={() => copyToClipboard(json)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors"
                >
                    <Copy size={16} />
                    Copier tout le JSON
                </button>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 overflow-auto">
                <pre className="text-xs text-text-primary whitespace-pre-wrap font-mono break-all">
                    {json}
                </pre>
            </div>

            <div className="flex items-center gap-2 text-sm text-text-muted">
                <CheckCircle2 size={18} className="text-success" />
                <span>
                    KPIs = Dashboard (7 j). dailyMetrics = Timeline / Export (30 j). games = Games / Dashboard tableau (30 j, 15 premiers).
                    costOverview = Cost & Performance Overview (7 j).
                </span>
            </div>
        </div>
    )
}
