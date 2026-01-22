-- Script pour créer l'utilisateur admin Emmanuel
-- Exécutez ce script dans Supabase SQL Editor

-- IMPORTANT: Vous devez d'abord créer l'utilisateur dans Supabase Authentication
-- Allez dans Authentication → Users → Add user
-- Email: emmanuel.kabouh@hotmail.com
-- Password: azerty123
-- Ensuite, exécutez ce script pour l'ajouter à la table public.users avec le rôle admin

DO $$
DECLARE
  auth_user_id UUID;
  public_user_exists BOOLEAN;
BEGIN
  -- Chercher l'utilisateur dans auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'emmanuel.kabouh@hotmail.com'
  LIMIT 1;

  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Utilisateur emmanuel.kabouh@hotmail.com non trouvé dans auth.users. Créez-le d''abord dans Authentication → Users → Add user avec le mot de passe azerty123';
  END IF;

  RAISE NOTICE '✅ Utilisateur trouvé dans auth.users avec UUID: %', auth_user_id;

  -- Vérifier si l'utilisateur existe dans public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE id = auth_user_id
  ) INTO public_user_exists;

  IF NOT public_user_exists THEN
    RAISE NOTICE '⚠️ Utilisateur n''existe pas dans public.users. Création en cours...';
    
    -- Créer l'utilisateur dans public.users
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (auth_user_id, 'emmanuel.kabouh@hotmail.com', 'admin', 'Emmanuel')
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Utilisateur créé dans public.users avec succès !';
  ELSE
    RAISE NOTICE '✅ Utilisateur existe déjà dans public.users';
    
    -- Mettre à jour pour s'assurer que le rôle est admin
    UPDATE public.users
    SET 
      role = 'admin',
      email = 'emmanuel.kabouh@hotmail.com',
      full_name = 'Emmanuel',
      updated_at = NOW()
    WHERE id = auth_user_id;
    
    RAISE NOTICE '✅ Utilisateur mis à jour avec le rôle admin';
  END IF;

  -- Afficher le résultat final
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé :';
  RAISE NOTICE '   UUID: %', auth_user_id;
  RAISE NOTICE '   Email: emmanuel.kabouh@hotmail.com';
  RAISE NOTICE '   Rôle: admin';
  RAISE NOTICE '   Nom: Emmanuel';
  RAISE NOTICE '   Mot de passe: azerty123';
  RAISE NOTICE '';
  RAISE NOTICE '✅ L''utilisateur peut maintenant se connecter !';
END $$;
