-- Favoris / épingles : un utilisateur peut marquer des leads comme prioritaires

CREATE TABLE IF NOT EXISTS public.lead_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_favorites_user_id ON public.lead_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_favorites_lead_id ON public.lead_favorites(lead_id);

COMMENT ON TABLE public.lead_favorites IS 'Leads marqués en favori par chaque utilisateur';

ALTER TABLE public.lead_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites" ON public.lead_favorites
  FOR ALL USING (auth.uid() = user_id);
