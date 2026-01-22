-- Script SQL simple pour créer l'utilisateur admin Emmanuel
-- 
-- ⚠️ IMPORTANT : Ce script suppose que l'utilisateur existe déjà dans auth.users
-- 
-- Si l'utilisateur n'existe pas encore dans auth.users :
-- 1. Allez dans Supabase Dashboard → Authentication → Users
-- 2. Cliquez sur "Add user" → "Create new user"
-- 3. Email : emmanuel.kabouh@hotmail.com
-- 4. Password : azerty123
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
  'emmanuel.kabouh@hotmail.com',
  'admin',
  'Emmanuel'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Option 2 : Si vous ne connaissez pas l'UUID, utilisez cette requête pour le trouver
-- Exécutez d'abord cette requête pour trouver l'UUID :
-- SELECT id, email FROM auth.users WHERE email = 'emmanuel.kabouh@hotmail.com';
