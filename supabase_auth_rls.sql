-- =====================================================
-- Mise à jour des politiques RLS pour game_configurations
-- PROMPT-2025-01-31-XX — Politique hybride : Lecture publique + Écriture authentifiée
-- =====================================================
-- 
-- OBJECTIF :
-- - Labjoo (app mobile) : Peut LIRE les configurations (sans authentification)
-- - App admin (autre app) : Peut LIRE et MODIFIER les configurations (avec authentification)
--
-- =====================================================

-- 1. Supprimer les anciennes politiques (si elles existent)
DROP POLICY IF EXISTS "Allow public read access" ON game_configurations;
DROP POLICY IF EXISTS "Allow public write access" ON game_configurations;
DROP POLICY IF EXISTS "Allow authenticated read access" ON game_configurations;
DROP POLICY IF EXISTS "Allow authenticated write access" ON game_configurations;
DROP POLICY IF EXISTS "Allow admin write access" ON game_configurations;

-- 2. Créer une politique de LECTURE PUBLIQUE (pour Labjoo)
-- Cette politique permet à tous les utilisateurs (connectés ou non) de LIRE les configurations
CREATE POLICY "Allow public read access" ON game_configurations
    FOR SELECT
    USING (true);

-- 3. Créer une politique d'ÉCRITURE pour les utilisateurs AUTHENTIFIÉS (pour l'app admin)
-- Cette politique permet uniquement aux utilisateurs connectés de MODIFIER les configurations
CREATE POLICY "Allow authenticated write access" ON game_configurations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" ON game_configurations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access" ON game_configurations
    FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Vérifier que RLS est activé
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'game_configurations' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE game_configurations ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS activé sur game_configurations';
    ELSE
        RAISE NOTICE 'RLS déjà activé sur game_configurations';
    END IF;
END $$;

-- Afficher les politiques créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'game_configurations'
ORDER BY policyname;
