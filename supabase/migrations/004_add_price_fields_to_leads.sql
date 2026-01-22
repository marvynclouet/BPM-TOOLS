-- Ajouter les champs prix fixé et prix acompte à la table leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS price_fixed DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_deposit DECIMAL(10, 2);

-- Commentaires pour documentation
COMMENT ON COLUMN public.leads.price_fixed IS 'Prix fixé pour la formation';
COMMENT ON COLUMN public.leads.price_deposit IS 'Prix de l''acompte (si applicable)';
