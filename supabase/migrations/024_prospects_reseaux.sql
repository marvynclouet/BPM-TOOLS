-- Prospects repérés sur les réseaux sociaux (TikTok, Instagram)
CREATE TABLE IF NOT EXISTS public.social_prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  status TEXT NOT NULL DEFAULT 'repere' CHECK (status IN ('repere', 'contacte', 'a_repondu', 'numero_recupere', 'en_discussion', 'close', 'froid')),
  formation TEXT DEFAULT NULL CHECK (formation IS NULL OR formation IN ('inge_son', 'beatmaking', 'autre')),
  phone TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  profile_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Échanges / DMs avec les prospects
CREATE TABLE IF NOT EXISTS public.social_prospect_exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.social_prospects(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_social_prospects_status ON public.social_prospects(status);
CREATE INDEX IF NOT EXISTS idx_social_prospects_platform ON public.social_prospects(platform);
CREATE INDEX IF NOT EXISTS idx_social_prospect_exchanges_prospect ON public.social_prospect_exchanges(prospect_id);

-- RLS
ALTER TABLE public.social_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_prospect_exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_prospects_all" ON public.social_prospects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "social_prospect_exchanges_all" ON public.social_prospect_exchanges FOR ALL USING (true) WITH CHECK (true);
