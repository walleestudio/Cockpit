-- =============================================================================
-- RGPD — Suppression totale et export des données utilisateur (Neon)
-- =============================================================================
-- Conforme droit à l'effacement (Art. 17) et droit à la portabilité (Art. 20).
-- À exécuter après vérification BDD (ex. rgpd-verification-bdd.sql).
--
-- Paramètre principal : p_user_id (TEXT) — UUID utilisateur.
-- Tables traitées (ordre de suppression respectant les FK) :
--   comment_reports, comment_reactions, comments (détachement des réponses puis
--   suppression), scores, likes, bookmarks, profiles, sessions,
--   user_analytics_snapshots, daily_play_time, user_video_progress,
--   auth_audit_log, game_events, cost_metrics, videos,
--   neon_observability_snapshots, rate_limits (par email), users.
--
-- Si une table n'existe pas dans votre schéma, commenter les blocs correspondants
-- dans delete_user_data_rgpd, export_user_data_rgpd et verify_user_deleted_rgpd.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Suppression complète des données d'un utilisateur (droit à l'effacement)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS delete_user_data_rgpd(TEXT);
CREATE OR REPLACE FUNCTION delete_user_data_rgpd(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_email TEXT;
    c_reports BIGINT := 0;
    c_reactions BIGINT := 0;
    c_comments BIGINT := 0;
    c_scores BIGINT := 0;
    c_likes BIGINT := 0;
    c_bookmarks BIGINT := 0;
    c_profiles BIGINT := 0;
    c_sessions BIGINT := 0;
    c_snapshots BIGINT := 0;
    c_daily_play_time BIGINT := 0;
    c_user_video_progress BIGINT := 0;
    c_auth_audit_log BIGINT := 0;
    c_game_events BIGINT := 0;
    c_cost_metrics BIGINT := 0;
    c_videos BIGINT := 0;
    c_neon_observability BIGINT := 0;
    c_rate_limits BIGINT := 0;
    c_users BIGINT := 0;
BEGIN
    IF p_user_id IS NULL OR TRIM(p_user_id) = '' THEN
        RAISE EXCEPTION 'user_id requis';
    END IF;
    v_uid := TRIM(p_user_id)::UUID;

    -- Récupérer l'email avant toute suppression (pour auth_audit_log et rate_limits)
    SELECT email INTO v_email FROM public.users WHERE user_id = v_uid LIMIT 1;

    -- 1) Signalements : par l'utilisateur OU sur ses commentaires
    WITH d AS (
        DELETE FROM public.comment_reports
        WHERE user_id = v_uid
           OR comment_id IN (SELECT id FROM public.comments WHERE user_id = v_uid)
        RETURNING 1
    )
    SELECT COUNT(*)::BIGINT INTO c_reports FROM d;

    -- 2) Réactions sur commentaires (likes/dislikes)
    WITH d AS (DELETE FROM public.comment_reactions WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_reactions FROM d;

    -- 3) Commentaires : détacher les réponses pointant vers les commentaires du user, puis supprimer ses commentaires
    UPDATE public.comments
    SET parent_comment_id = NULL
    WHERE parent_comment_id IN (SELECT id FROM public.comments WHERE user_id = v_uid);
    WITH d AS (DELETE FROM public.comments WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_comments FROM d;

    -- 4) Scores, likes, bookmarks
    WITH d AS (DELETE FROM public.scores WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_scores FROM d;
    WITH d AS (DELETE FROM public.likes WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_likes FROM d;
    WITH d AS (DELETE FROM public.bookmarks WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_bookmarks FROM d;

    -- 5) Profil, sessions
    WITH d AS (DELETE FROM public.profiles WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_profiles FROM d;
    WITH d AS (DELETE FROM public.sessions WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_sessions FROM d;

    -- 6) Analytics et temps de jeu
    WITH d AS (DELETE FROM public.user_analytics_snapshots WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_snapshots FROM d;
    WITH d AS (DELETE FROM public.daily_play_time WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_daily_play_time FROM d;
    WITH d AS (DELETE FROM public.user_video_progress WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_user_video_progress FROM d;

    -- 7) Logs d'audit auth (par user_id et email)
    WITH d AS (
        DELETE FROM public.auth_audit_log
        WHERE user_id = v_uid
           OR (v_email IS NOT NULL AND email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(v_email)))
        RETURNING 1
    )
    SELECT COUNT(*)::BIGINT INTO c_auth_audit_log FROM d;

    -- 8) Événements de jeu, métriques coût, vidéos, observabilité
    WITH d AS (DELETE FROM public.game_events WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_game_events FROM d;
    WITH d AS (DELETE FROM public.cost_metrics WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_cost_metrics FROM d;
    WITH d AS (DELETE FROM public.videos WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_videos FROM d;
    WITH d AS (DELETE FROM public.neon_observability_snapshots WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_neon_observability FROM d;

    -- 9) Rate limits (identifiés par email)
    IF v_email IS NOT NULL AND TRIM(v_email) != '' THEN
        WITH d AS (
            DELETE FROM public.rate_limits
            WHERE LOWER(TRIM(identifier)) = LOWER(TRIM(v_email))
            RETURNING 1
        )
        SELECT COUNT(*)::BIGINT INTO c_rate_limits FROM d;
    END IF;

    -- 10) Compte utilisateur (en dernier)
    WITH d AS (DELETE FROM public.users WHERE user_id = v_uid RETURNING 1)
    SELECT COUNT(*)::BIGINT INTO c_users FROM d;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'deleted_at', NOW() AT TIME ZONE 'UTC',
        'counts', jsonb_build_object(
            'comment_reports', c_reports,
            'comment_reactions', c_reactions,
            'comments', c_comments,
            'scores', c_scores,
            'likes', c_likes,
            'bookmarks', c_bookmarks,
            'profiles', c_profiles,
            'sessions', c_sessions,
            'user_analytics_snapshots', c_snapshots,
            'daily_play_time', c_daily_play_time,
            'user_video_progress', c_user_video_progress,
            'auth_audit_log', c_auth_audit_log,
            'game_events', c_game_events,
            'cost_metrics', c_cost_metrics,
            'videos', c_videos,
            'neon_observability_snapshots', c_neon_observability,
            'rate_limits', c_rate_limits,
            'users', c_users
        )
    );
END;
$$;

COMMENT ON FUNCTION delete_user_data_rgpd(TEXT) IS 'RGPD Art.17: suppression totale des données personnelles d''un utilisateur (ordre FK respecté). Retourne les comptages par table.';

-- -----------------------------------------------------------------------------
-- 2. Export des données d'un utilisateur (droit à la portabilité)
-- -----------------------------------------------------------------------------
-- Exclut : users.password_hash, tokens (email_verification, password_reset),
--          sessions.token
DROP FUNCTION IF EXISTS export_user_data_rgpd(TEXT);
CREATE OR REPLACE FUNCTION export_user_data_rgpd(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_email TEXT;
    result JSONB;
BEGIN
    IF p_user_id IS NULL OR TRIM(p_user_id) = '' THEN
        RAISE EXCEPTION 'user_id requis';
    END IF;
    v_uid := TRIM(p_user_id)::UUID;
    SELECT email INTO v_email FROM public.users WHERE user_id = v_uid LIMIT 1;

    SELECT jsonb_build_object(
        'exported_at', NOW() AT TIME ZONE 'UTC',
        'user_id', p_user_id,
        'comment_reports', (
            SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
            FROM (
                SELECT id, comment_id, user_id, created_at
                FROM public.comment_reports
                WHERE user_id = v_uid
                   OR comment_id IN (SELECT id FROM public.comments WHERE user_id = v_uid)
            ) r
        ),
        'comment_reactions', (
            SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at), '[]'::jsonb)
            FROM public.comment_reactions x
            WHERE x.user_id = v_uid
        ),
        'comments', (
            SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.created_at), '[]'::jsonb)
            FROM public.comments c
            WHERE c.user_id = v_uid
        ),
        'scores', (
            SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.inserted_at), '[]'::jsonb)
            FROM public.scores s
            WHERE s.user_id = v_uid
        ),
        'likes', (
            SELECT COALESCE(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
            FROM public.likes l
            WHERE l.user_id = v_uid
        ),
        'bookmarks', (
            SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
            FROM public.bookmarks b
            WHERE b.user_id = v_uid
        ),
        'profile', (
            SELECT to_jsonb(p)
            FROM (
                SELECT
                    user_id::text,
                    username,
                    email,
                    created_at,
                    updated_at,
                    leaderboard_public,
                    analytics_enabled,
                    ads_consent,
                    last_activity
                FROM public.profiles
                WHERE user_id = v_uid
                LIMIT 1
            ) p
        ),
        'sessions', (
            SELECT COALESCE(jsonb_agg((to_jsonb(s) - 'token') ORDER BY s.created_at), '[]'::jsonb)
            FROM public.sessions s
            WHERE s.user_id = v_uid
        ),
        'user_analytics_snapshots', (
            SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.snapshot_date), '[]'::jsonb)
            FROM public.user_analytics_snapshots s
            WHERE s.user_id = v_uid
        ),
        'daily_play_time', (
            SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
            FROM public.daily_play_time d
            WHERE d.user_id = v_uid
        ),
        'user_video_progress', (
            SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
            FROM public.user_video_progress v
            WHERE v.user_id = v_uid
        ),
        'auth_audit_log', (
            SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at), '[]'::jsonb)
            FROM public.auth_audit_log a
            WHERE a.user_id = v_uid
               OR (v_email IS NOT NULL AND a.email IS NOT NULL AND LOWER(TRIM(a.email)) = LOWER(TRIM(v_email)))
        ),
        'game_events', (
            SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.created_at), '[]'::jsonb)
            FROM public.game_events g
            WHERE g.user_id = v_uid
        ),
        'cost_metrics', (
            SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
            FROM public.cost_metrics m
            WHERE m.user_id = v_uid
        ),
        'videos', (
            SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
            FROM public.videos v
            WHERE v.user_id = v_uid
        ),
        'neon_observability_snapshots', (
            SELECT COALESCE(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
            FROM public.neon_observability_snapshots n
            WHERE n.user_id = v_uid
        ),
        'rate_limits', (
            SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.attempted_at), '[]'::jsonb)
            FROM public.rate_limits r
            WHERE v_email IS NOT NULL AND LOWER(TRIM(r.identifier)) = LOWER(TRIM(v_email))
        ),
        'users', (
            SELECT to_jsonb(u)
            FROM (
                SELECT
                    user_id,
                    email,
                    email_verified,
                    last_sign_in_at,
                    failed_login_attempts,
                    account_locked_until,
                    created_at,
                    updated_at,
                    deleted_at
                FROM public.users
                WHERE user_id = v_uid
                LIMIT 1
            ) u
        )
    ) INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION export_user_data_rgpd(TEXT) IS 'RGPD Art.20: export exhaustif des données personnelles (secrets exclus: password_hash, tokens, sessions.token).';

-- -----------------------------------------------------------------------------
-- 3. Résolution email → user_id (source: users puis profiles)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_user_id_by_email(TEXT);
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS TABLE(user_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        RAISE EXCEPTION 'email requis';
    END IF;
    -- Priorité: users (source de vérité auth), puis profiles en secours
    RETURN QUERY
    SELECT t.uid::text
    FROM (
        SELECT 1 AS ord, u.user_id AS uid
        FROM public.users u
        WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(p_email))
        UNION ALL
        SELECT 2 AS ord, p.user_id AS uid
        FROM public.profiles p
        WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    ) t
    ORDER BY t.ord
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_user_id_by_email(TEXT) IS 'RGPD: retourne le user_id (UUID) associé à un email (source: users, fallback: profiles).';

-- -----------------------------------------------------------------------------
-- 4. Vérification de la suppression complète
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS verify_user_deleted_rgpd(TEXT, TEXT);
CREATE OR REPLACE FUNCTION verify_user_deleted_rgpd(p_user_id TEXT, p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_email TEXT;
    c_comment_reports BIGINT := 0;
    c_comment_reactions BIGINT := 0;
    c_comments BIGINT := 0;
    c_scores BIGINT := 0;
    c_likes BIGINT := 0;
    c_bookmarks BIGINT := 0;
    c_profiles BIGINT := 0;
    c_sessions BIGINT := 0;
    c_snapshots BIGINT := 0;
    c_daily_play_time BIGINT := 0;
    c_user_video_progress BIGINT := 0;
    c_auth_audit_log BIGINT := 0;
    c_game_events BIGINT := 0;
    c_cost_metrics BIGINT := 0;
    c_videos BIGINT := 0;
    c_neon_observability BIGINT := 0;
    c_rate_limits BIGINT := 0;
    c_users BIGINT := 0;
    all_zero BOOLEAN;
BEGIN
    IF p_user_id IS NULL OR TRIM(p_user_id) = '' THEN
        RAISE EXCEPTION 'user_id requis';
    END IF;
    v_uid := TRIM(p_user_id)::UUID;
    v_email := NULLIF(TRIM(COALESCE(p_email, (SELECT email FROM public.users WHERE user_id = v_uid LIMIT 1))), '');

    SELECT COUNT(*)::BIGINT INTO c_comment_reports
    FROM public.comment_reports
    WHERE user_id = v_uid
       OR comment_id IN (SELECT id FROM public.comments WHERE user_id = v_uid);
    SELECT COUNT(*)::BIGINT INTO c_comment_reactions FROM public.comment_reactions WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_comments FROM public.comments WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_scores FROM public.scores WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_likes FROM public.likes WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_bookmarks FROM public.bookmarks WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_profiles FROM public.profiles WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_sessions FROM public.sessions WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_snapshots FROM public.user_analytics_snapshots WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_daily_play_time FROM public.daily_play_time WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_user_video_progress FROM public.user_video_progress WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_auth_audit_log
    FROM public.auth_audit_log
    WHERE user_id = v_uid
       OR (v_email IS NOT NULL AND email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(v_email)));
    SELECT COUNT(*)::BIGINT INTO c_game_events FROM public.game_events WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_cost_metrics FROM public.cost_metrics WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_videos FROM public.videos WHERE user_id = v_uid;
    SELECT COUNT(*)::BIGINT INTO c_neon_observability FROM public.neon_observability_snapshots WHERE user_id = v_uid;
    IF v_email IS NOT NULL THEN
        SELECT COUNT(*)::BIGINT INTO c_rate_limits
        FROM public.rate_limits
        WHERE LOWER(TRIM(identifier)) = LOWER(TRIM(v_email));
    END IF;
    SELECT COUNT(*)::BIGINT INTO c_users FROM public.users WHERE user_id = v_uid;

    all_zero := (
        c_comment_reports = 0 AND c_comment_reactions = 0 AND c_comments = 0
        AND c_scores = 0 AND c_likes = 0 AND c_bookmarks = 0 AND c_profiles = 0
        AND c_sessions = 0 AND c_snapshots = 0 AND c_daily_play_time = 0
        AND c_user_video_progress = 0 AND c_auth_audit_log = 0 AND c_game_events = 0
        AND c_cost_metrics = 0 AND c_videos = 0 AND c_neon_observability = 0
        AND c_users = 0 AND (v_email IS NULL OR c_rate_limits = 0)
    );

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'checked_at', NOW() AT TIME ZONE 'UTC',
        'counts', jsonb_build_object(
            'comment_reports', c_comment_reports,
            'comment_reactions', c_comment_reactions,
            'comments', c_comments,
            'scores', c_scores,
            'likes', c_likes,
            'bookmarks', c_bookmarks,
            'profiles', c_profiles,
            'sessions', c_sessions,
            'user_analytics_snapshots', c_snapshots,
            'daily_play_time', c_daily_play_time,
            'user_video_progress', c_user_video_progress,
            'auth_audit_log', c_auth_audit_log,
            'game_events', c_game_events,
            'cost_metrics', c_cost_metrics,
            'videos', c_videos,
            'neon_observability_snapshots', c_neon_observability,
            'rate_limits', c_rate_limits,
            'users', c_users
        ),
        'verified', all_zero
    );
END;
$$;

COMMENT ON FUNCTION verify_user_deleted_rgpd(TEXT, TEXT) IS 'RGPD: vérifie qu''il ne reste aucune donnée pour ce user_id (p_email optionnel pour rate_limits).';

-- -----------------------------------------------------------------------------
-- Permissions (décommenter et adapter le rôle selon votre setup)
-- -----------------------------------------------------------------------------
-- GRANT EXECUTE ON FUNCTION public.delete_user_data_rgpd(TEXT) TO labjoo_app;
-- GRANT EXECUTE ON FUNCTION public.export_user_data_rgpd(TEXT) TO labjoo_app;
-- GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO labjoo_app;
-- GRANT EXECUTE ON FUNCTION public.verify_user_deleted_rgpd(TEXT, TEXT) TO labjoo_app;

-- =============================================================================
-- Fin du script RGPD
-- =============================================================================
