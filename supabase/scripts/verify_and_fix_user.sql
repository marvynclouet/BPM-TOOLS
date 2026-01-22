-- Script complet pour vérifier et créer l'utilisateur admin si nécessaire
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier si l'utilisateur existe dans auth.users
DO $$
DECLARE
  auth_user_id UUID;
  public_user_exists BOOLEAN;
BEGIN
  -- Chercher l'utilisateur dans auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'clouetmarvyn@gmail.com'
  LIMIT 1;

  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Utilisateur clouetmarvyn@gmail.com non trouvé dans auth.users. Créez-le d''abord dans Authentication → Users';
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
    VALUES (auth_user_id, 'clouetmarvyn@gmail.com', 'admin', 'Marvyn')
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
      email = 'clouetmarvyn@gmail.com',
      full_name = 'Marvyn',
      updated_at = NOW()
    WHERE id = auth_user_id;
    
    RAISE NOTICE '✅ Utilisateur mis à jour avec le rôle admin';
  END IF;

  -- Afficher le résultat final
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé :';
  RAISE NOTICE '   UUID: %', auth_user_id;
  RAISE NOTICE '   Email: clouetmarvyn@gmail.com';
  RAISE NOTICE '   Rôle: admin';
  RAISE NOTICE '   Nom: Marvyn';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Vous pouvez maintenant vous connecter !';
END $$;

-- 2. Afficher le résultat final
SELECT 
  au.id as "UUID",
  au.email as "Email (auth.users)",
  pu.email as "Email (public.users)",
  pu.role as "Rôle",
  pu.full_name as "Nom",
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ OK - Prêt pour la connexion'
    ELSE '❌ ERREUR'
  END as "Statut"
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'clouetmarvyn@gmail.com';
