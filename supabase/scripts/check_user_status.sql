-- Script pour vérifier le statut de l'utilisateur
-- Exécutez ce script pour diagnostiquer les problèmes de connexion

-- 1. Vérifier si l'utilisateur existe dans auth.users
SELECT 
  'auth.users' as table_name,
  id,
  email,
  created_at,
  '✅ Existe dans auth.users' as status
FROM auth.users 
WHERE email = 'clouetmarvyn@gmail.com';

-- 2. Vérifier si l'utilisateur existe dans public.users
SELECT 
  'public.users' as table_name,
  id,
  email,
  role,
  full_name,
  created_at,
  CASE 
    WHEN id IS NOT NULL THEN '✅ Existe dans public.users'
    ELSE '❌ N''existe PAS dans public.users'
  END as status
FROM public.users 
WHERE email = 'clouetmarvyn@gmail.com';

-- 3. Vérifier si les UUID correspondent
SELECT 
  au.id as auth_id,
  pu.id as public_id,
  au.email as auth_email,
  pu.email as public_email,
  CASE 
    WHEN au.id = pu.id THEN '✅ UUID correspondent'
    WHEN pu.id IS NULL THEN '❌ Utilisateur manquant dans public.users'
    ELSE '⚠️ UUID ne correspondent pas'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'clouetmarvyn@gmail.com';

-- 4. Vérifier les RLS policies sur public.users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';
