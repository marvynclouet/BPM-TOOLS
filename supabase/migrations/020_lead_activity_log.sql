-- Historique des actions sur les leads (changements de statut, assignation, etc.)

CREATE TABLE IF NOT EXISTS public.lead_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_log_lead_id ON public.lead_activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_log_created_at ON public.lead_activity_log(created_at DESC);

COMMENT ON TABLE public.lead_activity_log IS 'Journal des modifications sur les leads';

ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read activity for accessible leads" ON public.lead_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND (l.closer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'formateur')))
    )
  );

CREATE POLICY "Admin insert activity" ON public.lead_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'closer', 'formateur'))
  );
