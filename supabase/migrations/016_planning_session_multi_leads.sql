-- Une session de planning peut avoir plusieurs leads.
-- Table de liaison planning_lead (planning_id, lead_id).

-- 1. Créer la table de liaison
CREATE TABLE IF NOT EXISTS public.planning_lead (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES public.planning(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  UNIQUE(planning_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_lead_planning_id ON public.planning_lead(planning_id);
CREATE INDEX IF NOT EXISTS idx_planning_lead_lead_id ON public.planning_lead(lead_id);

COMMENT ON TABLE public.planning_lead IS 'Liens session planning <-> leads (une session peut avoir plusieurs leads)';

-- 2. Migrer les données existantes
INSERT INTO public.planning_lead (planning_id, lead_id)
SELECT id, lead_id FROM public.planning
ON CONFLICT (planning_id, lead_id) DO NOTHING;

-- 3. Supprimer la colonne lead_id de planning
ALTER TABLE public.planning DROP COLUMN IF EXISTS lead_id;

-- RLS (lecture comme pour planning)
ALTER TABLE public.planning_lead ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Formateur read planning_lead" ON public.planning_lead FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'formateur', 'closer'))
);

CREATE POLICY "Admin all planning_lead" ON public.planning_lead FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
