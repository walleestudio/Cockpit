import React, { useEffect, useState } from 'react'
import { Gamepad2, Search, Filter } from 'lucide-react'
import { ExpandableTable } from '../components/ui/ExpandableTable'
import { MetricHelp } from '../components/ui/MetricHelp'
import { AnalyticsService, type GameAnalytics } from '../services/analyticsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { AnalyticsBarChart } from '../components/ui/charts/BarChart'
import { APP_HELP } from '../help/appHelp'

export const Games: React.FC = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [games, setGames] = useState<GameAnalytics[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchGames = async () => {
            try {
                setLoading(true)
                const data = await AnalyticsService.getGamesAnalytics(30)
                setGames(data)
            } catch (err) {
                setError('Erreur lors du chargement des jeux')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchGames()
    }, [])

    const filteredGames = games.filter(game =>
        game.game_id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Valeurs d'affichage Likes / Favoris (totaux enrichis ou deltas), pour que le tableau ait toujours des clés fiables
    const gamesForTable = filteredGames.map(g => ({
        ...g,
        display_likes: Number(g.total_likes ?? g.net_likes ?? 0),
        display_bookmarks: Number(g.total_bookmarks ?? g.net_bookmarks ?? 0)
    }))

    const topGamesByPlayTime = [...games]
        .sort((a, b) => b.total_play_time_hours - a.total_play_time_hours)
        .slice(0, 5)
        .map(g => ({
            name: g.game_id,
            value: Math.round(g.total_play_time_hours)
        }))

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Jeux</h1>
                    <p className="text-text-muted mt-1">Performances détaillées par jeu</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un jeu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Gamepad2 size={20} className="text-primary" />
                            Top 5 - Temps de Jeu (heures)
                            <MetricHelp content={APP_HELP['games-top5-temps-jeu']} />
                        </h3>
                    </div>
                    <AnalyticsBarChart
                        data={topGamesByPlayTime}
                        dataKey="value"
                        xKey="name"
                        color="#3b82f6"
                        name="Heures"
                    />
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">Statistiques Globales</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-sm text-text-muted mb-1 flex items-center gap-1">
                                Total Jeux Actifs
                                <MetricHelp content={APP_HELP['games-total-jeux-actifs']} />
                            </div>
                            <div className="text-2xl font-bold text-white">{games.length}</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-sm text-text-muted mb-1 flex items-center gap-1">
                                Temps Moyen / Session
                                <MetricHelp content={APP_HELP['games-temps-moyen-session']} />
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {(games.reduce((acc, g) => acc + g.avg_play_time_minutes, 0) / (games.length || 1)).toFixed(1)} min
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-sm text-text-muted mb-1 flex items-center gap-1">
                                Taux de Rétention
                                <MetricHelp content={APP_HELP['games-taux-retention']} />
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {(100 - (games.reduce((acc, g) => acc + g.exit_rate_percent, 0) / (games.length || 1))).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        Liste des Jeux
                        <MetricHelp content={APP_HELP['games-liste-jeux']} />
                    </h3>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-muted hover:text-white bg-white/5 rounded-lg transition-colors">
                        <Filter size={16} />
                        Filtres
                    </button>
                </div>
                <ExpandableTable
                    data={gamesForTable}
                    defaultVisible={10}
                    columns={[
                        { key: 'game_id', label: 'Jeu', sortable: true },
                        { key: 'unique_players', label: 'Joueurs', sortable: true },
                        { key: 'total_launches', label: 'Lancements', sortable: true },
                        {
                            key: 'launches_per_player',
                            label: 'Lanc./joueur',
                            sortable: true,
                            render: (val) => (val != null ? Number(val).toFixed(1) : '–')
                        },
                        {
                            key: 'avg_play_time_minutes',
                            label: 'Temps Moyen',
                            sortable: true,
                            render: (val) => `${Math.round(Number(val))} min`
                        },
                        {
                            key: 'share_rate',
                            label: 'Partage/joueur',
                            sortable: true,
                            render: (val) => (val != null ? Number(val).toFixed(2) : '–')
                        },
                        {
                            key: 'exit_rate_percent',
                            label: 'Taux de Sortie',
                            sortable: true,
                            render: (val) => (
                                <span className={Number(val) > 50 ? 'text-red-500' : 'text-success'}>
                                    {Number(val).toFixed(1)}%
                                </span>
                            )
                        },
                        {
                            key: 'display_likes',
                            label: 'Likes',
                            sortable: true,
                            render: (val) => (val != null ? Number(val) : '–')
                        },
                        {
                            key: 'display_bookmarks',
                            label: 'Favoris',
                            sortable: true,
                            render: (val) => (val != null ? Number(val) : '–')
                        },
                        { key: 'total_shares', label: 'Partages', sortable: true },
                        {
                            key: 'total_leaderboard_views',
                            label: 'Vues leaderboard',
                            sortable: true,
                            render: (val) => (val != null ? Number(val) : '–')
                        },
                        {
                            key: 'total_score_saves',
                            label: 'Sauvegardes score',
                            sortable: true,
                            render: (val) => (val != null ? Number(val) : '–')
                        }
                    ]}
                />
            </div>
        </div>
    )
}
