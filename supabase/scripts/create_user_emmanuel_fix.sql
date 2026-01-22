-- Script pour créer/corriger l'utilisateur Emmanuel dans public.users
-- UUID de l'utilisateur : 4341aab8-719d-452c-aeaa-a5ad05d026c4

-- Vérifier d'abord si l'utilisateur existe dans auth.users
SELECT 
  id, 
  email, 
  created_at,
  confirmed_at
FROM auth.users 
WHERE id = '4341aab8-719d-452c-aeaa-a5ad05d026c4';

-- Créer ou mettre à jour l'utilisateur dans public.users
INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
VALUES (
  '4341aab8-719d-452c-aeaa-a5ad05d026c4',
  'emmanuel.kabouh@hotmail.com',
  'admin',
  'Emmanuel',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Vérifier que l'utilisateur a bien été créé
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  u.created_at,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ Utilisateur créé dans public.users'
    ELSE '❌ Erreur'
  END as status
FROM public.users u
WHERE u.id = '4341aab8-719d-452c-aeaa-a5ad05d026c4';

-- Vérification complète : comparer auth.users et public.users
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.confirmed_at as auth_confirmed,
  pu.id as public_id,
  pu.email as public_email,
  pu.role as public_role,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ OK - Utilisateur présent dans les deux tables'
    ELSE '❌ Utilisateur manquant dans public.users'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.id = '4341aab8-719d-452c-aeaa-a5ad05d026c4';
