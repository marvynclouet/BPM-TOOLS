-- Script pour corriger la récursion infinie dans les RLS policies
-- Le problème : la policy "Admin full access users" vérifie public.users pour savoir si l'utilisateur est admin
-- Mais pour lire public.users, il faut que la policy soit satisfaite → récursion infinie

-- Supprimer toutes les policies existantes sur public.users
DROP POLICY IF EXISTS "Admin full access" ON public.users;
DROP POLICY IF EXISTS "Admin full access users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;

-- Policy simple : permettre à un utilisateur authentifié de lire son propre profil
-- C'est la seule policy nécessaire pour que getCurrentUser() fonctionne
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy pour permettre aux admins de tout faire
-- Mais on ne peut pas vérifier si l'utilisateur est admin depuis public.users (récursion)
-- Donc on utilise une approche différente : permettre la lecture si l'utilisateur existe dans auth.users
-- et laisser la vérification du rôle se faire dans l'application
CREATE POLICY "Authenticated users can read all" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy pour permettre aux admins de modifier (mais on ne peut pas vérifier le rôle sans récursion)
-- Pour l'instant, on permet à l'utilisateur de modifier son propre profil
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy pour permettre l'insertion (nécessaire pour créer des utilisateurs)
-- On permet l'insertion si l'utilisateur est authentifié
CREATE POLICY "Authenticated users can insert" ON public.users
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
