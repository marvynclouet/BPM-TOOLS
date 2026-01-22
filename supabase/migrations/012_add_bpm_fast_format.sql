-- Ajouter le format BPM Fast (2 jours) à la table leads
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_formation_format_check;

ALTER TABLE public.leads
ADD CONSTRAINT leads_formation_format_check 
CHECK (formation_format IN ('mensuelle', 'semaine', 'bpm_fast'));

-- Commentaire
COMMENT ON COLUMN public.leads.formation_format IS 'Format de formation: mensuelle (4 samedis/dimanches), semaine (lundi-vendredi), ou bpm_fast (2 jours consécutifs)';
