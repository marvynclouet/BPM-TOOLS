-- Ajouter un champ commentaire à la table leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS comment TEXT;
