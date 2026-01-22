-- Script pour corriger les RLS policies et permettre la lecture de public.users
-- Ce script doit être exécuté APRÈS la migration initiale

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admin full access" ON public.users;

-- Policy pour permettre aux utilisateurs authentifiés de lire leur propre entrée dans public.users
-- (nécessaire pour que getCurrentUser() fonctionne même si l'utilisateur vient d'être créé)
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy pour permettre aux admins de lire tous les utilisateurs
DROP POLICY IF EXISTS "Admin full access" ON public.users;
CREATE POLICY "Admin full access users" ON public.users 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- S'assurer que les utilisateurs peuvent lire leur propre profil même s'ils ne sont pas encore dans public.users
-- (Cette policy permet à un utilisateur authentifié de vérifier s'il existe dans public.users)
-- Note: Cette policy est déjà couverte par "Users can read own profile" ci-dessus
