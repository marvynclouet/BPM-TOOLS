-- Étiquette de financement sur les leads (CPF, Pôle Emploi, AFDAS...)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS financement TEXT DEFAULT NULL
CHECK (financement IN ('cpf', 'pole_emploi', 'afdas', 'opco', 'autre'));

CREATE INDEX IF NOT EXISTS idx_leads_financement ON public.leads(financement) WHERE financement IS NOT NULL;
