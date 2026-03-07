import { useEffect, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import {
    Activity, Users, DollarSign, TrendingUp, AlertTriangle, Heart, MessageSquare, Bookmark
} from 'lucide-react'
import { AnalyticsService } from '../services/analyticsService'
import type { GameFlowMetrics, SocialMetrics, MonetizationMetrics, ConversionByGame, GameAnalytics } from '../services/analyticsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { MetricHelp } from '../components/ui/MetricHelp'
import { APP_HELP } from '../help/appHelp'
import { ExpandableTable } from '../components/ui/ExpandableTable'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
const CHART_THEME = { surface: '#0A0A0A', border: '#222222', axis: '#71717a' }

export default function GameInsights() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'flow' | 'social' | 'monetization'>('flow')

    const [flowMetrics, setFlowMetrics] = useState<GameFlowMetrics[]>([])
    const [socialMetrics, setSocialMetrics] = useState<SocialMetrics[]>([])
    const [monetizationMetrics, setMonetizationMetrics] = useState<MonetizationMetrics | null>(null)
    const [conversionByGame, setConversionByGame] = useState<ConversionByGame[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [flow, social, monetization, conversionByGameRes, gamesAnalytics] = await Promise.all([
                AnalyticsService.getGameFlowMetrics(),
                AnalyticsService.getSocialMetrics(),
                AnalyticsService.getMonetizationMetrics(),
                AnalyticsService.getConversionByGame(30),
                AnalyticsService.getGamesAnalytics(30)
            ])
            setFlowMetrics(flow)
            setSocialMetrics(mergeSocialWithGames(social, gamesAnalytics))
            setMonetizationMetrics(monetization)
            setConversionByGame(conversionByGameRes)
        } catch (err) {
            setError('Erreur lors du chargement des insights')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    /** Fusionne social + games pour que Favoris / Aimés affichent les totaux même si getSocialMetrics ne les a pas */
    function mergeSocialWithGames(social: SocialMetrics[], games: GameAnalytics[]): SocialMetrics[] {
        const byGame = new Map(social.map(s => [s.game_id, { ...s }]))
        for (const g of games) {
            const bookmarks = Number(g.total_bookmarks ?? g.net_bookmarks ?? 0)
            const likes = Number(g.total_likes ?? g.net_likes ?? 0)
            if (bookmarks === 0 && likes === 0) continue
            const row = byGame.get(g.game_id)
            if (row) {
                if ((Number(row.total_bookmarks) || 0) < bookmarks) row.total_bookmarks = bookmarks
                if ((Number(row.total_likes) || 0) < likes) row.total_likes = likes
            } else {
                byGame.set(g.game_id, {
                    game_id: g.game_id,
                    social_engagement_rate: 0,
                    total_bookmarks: bookmarks,
                    total_likes: likes,
                    comments_to_players_ratio: 0
                })
            }
        }
        return Array.from(byGame.values())
    }

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Insights Jeux</h1>
                    <p className="text-text-muted mt-1">Parcours, social et monétisation par jeu</p>
                </div>
                <div className="flex gap-2 bg-surface border border-border p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('flow')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'flow' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                    >
                        Parcours jeu
                    </button>
                    <button
                        onClick={() => setActiveTab('social')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'social' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                    >
                        Social & viralité
                    </button>
                    <button
                        onClick={() => setActiveTab('monetization')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'monetization' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                    >
                        Monétisation
                    </button>
                </div>
            </div>

            {activeTab === 'flow' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Completion Rate */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Taux de complétion</h3>
                                    <MetricHelp content={APP_HELP['insights-completion-rate']} />
                                </div>
                                <p className="text-sm text-text-muted">Tentatives Top 10 / Tentatives totales</p>
                            </div>
                            <TrendingUp size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flowMetrics} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis type="number" stroke={CHART_THEME.axis} unit="%" />
                                    <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="completion_rate_percent" fill="#4ade80" radius={[0, 4, 4, 0]} name="Taux complétion" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Frustration Index */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Indice de frustration</h3>
                                    <MetricHelp content={APP_HELP['insights-frustration-index']} />
                                </div>
                                <p className="text-sm text-text-muted">Abandons (Sorties / Lancements)</p>
                            </div>
                            <AlertTriangle size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flowMetrics} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis type="number" stroke={CHART_THEME.axis} unit="%" />
                                    <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="frustration_index_percent" fill="#f87171" radius={[0, 4, 4, 0]} name="Indice frustration" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Intensity */}
                    <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Intensité jeu</h3>
                                    <MetricHelp content={APP_HELP['insights-game-intensity']} />
                                </div>
                                <p className="text-sm text-text-muted">Swipes par heure de jeu</p>
                            </div>
                            <Activity size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flowMetrics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis dataKey="game_id" stroke={CHART_THEME.axis} />
                                    <YAxis stroke={CHART_THEME.axis} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="intensity_swipes_per_hour" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Swipes/h" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'social' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Social Engagement */}
                    <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Taux d'engagement social</h3>
                                    <MetricHelp content={APP_HELP['insights-social-engagement']} />
                                </div>
                                <p className="text-sm text-text-muted">(Likes + Commentaires + Partages) / Joueurs uniques</p>
                            </div>
                            <Heart size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={socialMetrics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis dataKey="game_id" stroke={CHART_THEME.axis} />
                                    <YAxis stroke={CHART_THEME.axis} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="social_engagement_rate" fill="#f472b6" radius={[4, 4, 0, 0]} name="Taux engagement" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bookmarks — nuage de noms par favoris */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Favoris totaux</h3>
                                    <MetricHelp content={APP_HELP['insights-total-bookmarks']} />
                                </div>
                                <p className="text-sm text-text-muted">Nuage de jeux — taille = nombre de favoris</p>
                            </div>
                            <Bookmark size={20} className="text-primary" />
                        </div>
                        <div className="h-80 overflow-auto">
                            {(() => {
                                const withBookmarks = socialMetrics.filter(d => (Number(d.total_bookmarks) || 0) > 0)
                                const maxB = Math.max(1, ...withBookmarks.map(d => Number(d.total_bookmarks) || 0))
                                const minSize = 12
                                const maxSize = 26
                                return (
                                    <div className="flex flex-wrap gap-x-4 gap-y-3 content-center justify-center items-center min-h-[280px] p-4">
                                        {withBookmarks.length === 0 ? (
                                            <p className="text-text-muted text-sm">Aucun favori sur la période</p>
                                        ) : (
                                            withBookmarks.map((d) => {
                                                const v = Number(d.total_bookmarks) || 0
                                                const size = minSize + (v / maxB) * (maxSize - minSize)
                                                return (
                                                    <span
                                                        key={d.game_id}
                                                        className="text-primary/90 hover:text-primary font-medium transition-colors"
                                                        style={{ fontSize: `${size}px` }}
                                                        title={`${d.game_id} : ${v} favori(s)`}
                                                    >
                                                        {d.game_id.replace(/_/g, ' ')}
                                                    </span>
                                                )
                                            })
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Aimés totaux — nuage de noms par likes */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Aimés totaux</h3>
                                    <MetricHelp content={APP_HELP['insights-total-likes']} />
                                </div>
                                <p className="text-sm text-text-muted">Nuage de jeux — taille = nombre de likes</p>
                            </div>
                            <Heart size={20} className="text-primary" />
                        </div>
                        <div className="h-80 overflow-auto">
                            {(() => {
                                const withLikes = socialMetrics.filter(d => (Number(d.total_likes) || 0) > 0)
                                const maxL = Math.max(1, ...withLikes.map(d => Number(d.total_likes) || 0))
                                const minSize = 12
                                const maxSize = 26
                                return (
                                    <div className="flex flex-wrap gap-x-4 gap-y-3 content-center justify-center items-center min-h-[280px] p-4">
                                        {withLikes.length === 0 ? (
                                            <p className="text-text-muted text-sm">Aucun like sur la période</p>
                                        ) : (
                                            withLikes.map((d) => {
                                                const v = Number(d.total_likes) || 0
                                                const size = minSize + (v / maxL) * (maxSize - minSize)
                                                return (
                                                    <span
                                                        key={d.game_id}
                                                        className="text-primary/90 hover:text-primary font-medium transition-colors"
                                                        style={{ fontSize: `${size}px` }}
                                                        title={`${d.game_id} : ${v} like(s)`}
                                                    >
                                                        {d.game_id.replace(/_/g, ' ')}
                                                    </span>
                                                )
                                            })
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Top 10 par likes — tableau à côté des nuages */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Heart size={20} className="text-primary" />
                                Top 10 — J'aime
                            </h3>
                        </div>
                        <ExpandableTable
                            data={[...socialMetrics]
                                .filter(d => (Number(d.total_likes) || 0) > 0)
                                .sort((a, b) => (Number(b.total_likes) || 0) - (Number(a.total_likes) || 0))
                                .map((d, i) => ({
                                    rank: i + 1,
                                    game_id: d.game_id.replace(/_/g, ' '),
                                    total_likes: Number(d.total_likes) || 0
                                }))}
                            defaultVisible={10}
                            columns={[
                                { key: 'rank', label: '#', sortable: true },
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                { key: 'total_likes', label: "J'aime", sortable: true }
                            ]}
                        />
                    </div>

                    {/* Top 10 par favoris — tableau à côté des nuages */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Bookmark size={20} className="text-primary" />
                                Top 10 — Favoris
                            </h3>
                        </div>
                        <ExpandableTable
                            data={[...socialMetrics]
                                .filter(d => (Number(d.total_bookmarks) || 0) > 0)
                                .sort((a, b) => (Number(b.total_bookmarks) || 0) - (Number(a.total_bookmarks) || 0))
                                .map((d, i) => ({
                                    rank: i + 1,
                                    game_id: d.game_id.replace(/_/g, ' '),
                                    total_bookmarks: Number(d.total_bookmarks) || 0
                                }))}
                            defaultVisible={10}
                            columns={[
                                { key: 'rank', label: '#', sortable: true },
                                { key: 'game_id', label: 'Jeu', sortable: true },
                                { key: 'total_bookmarks', label: 'Favoris', sortable: true }
                            ]}
                        />
                    </div>

                    {/* Comments Ratio */}
                    <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Ratio commentaires</h3>
                                    <MetricHelp content={APP_HELP['insights-comments-ratio']} />
                                </div>
                                <p className="text-sm text-text-muted">Commentaires par joueur</p>
                            </div>
                            <MessageSquare size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={socialMetrics} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis type="number" stroke={CHART_THEME.axis} />
                                    <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="comments_to_players_ratio" fill="#a855f7" radius={[0, 4, 4, 0]} name="Commentaires/joueur" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'monetization' && monetizationMetrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Conversion by Play Time */}
                    <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Conversion par temps de jeu</h3>
                                    <MetricHelp content={APP_HELP['insights-conversion-by-play-time']} />
                                </div>
                                <p className="text-sm text-text-muted">À quel moment les joueurs convertissent ?</p>
                            </div>
                            <DollarSign size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monetizationMetrics.conversion_by_play_time}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                    <XAxis dataKey="hours_range" stroke={CHART_THEME.axis} />
                                    <YAxis stroke={CHART_THEME.axis} unit="%" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="conversion_rate" fill="#22c55e" radius={[4, 4, 0, 0]} name="Taux conversion" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Funnel KPIs */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-center items-center relative">
                            <div className="absolute top-4 right-4">
                                <MetricHelp content={APP_HELP['insights-cart-abandonment']} />
                            </div>
                            <h3 className="text-text-muted text-sm font-medium mb-2">Abandon de panier</h3>
                            <div className="text-3xl font-bold text-red-400">
                                {monetizationMetrics.cart_abandonment_rate}%
                            </div>
                        </div>
                        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-center items-center relative">
                            <div className="absolute top-4 right-4">
                                <MetricHelp content={APP_HELP['insights-pack-plus-achete']} />
                            </div>
                            <h3 className="text-text-muted text-sm font-medium mb-2">Pack le Plus Acheté</h3>
                            <div className="text-2xl font-bold text-green-400">
                                {monetizationMetrics.most_purchased_pack}
                            </div>
                            {monetizationMetrics.most_purchased_pack === 'Non renseigné' && (
                                <p className="text-xs text-text-muted mt-2 text-center">
                                    `purchaseTypes` est vide dans les snapshots.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Conversion par jeu */}
                    {conversionByGame.length > 0 && (
                        <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <div className="flex items-center">
                                        <h3 className="text-lg font-semibold text-white">Conversion par jeu</h3>
                                        <MetricHelp content={APP_HELP['insights-conversion-par-jeu']} />
                                    </div>
                                    <p className="text-sm text-text-muted">% acheteurs parmi les joueurs du jeu (30 j)</p>
                                </div>
                                <Users size={20} className="text-primary" />
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={conversionByGame.slice(0, 15)} layout="vertical" margin={{ left: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} />
                                        <XAxis type="number" stroke={CHART_THEME.axis} unit="%" />
                                        <YAxis dataKey="game_id" type="category" stroke={CHART_THEME.axis} width={75} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="conversion_rate_percent" fill="#22c55e" radius={[0, 4, 4, 0]} name="Conversion %" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Purchases by Game */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Jeux déclencheurs</h3>
                                    <MetricHelp content={APP_HELP['insights-top-trigger-games']} />
                                </div>
                                <p className="text-sm text-text-muted">Jeu le plus joué par les acheteurs</p>
                            </div>
                            <Users size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={monetizationMetrics.purchases_by_game}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="purchase_count"
                                        nameKey="game_id"
                                    >
                                        {monetizationMetrics.purchases_by_game.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Purchases by Type */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Achats par type</h3>
                                    <MetricHelp content={APP_HELP['insights-purchases-by-type']} />
                                </div>
                                <p className="text-sm text-text-muted">Répartition des types de produits</p>
                            </div>
                            <DollarSign size={20} className="text-primary" />
                        </div>
                        <div className="h-80">
                            {monetizationMetrics.purchases_by_type.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={monetizationMetrics.purchases_by_type}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#82ca9d"
                                            dataKey="count"
                                            nameKey="product_id"
                                        >
                                            {monetizationMetrics.purchases_by_type.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: CHART_THEME.surface, borderColor: CHART_THEME.border }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center">
                                    <p className="text-text-muted text-sm">
                                        Donnée indisponible : purchaseTypes est vide sur la période.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
