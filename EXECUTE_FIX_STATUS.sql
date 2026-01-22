-- ⚠️ URGENT : Exécutez ce script dans Supabase SQL Editor pour corriger l'erreur
-- Copiez-collez ce code dans Supabase Dashboard → SQL Editor → New Query

-- Supprimer l'ancienne contrainte
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

-- Ajouter la nouvelle contrainte avec TOUS les statuts
ALTER TABLE public.leads
ADD CONSTRAINT leads_status_check 
CHECK (status IN (
  'nouveau', 
  'chinois', 
  'rats', 
  'nrp', 
  'en_cours_de_closing', 
  'acompte_en_cours',
  'appele', 
  'acompte_regle', 
  'clos', 
  'ko'
));

-- Mettre à jour le commentaire
COMMENT ON COLUMN public.leads.status IS 'Statut du lead: nouveau (👶), chinois (🇨🇳 parle chinois), rats (🐀 pas de sous), nrp (📞 pas répondu), en_cours_de_closing (👍), acompte_en_cours (💰), appele (📞), acompte_regle (💰), clos (✅), ko (❌)';

-- Vérifier que ça a fonctionné
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.leads'::regclass 
AND conname = 'leads_status_check';
