-- Rendre lead_id nullable si la colonne existe encore (au cas où 016 n'a pas été appliquée ou DROP a échoué).
-- Les nouvelles sessions utilisent planning_lead ; lead_id n'est plus requis.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planning' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE public.planning ALTER COLUMN lead_id DROP NOT NULL;
  END IF;
END $$;
