-- Ajout notes et cache dernier message sur leads pour le suivi relances
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS relance_notes TEXT DEFAULT NULL;
