-- Suivi des relances WhatsApp : statut sur le lead + historique des échanges

-- Ajouter le statut de suivi relance sur les leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS relance_status TEXT DEFAULT NULL
  CHECK (relance_status IS NULL OR relance_status IN ('en_attente', 'relance', 'repondu', 'close', 'abandonne'));

CREATE INDEX IF NOT EXISTS idx_leads_relance_status ON public.leads(relance_status);

-- Table historique des échanges WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_exchanges_lead_id ON public.whatsapp_exchanges(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_exchanges_sent_at ON public.whatsapp_exchanges(sent_at DESC);

-- RLS
ALTER TABLE public.whatsapp_exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access whatsapp_exchanges" ON public.whatsapp_exchanges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Closer access own lead exchanges" ON public.whatsapp_exchanges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND (l.closer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'formateur'))
    )
  );
