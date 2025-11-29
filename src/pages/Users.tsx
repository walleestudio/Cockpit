import React, { useEffect, useState } from 'react'
import { Search, Filter, Activity } from 'lucide-react'
import { DataTable } from '../components/ui/DataTable'
import { AnalyticsService, type UserAnalytics } from '../services/analyticsService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { AnalyticsBarChart } from '../components/ui/charts/BarChart'

export const Users: React.FC = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [users, setUsers] = useState<UserAnalytics[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true)
                const data = await AnalyticsService.getUsersAnalytics(100)
                setUsers(data)
            } catch (err) {
                setError('Erreur lors du chargement des utilisateurs')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [])

    const filteredUsers = users.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Distribution des sessions
    const sessionDistribution = [
        { name: '1-5', value: users.filter(u => u.total_sessions <= 5).length },
        { name: '6-20', value: users.filter(u => u.total_sessions > 5 && u.total_sessions <= 20).length },
        { name: '21-50', value: users.filter(u => u.total_sessions > 20 && u.total_sessions <= 50).length },
        { name: '50+', value: users.filter(u => u.total_sessions > 50).length },
    ]

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Utilisateurs</h1>
                    <p className="text-text-muted mt-1">Analyse comportementale et rétention</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un utilisateur..."
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
                            <Activity size={20} className="text-primary" />
                            Distribution des Sessions
                        </h3>
                    </div>
                    <AnalyticsBarChart
                        data={sessionDistribution}
                        dataKey="value"
                        xKey="name"
                        color="#3b82f6"
                        name="Utilisateurs"
                    />
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Métriques Clés</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-sm text-text-muted mb-1">Utilisateurs Actifs</div>
                            <div className="text-2xl font-bold text-white">{users.length}</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-sm text-text-muted mb-1">Moyenne Sessions/User</div>
                            <div className="text-2xl font-bold text-white">
                                {(users.reduce((acc, u) => acc + u.total_sessions, 0) / (users.length || 1)).toFixed(1)}
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-sm text-text-muted mb-1">Taux de Conversion</div>
                            <div className="text-2xl font-bold text-white">
                                {(users.reduce((acc, u) => acc + u.conversion_rate_percent, 0) / (users.length || 1)).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Liste des Utilisateurs</h3>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-muted hover:text-white bg-white/5 rounded-lg transition-colors">
                        <Filter size={16} />
                        Filtres
                    </button>
                </div>
                <DataTable
                    data={filteredUsers}
                    columns={[
                        { key: 'pseudo', label: 'Pseudo', sortable: true },
                        { key: 'user_id', label: 'ID Utilisateur', sortable: true },
                        { key: 'total_sessions', label: 'Sessions', sortable: true },
                        {
                            key: 'total_play_time_hours',
                            label: 'Temps Total',
                            sortable: true,
                            render: (val) => `${Number(val).toFixed(1)} h`
                        },
                        {
                            key: 'avg_session_duration_minutes',
                            label: 'Durée Moyenne',
                            sortable: true,
                            render: (val) => `${Math.round(Number(val))} min`
                        },
                        {
                            key: 'conversion_rate_percent',
                            label: 'Conversion',
                            sortable: true,
                            render: (val) => (
                                <span className={Number(val) > 0 ? 'text-success' : 'text-text-muted'}>
                                    {Number(val).toFixed(1)}%
                                </span>
                            )
                        },
                        {
                            key: 'last_snapshot_date',
                            label: 'Dernière Activité',
                            sortable: true,
                            render: (val) => new Date(val).toLocaleDateString('fr-FR')
                        }
                    ]}
                />
            </div>
        </div>
    )
}
