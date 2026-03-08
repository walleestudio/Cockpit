-- À exécuter dans Neon si verify_user_deleted_rgpd n'existe pas encore

CREATE OR REPLACE FUNCTION verify_user_deleted_rgpd(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    c_snapshots BIGINT;
    c_profiles BIGINT;
    c_comments BIGINT;
    c_comment_reports BIGINT;
    c_users BIGINT;
BEGIN
    IF p_user_id IS NULL OR TRIM(p_user_id) = '' THEN RAISE EXCEPTION 'user_id requis'; END IF;
    v_uid := TRIM(p_user_id)::UUID;
    SELECT COUNT(*) INTO c_snapshots FROM user_analytics_snapshots WHERE user_id = v_uid;
    SELECT COUNT(*) INTO c_profiles FROM profiles WHERE user_id = v_uid;
    SELECT COUNT(*) INTO c_comments FROM comments WHERE user_id = v_uid;
    SELECT COUNT(*) INTO c_comment_reports FROM comment_reports cr JOIN comments c ON c.id = cr.comment_id WHERE c.user_id = v_uid OR cr.user_id = v_uid;
    SELECT COUNT(*) INTO c_users FROM users WHERE user_id = v_uid;
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'checked_at', NOW() AT TIME ZONE 'UTC',
        'counts', jsonb_build_object('user_analytics_snapshots', c_snapshots, 'profiles', c_profiles, 'comments', c_comments, 'comment_reports', c_comment_reports, 'users', c_users),
        'verified', (c_snapshots = 0 AND c_profiles = 0 AND c_comments = 0 AND c_comment_reports = 0 AND c_users = 0)
    );
END;
$$;
