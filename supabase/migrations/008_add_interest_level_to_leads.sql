-- Ajouter le champ taux d'intérêt à la table leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS interest_level TEXT CHECK (interest_level IN ('froid', 'moyen', 'chaud'));

-- Commentaire
COMMENT ON COLUMN public.leads.interest_level IS 'Niveau d''intérêt du lead: froid, moyen, chaud';
