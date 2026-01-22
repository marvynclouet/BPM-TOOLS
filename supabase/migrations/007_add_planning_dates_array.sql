-- Ajouter un champ pour stocker les dates exactes des formations mensuelles
ALTER TABLE public.planning 
ADD COLUMN IF NOT EXISTS specific_dates DATE[]; -- Tableau des dates exactes (pour format mensuelle: 4 samedis/dimanches)

-- Commentaire
COMMENT ON COLUMN public.planning.specific_dates IS 'Dates exactes des formations (pour format mensuelle: les 4 samedis/dimanches spécifiques)';
