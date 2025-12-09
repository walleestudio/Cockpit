import { useEffect, useState } from 'react'
import { Trash2, Eye, EyeOff, AlertTriangle, RefreshCw } from 'lucide-react'
import { ModerationService, type ReportedComment } from '../services/moderationService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

export default function Moderation() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [comments, setComments] = useState<ReportedComment[]>([])
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [hidingId, setHidingId] = useState<string | null>(null)

    useEffect(() => {
        loadComments()
    }, [])

    const loadComments = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await ModerationService.getReportedComments()
            setComments(data)
        } catch (err) {
            setError('Erreur lors du chargement des commentaires signalés')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (commentId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce commentaire ?')) {
            return
        }

        try {
            setDeletingId(commentId)
            await ModerationService.deleteComment(commentId)
            setComments(comments.filter(c => c.commentaire_id !== commentId))
        } catch (err) {
            alert('Erreur lors de la suppression du commentaire')
            console.error(err)
        } finally {
            setDeletingId(null)
        }
    }

    const handleToggleHide = async (comment: ReportedComment) => {
        try {
            setHidingId(comment.commentaire_id)
            if (comment.est_masque) {
                await ModerationService.unhideComment(comment.commentaire_id)
            } else {
                await ModerationService.hideComment(comment.commentaire_id)
            }
            await loadComments()
        } catch (err) {
            alert('Erreur lors de la modification du commentaire')
            console.error(err)
        } finally {
            setHidingId(null)
        }
    }

    const getStatusColor = (statut: string) => {
        if (statut.includes('🗑️')) return 'text-gray-400'
        if (statut.includes('🚫')) return 'text-orange-400'
        if (statut.includes('⚠️')) return 'text-red-500 font-bold'
        if (statut.includes('🔴')) return 'text-red-400'
        if (statut.includes('🟠')) return 'text-orange-400'
        return 'text-yellow-400'
    }

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Modération des Commentaires</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {comments.length} commentaire{comments.length > 1 ? 's' : ''} signalé{comments.length > 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={loadComments}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    <RefreshCw size={18} />
                    Actualiser
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <AlertTriangle className="text-red-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Critiques</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => c.nombre_signalements_reel >= 5).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                            <AlertTriangle className="text-orange-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Attention</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => c.nombre_signalements_reel >= 2 && c.nombre_signalements_reel < 5).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-500/20 rounded-lg">
                            <EyeOff className="text-slate-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Masqués</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => c.est_masque).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Eye className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Visibles</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => !c.est_masque).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comments Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Statut</th>
                                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Commentaire</th>
                                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Auteur</th>
                                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Jeu</th>
                                <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Signalements</th>
                                <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Date</th>
                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {comments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        Aucun commentaire signalé
                                    </td>
                                </tr>
                            ) : (
                                comments.map((comment) => (
                                    <tr key={comment.commentaire_id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className={`text-sm font-medium ${getStatusColor(comment.statut)}`}>
                                                {comment.statut}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 max-w-md">
                                            <p className="text-sm text-white line-clamp-2" title={comment.contenu_complet}>
                                                {comment.contenu_preview}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                <span>👍 {comment.nombre_likes}</span>
                                                <span>👎 {comment.nombre_dislikes}</span>
                                                <span>💬 {comment.nombre_reponses}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                {comment.avatar_auteur && (
                                                    <img
                                                        src={comment.avatar_auteur}
                                                        alt={comment.auteur}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-sm text-white font-medium">{comment.auteur}</p>
                                                    <p className="text-xs text-slate-400">{comment.auteur_id.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm text-slate-300">{comment.jeu_id}</span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${comment.nombre_signalements_reel >= 10 ? 'bg-red-500/20 text-red-400' :
                                                    comment.nombre_signalements_reel >= 5 ? 'bg-red-500/20 text-red-400' :
                                                        comment.nombre_signalements_reel >= 2 ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {comment.nombre_signalements_reel}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <p className="text-sm text-slate-300">
                                                {new Date(comment.date_dernier_signalement).toLocaleDateString('fr-FR')}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(comment.date_dernier_signalement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleHide(comment)}
                                                    disabled={hidingId === comment.commentaire_id}
                                                    className={`p-2 rounded-lg transition-colors ${comment.est_masque
                                                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                                            : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                                        } disabled:opacity-50`}
                                                    title={comment.est_masque ? 'Afficher' : 'Masquer'}
                                                >
                                                    {hidingId === comment.commentaire_id ? (
                                                        <RefreshCw size={18} className="animate-spin" />
                                                    ) : comment.est_masque ? (
                                                        <Eye size={18} />
                                                    ) : (
                                                        <EyeOff size={18} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(comment.commentaire_id)}
                                                    disabled={deletingId === comment.commentaire_id}
                                                    className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Supprimer définitivement"
                                                >
                                                    {deletingId === comment.commentaire_id ? (
                                                        <RefreshCw size={18} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
