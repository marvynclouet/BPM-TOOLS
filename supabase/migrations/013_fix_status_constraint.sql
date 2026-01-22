-- Corriger la contrainte de statut pour inclure tous les statuts actuels
-- Cette migration remplace toutes les contraintes précédentes

ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

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

-- Commentaire
COMMENT ON COLUMN public.leads.status IS 'Statut du lead: nouveau (👶), chinois (🇨🇳 parle chinois), rats (🐀 pas de sous), nrp (📞 pas répondu), en_cours_de_closing (👍), acompte_en_cours (💰), appele (📞), acompte_regle (💰), clos (✅), ko (❌)';
