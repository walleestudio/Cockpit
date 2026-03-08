-- =============================================================================
-- RGPD — Une seule requête de vérification BDD (Neon)
-- =============================================================================
-- Exécuter dans l'éditeur SQL Neon. Retourne UNE ligne, une colonne "verification"
-- (JSON) avec : colonnes des 4 tables, colonnes email, FK, types user_id,
-- 10 user_id d'exemple, existence des fonctions RGPD, comptages pour un user_id test.
-- Pour les comptages, remplacer 'USER_ID_DE_TEST' ci-dessous par un vrai user_id.
-- =============================================================================

SELECT jsonb_build_object(
  'columns_user_analytics_snapshots', (SELECT COALESCE(jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable) ORDER BY ordinal_position), '[]') FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_analytics_snapshots'),
  'columns_profiles', (SELECT COALESCE(jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable) ORDER BY ordinal_position), '[]') FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles'),
  'columns_comments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable) ORDER BY ordinal_position), '[]') FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments'),
  'columns_comment_reports', (SELECT COALESCE(jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable) ORDER BY ordinal_position), '[]') FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comment_reports'),
  'email_columns', (SELECT COALESCE(jsonb_agg(jsonb_build_object('table_name', table_name, 'column_name', column_name, 'data_type', data_type)), '[]') FROM information_schema.columns WHERE table_schema = 'public' AND column_name ILIKE '%email%'),
  'foreign_keys', (SELECT COALESCE(jsonb_agg(jsonb_build_object('table_name', tc.table_name, 'column', kcu.column_name, 'references', ccu.table_name || '.' || ccu.column_name, 'delete_rule', rc.delete_rule)), '[]') FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name LEFT JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name IN ('user_analytics_snapshots', 'profiles', 'comments', 'comment_reports')),
  'user_id_types', (SELECT COALESCE(jsonb_agg(jsonb_build_object('table_name', table_name, 'data_type', data_type, 'udt_name', udt_name)), '[]') FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('user_analytics_snapshots', 'profiles', 'comments', 'comment_reports') AND column_name = 'user_id'),
  'sample_user_ids', (SELECT COALESCE(jsonb_agg(uid), '[]') FROM (SELECT user_id::text AS uid FROM user_analytics_snapshots WHERE user_id IS NOT NULL LIMIT 10) t),
  'rgpd_functions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('routine_name', routine_name, 'routine_type', routine_type)), '[]') FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('delete_user_data_rgpd', 'export_user_data_rgpd', 'get_user_id_by_email')),
  'counts_for_test_user', (
    SELECT jsonb_build_object(
      'snapshots', (SELECT COUNT(*)::bigint FROM user_analytics_snapshots WHERE user_id::text = 'USER_ID_DE_TEST'),
      'profiles', (SELECT COUNT(*)::bigint FROM profiles WHERE user_id::text = 'USER_ID_DE_TEST'),
      'comments', (SELECT COUNT(*)::bigint FROM comments WHERE user_id::text = 'USER_ID_DE_TEST'),
      'comment_reports', (SELECT COUNT(*)::bigint FROM comment_reports cr JOIN comments c ON c.id = cr.comment_id WHERE c.user_id::text = 'USER_ID_DE_TEST')
    )
  )
) AS verification;
