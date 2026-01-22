-- Table pour les commentaires multiples sur les leads
CREATE TABLE IF NOT EXISTS public.lead_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON public.lead_comments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_user_id ON public.lead_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_created_at ON public.lead_comments(created_at DESC);

-- RLS
ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

-- Policies RLS
-- Tout utilisateur authentifié peut lire les commentaires des leads
CREATE POLICY "Authenticated users can read comments" ON public.lead_comments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
);

-- Tout utilisateur authentifié peut créer des commentaires
CREATE POLICY "Authenticated users can create comments" ON public.lead_comments FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) AND
  user_id = auth.uid()
);

-- Admin peut modifier/supprimer tous les commentaires
CREATE POLICY "Admin can manage all comments" ON public.lead_comments FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
