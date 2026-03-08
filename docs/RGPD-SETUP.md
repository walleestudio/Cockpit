# RGPD — Actions à faire

1. **Neon** : exécuter `docs/sql/rgpd_functions.sql` (création des fonctions `delete_user_data_rgpd`, `export_user_data_rgpd`, `get_user_id_by_email`).
2. **Vérification BDD** : exécuter une fois `docs/verification/rgpd-verification-bdd.sql` (une requête ; remplacer `USER_ID_DE_TEST` par un vrai UUID pour les comptages).
3. **Résolution par email** : la table `profiles` a une colonne `email` → la résolution se fait en Neon via `get_user_id_by_email`. L’Edge Function Supabase (`VITE_RGPD_GET_USER_ID_BY_EMAIL_URL`) reste optionnelle (fallback si email absent de `profiles`).
