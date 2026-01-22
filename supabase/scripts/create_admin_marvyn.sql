-- Script pour créer le compte admin "Marvyn"
-- 
-- ⚠️ IMPORTANT : Ce script suppose que l'utilisateur existe déjà dans auth.users
-- 
-- Si l'utilisateur n'existe pas encore dans auth.users :
-- 1. Allez dans Supabase Dashboard → Authentication → Users
-- 2. Cliquez sur "Add user" → "Create new user"
-- 3. Email : clouetmarvyn@gmail.com
-- 4. Password : (choisissez un mot de passe)
-- 5. Auto Confirm User : ✅ Cochez
-- 6. Cliquez sur "Create user"
-- 7. Copiez l'UUID de l'utilisateur créé
-- 8. Remplacez 'USER_UUID_ICI' ci-dessous par cet UUID
-- 9. Exécutez ce script

-- Option 1 : Si vous connaissez l'UUID de l'utilisateur
-- Remplacez 'USER_UUID_ICI' par l'UUID réel
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'USER_UUID_ICI',  -- ⚠️ REMPLACEZ par l'UUID de l'utilisateur dans auth.users
  'clouetmarvyn@gmail.com',
  'admin',
  'Marvyn'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Option 2 : Si vous ne connaissez pas l'UUID, utilisez cette requête pour le trouver
-- Exécutez d'abord cette requête pour trouver l'UUID :
-- SELECT id, email FROM auth.users WHERE email = 'clouetmarvyn@gmail.com';

-- Option 3 : Créer automatiquement si l'utilisateur existe dans auth.users
-- (Remplacez 'USER_UUID_ICI' par l'UUID trouvé avec la requête ci-dessus)
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Chercher l'utilisateur dans auth.users
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'clouetmarvyn@gmail.com'
  LIMIT 1;

  -- Si l'utilisateur existe, l'insérer dans public.users
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (user_uuid, 'clouetmarvyn@gmail.com', 'admin', 'Marvyn')
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
    
    RAISE NOTICE 'Utilisateur admin créé avec succès ! UUID: %', user_uuid;
  ELSE
    RAISE EXCEPTION 'Utilisateur clouetmarvyn@gmail.com non trouvé dans auth.users. Créez-le d''abord dans Authentication → Users';
  END IF;
END $$;
