-- Ajouter les champs format de formation à la table leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS formation_format TEXT CHECK (formation_format IN ('mensuelle', 'semaine')),
ADD COLUMN IF NOT EXISTS formation_day TEXT, -- 'lundi' à 'vendredi' pour semaine, 'samedi' ou 'dimanche' pour mensuelle
ADD COLUMN IF NOT EXISTS formation_start_date DATE; -- Date de début choisie par le closer

-- Commentaires
COMMENT ON COLUMN public.leads.formation_format IS 'Format de formation: mensuelle (4 samedis/dimanches) ou semaine (lundi-vendredi)';
COMMENT ON COLUMN public.leads.formation_day IS 'Jour de la formation: lundi-vendredi pour semaine, samedi/dimanche pour mensuelle';
COMMENT ON COLUMN public.leads.formation_start_date IS 'Date de début choisie par le closer pour la formation';
