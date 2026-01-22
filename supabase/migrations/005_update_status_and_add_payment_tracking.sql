-- Mettre à jour les statuts possibles
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('nouveau', 'appele', 'acompte_regle', 'clos', 'ko'));

-- Table pour suivre les paiements (acompte et solde)
CREATE TABLE IF NOT EXISTS public.lead_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('acompte', 'solde', 'complet')),
  amount DECIMAL(10, 2) NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_lead_payments_lead_id ON public.lead_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_payments_paid_at ON public.lead_payments(paid_at DESC);

-- RLS
ALTER TABLE public.lead_payments ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Authenticated users can read payments" ON public.lead_payments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Authenticated users can create payments" ON public.lead_payments FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
);

-- Table pour les entrées comptables simplifiées (sans passer par deals/payments)
CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.lead_payments(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('acompte', 'solde', 'complet')),
  amount DECIMAL(10, 2) NOT NULL,
  commission_closer DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_formateur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10, 2), -- Reste à payer (si acompte)
  exported BOOLEAN DEFAULT FALSE,
  export_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_accounting_entries_lead_id ON public.accounting_entries(lead_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_exported ON public.accounting_entries(exported);

-- RLS
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Authenticated users can read accounting entries" ON public.accounting_entries FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Authenticated users can create accounting entries" ON public.accounting_entries FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
);
