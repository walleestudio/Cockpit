import { useEffect, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import {
    Activity, Users, DollarSign, TrendingUp, AlertTriangle, Heart, MessageSquare, Bookmark
} from 'lucide-react'
import { AnalyticsService } from '../services/analyticsService'
import type { GameFlowMetrics, SocialMetrics, MonetizationMetrics } from '../services/analyticsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { MetricHelp } from '../components/ui/MetricHelp'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function GameInsights() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'flow' | 'social' | 'monetization'>('flow')

    const [flowMetrics, setFlowMetrics] = useState<GameFlowMetrics[]>([])
    const [socialMetrics, setSocialMetrics] = useState<SocialMetrics[]>([])
    const [monetizationMetrics, setMonetizationMetrics] = useState<MonetizationMetrics | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [flow, social, monetization] = await Promise.all([
                AnalyticsService.getGameFlowMetrics(),
                AnalyticsService.getSocialMetrics(),
                AnalyticsService.getMonetizationMetrics()
            ])
            setFlowMetrics(flow)
            setSocialMetrics(social)
            setMonetizationMetrics(monetization)
        } catch (err) {
            setError('Failed to load insights data')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Game Insights</h1>
                <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('flow')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'flow' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Game Flow
                    </button>
                    <button
                        onClick={() => setActiveTab('social')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'social' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Social & Virality
                    </button>
                    <button
                        onClick={() => setActiveTab('monetization')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'monetization' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Monetization
                    </button>
                </div>
            </div>

            {activeTab === 'flow' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Completion Rate */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Completion Rate</h3>
                                    <MetricHelp
                                        title="Completion Rate"
                                        definition="Pourcentage de tentatives qui atteignent le Top 10."
                                        usage="Indique si le jeu est trop difficile (taux bas) ou trop facile (taux haut)."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Top 10 Attempts / Total Attempts</p>
                            </div>
                            <TrendingUp className="text-green-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flowMetrics} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" unit="%" />
                                    <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="completion_rate_percent" fill="#4ade80" radius={[0, 4, 4, 0]} name="Completion Rate" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Frustration Index */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Frustration Index</h3>
                                    <MetricHelp
                                        title="Frustration Index"
                                        definition="Pourcentage de parties quittées prématurément (Rage Quit)."
                                        usage="Un taux élevé signale un gameplay frustrant ou des bugs bloquants."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Rage Quits (Exits / Launches)</p>
                            </div>
                            <AlertTriangle className="text-red-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flowMetrics} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" unit="%" />
                                    <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="frustration_index_percent" fill="#f87171" radius={[0, 4, 4, 0]} name="Frustration Index" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Intensity */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Game Intensity</h3>
                                    <MetricHelp
                                        title="Game Intensity"
                                        definition="Nombre moyen de swipes par heure de jeu."
                                        usage="Mesure le rythme du jeu. Utile pour équilibrer l'expérience (calme vs intense)."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Swipes per Hour of Gameplay</p>
                            </div>
                            <Activity className="text-blue-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flowMetrics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="game_id" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="intensity_swipes_per_hour" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Swipes/Hour" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'social' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Social Engagement */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Social Engagement Rate</h3>
                                    <MetricHelp
                                        title="Social Engagement Rate"
                                        definition="Moyenne des interactions (Likes + Coms + Shares) par joueur unique."
                                        usage="Identifie les jeux qui créent une communauté et de la viralité."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">(Likes + Comments + Shares) / Unique Players</p>
                            </div>
                            <Heart className="text-pink-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={socialMetrics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="game_id" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="social_engagement_rate" fill="#f472b6" radius={[4, 4, 0, 0]} name="Engagement Rate" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bookmarks */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Total Bookmarks</h3>
                                    <MetricHelp
                                        title="Total Bookmarks"
                                        definition="Nombre total de fois qu'un jeu a été mis en favoris."
                                        usage="Indique les jeux 'Coup de cœur' que les joueurs veulent retrouver."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Games saved by users</p>
                            </div>
                            <Bookmark className="text-yellow-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={socialMetrics} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" />
                                    <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="total_bookmarks" fill="#facc15" radius={[0, 4, 4, 0]} name="Bookmarks" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Comments Ratio */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Comments Ratio</h3>
                                    <MetricHelp
                                        title="Comments Ratio"
                                        definition="Nombre moyen de commentaires par joueur."
                                        usage="Mesure si un jeu suscite des discussions ou des débats."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Comments per Player</p>
                            </div>
                            <MessageSquare className="text-purple-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={socialMetrics} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" />
                                    <YAxis dataKey="game_id" type="category" stroke="#94a3b8" width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="comments_to_players_ratio" fill="#a855f7" radius={[0, 4, 4, 0]} name="Comments/Player" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'monetization' && monetizationMetrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Conversion by Play Time */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Conversion by Play Time</h3>
                                    <MetricHelp
                                        title="Conversion by Play Time"
                                        definition="Taux de conversion en fonction du temps de jeu cumulé avant l'achat."
                                        usage="Permet de savoir à quel moment du cycle de vie un joueur est prêt à payer."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">When do users convert?</p>
                            </div>
                            <DollarSign className="text-green-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monetizationMetrics.conversion_by_play_time}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="hours_range" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" unit="%" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="conversion_rate" fill="#22c55e" radius={[4, 4, 0, 0]} name="Conversion Rate" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Funnel KPIs */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-center items-center relative">
                            <div className="absolute top-4 right-4">
                                <MetricHelp
                                    title="Cart Abandonment"
                                    definition="Pourcentage d'initiations d'achat annulées."
                                    usage="Un taux élevé peut indiquer un prix trop haut ou un processus complexe."
                                />
                            </div>
                            <h3 className="text-slate-400 text-sm font-medium mb-2">Cart Abandonment</h3>
                            <div className="text-3xl font-bold text-red-400">
                                {monetizationMetrics.cart_abandonment_rate}%
                            </div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-center items-center relative">
                            <div className="absolute top-4 right-4">
                                <MetricHelp
                                    title="Pack le Plus Acheté"
                                    definition="Type de pack (produit) le plus fréquemment acheté."
                                    usage="Identifie l'offre la plus populaire auprès de vos utilisateurs payants."
                                />
                            </div>
                            <h3 className="text-slate-400 text-sm font-medium mb-2">Pack le Plus Acheté</h3>
                            <div className="text-2xl font-bold text-green-400">
                                {monetizationMetrics.most_purchased_pack}
                            </div>
                        </div>
                    </div>

                    {/* Purchases by Game */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Top Trigger Games</h3>
                                    <MetricHelp
                                        title="Top Trigger Games"
                                        definition="Jeu le plus joué par les utilisateurs qui finissent par acheter."
                                        usage="Identifie les jeux qui convertissent le mieux les utilisateurs gratuits en payants."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Most played game by purchasers</p>
                            </div>
                            <Users className="text-blue-400 w-6 h-6" />
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
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Purchases by Type */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-white">Purchases by Type</h3>
                                    <MetricHelp
                                        title="Purchases by Type"
                                        definition="Répartition des ventes par type de produit (Pack)."
                                        usage="Permet de voir quel produit est le plus populaire."
                                    />
                                </div>
                                <p className="text-sm text-slate-400">Distribution of product types</p>
                            </div>
                            <DollarSign className="text-purple-400 w-6 h-6" />
                        </div>
                        <div className="h-80">
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
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
