import { pool } from '../lib/neon'

const RGPD_RESOLVE_EMAIL_URL = import.meta.env.VITE_RGPD_GET_USER_ID_BY_EMAIL_URL as string | undefined

/** Comptages par table après suppression (retour JSONB de delete_user_data_rgpd). */
export type DeleteUserDataResult = Record<string, number>

/**
 * Résout l'utilisateur par email ou par user_id.
 * - Si user_id est fourni, il est renvoyé (prioritaire).
 * - Sinon si email est fourni : d'abord Neon (profiles.email via get_user_id_by_email), sinon API optionnelle (Edge Function).
 */
export async function resolveUserId(params: { email?: string; userId?: string }): Promise<string> {
    const { email, userId } = params
    const trimmedId = userId?.trim()
    if (trimmedId) return trimmedId
    if (email?.trim()) {
        const trimmedEmail = email.trim()
        try {
            const { rows } = await pool.query<{ user_id: string }>(
                'SELECT user_id FROM get_user_id_by_email($1)',
                [trimmedEmail]
            )
            const id = rows?.[0]?.user_id?.trim()
            if (id) return id
        } catch {
            /* fonction absente ou pas de ligne */
        }
        const url = RGPD_RESOLVE_EMAIL_URL
        if (url) {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmedEmail })
            })
            if (res.ok) {
                const data = (await res.json()) as { user_id?: string }
                const id = data?.user_id?.trim()
                if (id) return id
            }
        }
        throw new Error(
            'Aucun utilisateur trouvé pour cet email. Vérifiez l\'email ou saisissez l\'identifiant utilisateur.'
        )
    }
    throw new Error('Saisissez l\'email ou l\'identifiant utilisateur')
}

/**
 * Supprime toutes les données d'un utilisateur (RGPD, droit à l'effacement).
 * Appelle la fonction SQL delete_user_data_rgpd.
 * Retourne les comptages par table (format actuel: result.counts, ancien: result à la racine).
 */
export async function deleteUserData(userId: string): Promise<DeleteUserDataResult> {
    const { rows } = await pool.query<{ delete_user_data_rgpd: DeleteUserDataResult & { counts?: DeleteUserDataResult } }>(
        'SELECT delete_user_data_rgpd($1) AS delete_user_data_rgpd',
        [userId.trim()]
    )
    if (!rows?.length || rows[0].delete_user_data_rgpd == null) throw new Error('Aucun résultat retourné par la suppression')
    const raw = rows[0].delete_user_data_rgpd
    return (raw.counts != null ? raw.counts : raw) as DeleteUserDataResult
}

/**
 * Exporte les données personnelles d'un utilisateur (RGPD, droit à la portabilité).
 * Appelle la fonction SQL export_user_data_rgpd et retourne le JSON.
 */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
    const { rows } = await pool.query<{ export_user_data_rgpd: Record<string, unknown> }>(
        'SELECT export_user_data_rgpd($1) AS export_user_data_rgpd',
        [userId.trim()]
    )
    if (!rows?.length || rows[0].export_user_data_rgpd == null) {
        throw new Error('Aucune donnée exportée')
    }
    return rows[0].export_user_data_rgpd as Record<string, unknown>
}

export interface VerifyUserDeletedResult {
    user_id: string
    checked_at: string
    counts: Record<string, number>
    verified: boolean
}

/**
 * Vérifie qu'il ne reste aucune donnée pour cet utilisateur (toutes tables).
 * Optionnel : passer l'email pour inclure rate_limits (identifié par email) dans la vérification.
 */
export async function verifyUserDeleted(userId: string, email?: string): Promise<VerifyUserDeletedResult> {
    const { rows } = await pool.query<{ verify_user_deleted_rgpd: VerifyUserDeletedResult }>(
        email?.trim()
            ? 'SELECT verify_user_deleted_rgpd($1::text, $2::text) AS verify_user_deleted_rgpd'
            : 'SELECT verify_user_deleted_rgpd($1::text) AS verify_user_deleted_rgpd',
        email?.trim() ? [userId.trim(), email.trim()] : [userId.trim()]
    )
    if (!rows?.length || rows[0].verify_user_deleted_rgpd == null) throw new Error('Vérification impossible')
    return rows[0].verify_user_deleted_rgpd
}
