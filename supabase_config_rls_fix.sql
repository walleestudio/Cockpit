-- Copiez tout ce contenu et exécutez-le dans l'éditeur SQL de Supabase

-- 1. Activer RLS sur la table (au cas où)
ALTER TABLE game_configurations ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Enable read access for all users" ON game_configurations;
DROP POLICY IF EXISTS "Enable insert for all users" ON game_configurations;
DROP POLICY IF EXISTS "Enable update for all users" ON game_configurations;
DROP POLICY IF EXISTS "Allow public read access" ON game_configurations;
DROP POLICY IF EXISTS "Allow public write access" ON game_configurations;

-- 3. Créer une politique de LECTURE pour tout le monde (anon + authenticated)
CREATE POLICY "Allow public read access" ON game_configurations
  FOR SELECT
  USING (true);

-- 4. Créer une politique d'ÉCRITURE pour tout le monde (anon + authenticated)
-- Note : C'est nécessaire car votre app utilise la clé 'anon' pour l'instant.
-- En production, vous voudrez peut-être restreindre cela.
CREATE POLICY "Allow public write access" ON game_configurations
  FOR ALL
  USING (true)
  WITH CHECK (true);
