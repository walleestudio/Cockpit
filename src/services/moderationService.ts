import { pool } from '../lib/neon'

export interface ReportedComment {
    commentaire_id: string
    jeu_id: string
    contenu_preview: string
    contenu_complet: string
    auteur: string
    auteur_id: string
    avatar_auteur: string | null
    date_creation_commentaire: string
    date_modification_commentaire: string | null
    date_masquage: string | null
    nombre_likes: number
    nombre_dislikes: number
    nombre_reponses: number
    nombre_signalements_reel: number
    nombre_signalements_cache: number
    statut: string
    est_masque: boolean
    est_supprime: boolean
    date_dernier_signalement: string
    premiers_signalements: Array<{
        user_id: string
        date_signalement: string
    }> | null
}

export class ModerationService {
    static async getReportedComments(): Promise<ReportedComment[]> {
        try {
            const query = `
                SELECT 
                    -- Identifiants
                    c.id as commentaire_id,
                    c.game_id as jeu_id,
                    
                    -- Contenu du commentaire
                    LEFT(c.content, 100) as contenu_preview,
                    c.content as contenu_complet,
                    
                    -- Auteur
                    c.username as auteur,
                    c.user_id as auteur_id,
                    c.user_avatar_url as avatar_auteur,
                    
                    -- Dates
                    c.created_at as date_creation_commentaire,
                    c.updated_at as date_modification_commentaire,
                    c.hidden_at as date_masquage,
                    
                    -- Statistiques
                    c.likes_count as nombre_likes,
                    c.dislikes_count as nombre_dislikes,
                    c.replies_count as nombre_reponses,
                    -- Nombre réel de signalements depuis comment_reports (plus fiable que reports_count)
                    COALESCE(actual_reports_count.count, 0) as nombre_signalements_reel,
                    c.reports_count as nombre_signalements_cache,  -- Valeur du trigger (peut être en retard)
                    
                    -- Statut
                    CASE 
                        WHEN c.is_deleted = TRUE THEN 'Supprimé'
                        WHEN c.is_hidden = TRUE THEN 'Masqué'
                        WHEN COALESCE(actual_reports_count.count, 0) >= 10 THEN 'Auto-masqué'
                        WHEN COALESCE(actual_reports_count.count, 0) >= 5 THEN 'Critique'
                        WHEN COALESCE(actual_reports_count.count, 0) >= 2 THEN 'Attention'
                        ELSE 'Signalé'
                    END as statut,
                    
                    c.is_hidden as est_masque,
                    c.is_deleted as est_supprime,
                    
                    -- Date du dernier signalement
                    MAX(cr.created_at) as date_dernier_signalement,
                    
                    -- Détails des signalements (premiers signalements)
                    (
                        SELECT json_agg(
                            json_build_object(
                                'user_id', cr2.user_id,
                                'date_signalement', cr2.created_at
                            ) ORDER BY cr2.created_at DESC
                        )
                        FROM comment_reports cr2
                        WHERE cr2.comment_id = c.id
                        LIMIT 5
                    ) as premiers_signalements

                FROM comments c
                -- JOIN avec comment_reports pour voir TOUS les commentaires signalés
                INNER JOIN comment_reports cr ON cr.comment_id = c.id
                -- Sous-requête pour compter le nombre réel de signalements
                LEFT JOIN (
                    SELECT comment_id, COUNT(*) as count
                    FROM comment_reports
                    GROUP BY comment_id
                ) actual_reports_count ON actual_reports_count.comment_id = c.id
                WHERE c.is_deleted = FALSE
                GROUP BY 
                    c.id, c.game_id, c.content, c.username, c.user_id, c.user_avatar_url,
                    c.created_at, c.updated_at, c.hidden_at, c.likes_count, c.dislikes_count,
                    c.replies_count, c.reports_count, c.is_hidden, c.is_deleted,
                    actual_reports_count.count
                ORDER BY 
                    actual_reports_count.count DESC NULLS LAST,  -- Plus de signalements en premier
                    MAX(cr.created_at) DESC                      -- Plus récents signalements en premier
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching reported comments:', error)
            throw error
        }
    }

    static async deleteComment(commentId: string): Promise<void> {
        try {
            const query = `
                DELETE FROM comments
                WHERE id = $1
            `
            await pool.query(query, [commentId])
        } catch (error) {
            console.error('Error deleting comment:', error)
            throw error
        }
    }

    static async hideComment(commentId: string): Promise<void> {
        try {
            const query = `
                UPDATE comments
                SET is_hidden = TRUE,
                    hidden_at = NOW()
                WHERE id = $1
            `
            await pool.query(query, [commentId])
        } catch (error) {
            console.error('Error hiding comment:', error)
            throw error
        }
    }

    static async unhideComment(commentId: string): Promise<void> {
        try {
            const query = `
                UPDATE comments
                SET is_hidden = FALSE,
                    hidden_at = NULL
                WHERE id = $1
            `
            await pool.query(query, [commentId])
        } catch (error) {
            console.error('Error unhiding comment:', error)
            throw error
        }
    }
}
