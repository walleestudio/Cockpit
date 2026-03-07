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
        if (statut === 'Supprimé') return 'text-text-muted'
        if (statut === 'Masqué') return 'text-text-secondary'
        if (statut === 'Auto-masqué') return 'text-red-500 font-bold'
        if (statut === 'Critique') return 'text-red-400'
        if (statut === 'Attention') return 'text-text-secondary'
        return 'text-primary'
    }

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Modération des Commentaires</h1>
                    <p className="text-text-muted mt-1">
                        {comments.length} commentaire{comments.length > 1 ? 's' : ''} signalé{comments.length > 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={loadComments}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors border border-transparent"
                >
                    <RefreshCw size={18} />
                    Actualiser
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-surface border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <AlertTriangle className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-text-muted">Critiques</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => c.nombre_signalements_reel >= 5).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <AlertTriangle className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-text-muted">Attention</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => c.nombre_signalements_reel >= 2 && c.nombre_signalements_reel < 5).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <EyeOff className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-text-muted">Masqués</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => c.est_masque).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Eye className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-text-muted">Visibles</p>
                            <p className="text-xl font-bold text-white">
                                {comments.filter(c => !c.est_masque).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comments Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surface-highlight">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-medium text-text-muted">Statut</th>
                                <th className="text-left py-4 px-6 text-sm font-medium text-text-muted">Commentaire</th>
                                <th className="text-left py-4 px-6 text-sm font-medium text-text-muted">Auteur</th>
                                <th className="text-left py-4 px-6 text-sm font-medium text-text-muted">Jeu</th>
                                <th className="text-center py-4 px-6 text-sm font-medium text-text-muted">Signalements</th>
                                <th className="text-center py-4 px-6 text-sm font-medium text-text-muted">Date</th>
                                <th className="text-right py-4 px-6 text-sm font-medium text-text-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {comments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        Aucun commentaire signalé
                                    </td>
                                </tr>
                            ) : (
                                comments.map((comment) => (
                                    <tr key={comment.commentaire_id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className={`text-sm font-medium ${getStatusColor(comment.statut)}`}>
                                                {comment.statut}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 max-w-md">
                                            <p className="text-sm text-white line-clamp-2" title={comment.contenu_complet}>
                                                {comment.contenu_preview}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
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
                                                    <p className="text-xs text-text-muted">{comment.auteur_id.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm text-text-secondary">{comment.jeu_id}</span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${comment.nombre_signalements_reel >= 5 ? 'bg-red-500/20 text-red-400' :
                                                comment.nombre_signalements_reel >= 2 ? 'bg-white/20 text-primary' :
                                                    'bg-white/10 text-text-muted'
                                                }`}>
                                                {comment.nombre_signalements_reel}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <p className="text-sm text-white">
                                                {new Date(comment.date_dernier_signalement).toLocaleDateString('fr-FR')}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                {new Date(comment.date_dernier_signalement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleHide(comment)}
                                                    disabled={hidingId === comment.commentaire_id}
                                                    className={`p-2 rounded-lg transition-colors ${comment.est_masque
                                                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                                        : 'bg-white/20 text-text-secondary hover:bg-white/30'
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
                                                    className="p-2 bg-white/20 text-red-400 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
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
