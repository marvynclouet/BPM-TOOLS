-- Ajouter le champ documents_sent_at pour suivre l'envoi des documents
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS documents_sent_at TIMESTAMP WITH TIME ZONE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_leads_documents_sent_at ON public.leads(documents_sent_at);

-- Commentaire
COMMENT ON COLUMN public.leads.documents_sent_at IS 'Date d''envoi des documents (attestation et facture) par email';
