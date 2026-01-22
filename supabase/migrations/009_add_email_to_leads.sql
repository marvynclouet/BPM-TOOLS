-- Ajouter le champ email à la table leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- Commentaire
COMMENT ON COLUMN public.leads.email IS 'Email de l''élève pour l''envoi de documents et communications';
