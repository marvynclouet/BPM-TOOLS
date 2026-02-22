-- Cache des rapports IA pour éviter les requêtes Groq inutiles

CREATE TABLE IF NOT EXISTS public.ai_report_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL,
  report_key TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_type, report_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_report_cache_lookup ON public.ai_report_cache(report_type, report_key);
CREATE INDEX IF NOT EXISTS idx_ai_report_cache_created_at ON public.ai_report_cache(created_at DESC);

COMMENT ON TABLE public.ai_report_cache IS 'Cache des rapports générés par IA (évite les appels Groq répétés)';

ALTER TABLE public.ai_report_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend can manage report cache" ON public.ai_report_cache
  FOR ALL USING (true) WITH CHECK (true);
