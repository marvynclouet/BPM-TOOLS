-- Espace Formateur : champs sur planning + tables attendances / comptes-rendus / évaluations
-- Ne modifie pas les colonnes existantes de planning.

-- 1. Colonnes planning (formateur + paiement session)
ALTER TABLE public.planning
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID')),
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2) NOT NULL DEFAULT 350;

COMMENT ON COLUMN public.planning.trainer_id IS 'Formateur assigné à la session (un seul par session)';
COMMENT ON COLUMN public.planning.payment_status IS 'Statut paiement formateur pour cette session';
COMMENT ON COLUMN public.planning.payment_amount IS 'Montant fixe par session (350€)';

CREATE INDEX IF NOT EXISTS idx_planning_trainer_id ON public.planning(trainer_id);

-- 2. Appel par jour (présent / absent / retard)
CREATE TABLE IF NOT EXISTS public.trainer_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES public.planning(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'retard')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(planning_id, attendance_date, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_attendances_planning ON public.trainer_attendances(planning_id);

-- 3. Compte-rendu par jour
CREATE TABLE IF NOT EXISTS public.trainer_session_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES public.planning(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(planning_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_trainer_session_reports_planning ON public.trainer_session_reports(planning_id);

-- 4. Évaluations (2 par session, par élève : note /5 + commentaire)
CREATE TABLE IF NOT EXISTS public.trainer_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES public.planning(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  evaluation_number SMALLINT NOT NULL CHECK (evaluation_number IN (1, 2)),
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(planning_id, lead_id, evaluation_number)
);

CREATE INDEX IF NOT EXISTS idx_trainer_evaluations_planning ON public.trainer_evaluations(planning_id);

-- RLS : lecture pour formateur (ses sessions) et admin (tout)
ALTER TABLE public.trainer_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_attendances_select" ON public.trainer_attendances FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.planning p
    WHERE p.id = planning_id
    AND (p.trainer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  )
);
CREATE POLICY "trainer_attendances_all_admin" ON public.trainer_attendances FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "trainer_attendances_insert_update_trainer" ON public.trainer_attendances FOR ALL USING (
  EXISTS (SELECT 1 FROM public.planning p WHERE p.id = planning_id AND p.trainer_id = auth.uid())
);

CREATE POLICY "trainer_session_reports_select" ON public.trainer_session_reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.planning p
    WHERE p.id = planning_id
    AND (p.trainer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  )
);
CREATE POLICY "trainer_session_reports_all_admin" ON public.trainer_session_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "trainer_session_reports_insert_update_trainer" ON public.trainer_session_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.planning p WHERE p.id = planning_id AND p.trainer_id = auth.uid())
);

CREATE POLICY "trainer_evaluations_select" ON public.trainer_evaluations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.planning p
    WHERE p.id = planning_id
    AND (p.trainer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  )
);
CREATE POLICY "trainer_evaluations_all_admin" ON public.trainer_evaluations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "trainer_evaluations_insert_update_trainer" ON public.trainer_evaluations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.planning p WHERE p.id = planning_id AND p.trainer_id = auth.uid())
);
