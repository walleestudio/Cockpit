import React, { useState } from 'react'
import { ShieldAlert, Trash2, Download, Mail, Key, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { resolveUserId, deleteUserData, exportUserData, verifyUserDeleted, type VerifyUserDeletedResult } from '../services/dataPrivacyService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

/** Formate une erreur catchée pour affichage et investigation dans la console admin. */
function formatErrorForAdmin(err: unknown): { message: string; details: string } {
    const msg = err instanceof Error ? err.message : String(err)
    const parts: string[] = []
    if (err && typeof err === 'object') {
        const o = err as Record<string, unknown>
        if (typeof o.detail === 'string') parts.push(`detail: ${o.detail}`)
        if (typeof o.code === 'string') parts.push(`code: ${o.code}`)
        if (typeof o.hint === 'string') parts.push(`hint: ${o.hint}`)
        if (typeof o.where === 'string') parts.push(`where: ${o.where}`)
    }
    const isBusinessError = /Aucun utilisateur trouvé|Saisissez|Vérifiez|user_id requis|Identifiant manquant|Résolution par email|Réponse invalide|Vérification impossible|Aucune donnée|Aucun résultat retourné/i.test(msg)
    if (err instanceof Error && err.stack && !isBusinessError) parts.push(`stack: ${err.stack}`)
    const details = parts.length ? parts.join('\n') : ''
    return { message: msg, details }
}

export const DataPrivacy: React.FC = () => {
    const [email, setEmail] = useState('')
    const [userId, setUserId] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [errorDetails, setErrorDetails] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null)
    const [deleteResult, setDeleteResult] = useState<string | null>(null)
    const [verifyResult, setVerifyResult] = useState<VerifyUserDeletedResult | null>(null)

    const hasInput = Boolean(email.trim() || userId.trim())

    const handleResolveAndDelete = async () => {
        if (!hasInput) {
            setError('Saisissez l’email ou l’identifiant utilisateur.')
            return
        }
        setError(null)
        setErrorDetails(null)
        setSuccess(null)
        setLoading(true)
        try {
            const resolvedId = await resolveUserId({ email: email.trim() || undefined, userId: userId.trim() || undefined })
            setPendingDeleteUserId(resolvedId)
            setConfirmDeleteOpen(true)
        } catch (err) {
            const { message, details } = formatErrorForAdmin(err)
            setError(message)
            setErrorDetails(details)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmDelete = async () => {
        const id = pendingDeleteUserId?.trim()
        if (!id) {
            setError('Identifiant manquant.')
            return
        }
        setError(null)
        setErrorDetails(null)
        setSuccess(null)
        setLoading(true)
        try {
            const result = await deleteUserData(id)
            setDeleteResult(
                Object.entries(result)
                    .map(([table, count]) => `${table}: ${count}`)
                    .join(', ')
            )
            setSuccess('Données supprimées avec succès.')
            setPendingDeleteUserId(null)
            setConfirmDeleteOpen(false)
            setEmail('')
            setUserId('')
        } catch (err) {
            const { message, details } = formatErrorForAdmin(err)
            setError(message)
            setErrorDetails(details)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async () => {
        if (!hasInput) {
            setError('Saisissez l’email ou l’identifiant utilisateur.')
            return
        }
        setError(null)
        setErrorDetails(null)
        setSuccess(null)
        setLoading(true)
        try {
            const resolvedId = await resolveUserId({ email: email.trim() || undefined, userId: userId.trim() || undefined })
            const data = await exportUserData(resolvedId)
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `export_rgpd_${resolvedId}_${new Date().toISOString().slice(0, 10)}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            setSuccess('Export téléchargé.')
        } catch (err) {
            const { message, details } = formatErrorForAdmin(err)
            setError(message)
            setErrorDetails(details)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        if (!hasInput) {
            setError('Saisissez l\'email ou l\'identifiant utilisateur.')
            return
        }
        setError(null)
        setErrorDetails(null)
        setSuccess(null)
        setVerifyResult(null)
        setLoading(true)
        try {
            const resolvedId = await resolveUserId({ email: email.trim() || undefined, userId: userId.trim() || undefined })
            const result = await verifyUserDeleted(resolvedId, email.trim() || undefined)
            setVerifyResult(result)
        } catch (err) {
            const { message, details } = formatErrorForAdmin(err)
            setError(message)
            setErrorDetails(details)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const closeConfirmModal = () => {
        if (!loading) {
            setConfirmDeleteOpen(false)
            setPendingDeleteUserId(null)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                    <ShieldAlert size={28} className="text-primary" />
                    Données personnelles (RGPD)
                </h1>
                <p className="text-text-muted mt-1">
                    Export ou suppression des données d’un joueur — identification par email ou par identifiant.
                </p>
            </div>

            {error && (
                <div className="space-y-2">
                    <ErrorAlert message={error} />
                    {errorDetails && (
                        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                            <p className="text-xs font-medium text-red-400/80 mb-2">Détails pour investigation</p>
                            <pre className="text-xs text-text-muted whitespace-pre-wrap break-all font-mono overflow-x-auto max-h-48 overflow-y-auto">
                                {errorDetails}
                            </pre>
                        </div>
                    )}
                </div>
            )}
            {success && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3 text-green-400">
                    <span>{success}</span>
                    {deleteResult && <span className="text-sm text-text-muted">({deleteResult})</span>}
                </div>
            )}

            <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">Identifier le joueur</h2>
                <p className="text-sm text-text-muted">
                    Saisir l’email <strong>ou</strong> l’identifiant utilisateur (UUID). Si les deux sont renseignés, l’identifiant est utilisé.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="email"
                                placeholder="joueur@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Identifiant utilisateur (UUID)</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="text"
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full bg-white/5 border border-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-primary font-mono text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Download size={20} className="text-primary" />
                        Export des données
                    </h3>
                    <p className="text-sm text-text-muted mb-4">
                        Télécharge un fichier JSON contenant les données personnelles du joueur (profil, activité, commentaires).
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={loading || !hasInput}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                        {loading ? <LoadingSpinner /> : <Download size={18} />}
                        Exporter les données
                    </button>
                </div>

                <div className="bg-surface border border-red-500/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Trash2 size={20} className="text-red-400" />
                        Suppression des données
                    </h3>
                    <p className="text-sm text-text-muted mb-4">
                        Supprime définitivement toutes les données de ce joueur (analytics, profil, commentaires). Conforme au droit à l’effacement.
                    </p>
                    <button
                        onClick={handleResolveAndDelete}
                        disabled={loading || !hasInput}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 font-medium rounded-lg border border-red-500/30 transition-colors"
                    >
                        {loading ? <LoadingSpinner /> : <Trash2 size={18} />}
                        Supprimer toutes les données
                    </button>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-primary" />
                    Vérifier la suppression
                </h3>
                <p className="text-sm text-text-muted mb-4">
                    Vérifie qu’il ne reste aucune donnée pour ce joueur (profil, email, analytics, commentaires, compte de connexion).
                </p>
                <button
                    onClick={handleVerify}
                    disabled={loading || !hasInput}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg border border-border transition-colors"
                >
                    {loading ? <LoadingSpinner /> : <CheckCircle2 size={18} />}
                    Vérifier la suppression complète
                </button>
                {verifyResult && (
                    <div className={`mt-4 p-4 rounded-lg text-sm ${verifyResult.verified ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                        {verifyResult.verified ? (
                            <p className="font-medium">Aucune donnée restante pour cet utilisateur.</p>
                        ) : (
                            <>
                                <p className="font-medium mb-2">Données encore présentes :</p>
                                <ul className="list-disc list-inside">
                                    {Object.entries(verifyResult.counts)
                                        .filter(([, n]) => Number(n) > 0)
                                        .map(([table, n]) => (
                                            <li key={table}>{table} : {n}</li>
                                        ))}
                                </ul>
                            </>
                        )}
                        <p className="text-text-muted mt-2 text-xs">Vérifié à {new Date(verifyResult.checked_at).toLocaleString('fr-FR')}</p>
                    </div>
                )}
            </div>

            {confirmDeleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeConfirmModal}>
                    <div
                        className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 text-amber-400 mb-4">
                            <AlertTriangle size={24} />
                            <span className="font-semibold text-white">Confirmer la suppression</span>
                        </div>
                        <p className="text-text-muted text-sm mb-6">
                            Êtes-vous sûr de vouloir supprimer définitivement toutes les données de l’utilisateur <strong className="text-white font-mono">{pendingDeleteUserId}</strong> ? Cette action est irréversible.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closeConfirmModal}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg border border-border text-text-muted hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? <LoadingSpinner /> : 'Confirmer la suppression'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
