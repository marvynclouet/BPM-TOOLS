-- Ajouter les champs pour suivre les conversations WhatsApp et les relances
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS whatsapp_conversation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_relance_1_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_relance_2_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_relance_3_at TIMESTAMP WITH TIME ZONE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_started_at ON public.leads(whatsapp_conversation_started_at);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_relances ON public.leads(whatsapp_relance_1_at, whatsapp_relance_2_at, whatsapp_relance_3_at);

-- Commentaires
COMMENT ON COLUMN public.leads.whatsapp_conversation_started_at IS 'Date de début de la conversation WhatsApp';
COMMENT ON COLUMN public.leads.whatsapp_relance_1_at IS 'Date de la première relance (72h après le début)';
COMMENT ON COLUMN public.leads.whatsapp_relance_2_at IS 'Date de la deuxième relance (1 semaine après le début)';
COMMENT ON COLUMN public.leads.whatsapp_relance_3_at IS 'Date de la dernière relance';
