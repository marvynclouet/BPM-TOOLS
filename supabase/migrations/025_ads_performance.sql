-- Rapports publicitaires (Cowork, manuels, etc.)
CREATE TABLE IF NOT EXISTS public.ads_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL CHECK (source IN ('tiktok', 'meta', 'instagram', 'google', 'autre')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  recommendations TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campagnes Meta Ads
CREATE TABLE IF NOT EXISTS public.ads_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta', 'tiktok', 'google', 'autre')),
  budget NUMERIC(10,2) DEFAULT 0,
  spent NUMERIC(10,2) DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  cpl NUMERIC(10,2) DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  date_start DATE DEFAULT NULL,
  date_end DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats TikTok (vidéos / contenus)
CREATE TABLE IF NOT EXISTS public.ads_tiktok_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_title TEXT NOT NULL,
  video_url TEXT DEFAULT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  leads_estimated INTEGER DEFAULT 0,
  post_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ads_reports_source ON public.ads_reports(source);
CREATE INDEX IF NOT EXISTS idx_ads_reports_date ON public.ads_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_status ON public.ads_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ads_tiktok_date ON public.ads_tiktok_stats(post_date);

-- RLS
ALTER TABLE public.ads_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_tiktok_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_reports_all" ON public.ads_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ads_campaigns_all" ON public.ads_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ads_tiktok_stats_all" ON public.ads_tiktok_stats FOR ALL USING (true) WITH CHECK (true);
