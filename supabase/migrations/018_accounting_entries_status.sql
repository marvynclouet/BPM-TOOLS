-- État des entrées comptables : actif (comptée) ou annulé (exclue des totaux)
ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'actif'
  CHECK (status IN ('actif', 'annulé'));

COMMENT ON COLUMN public.accounting_entries.status IS 'actif = entrée comptée, annulé = entrée exclue des totaux';

-- Politiques pour modifier et supprimer (authenticated users)
DROP POLICY IF EXISTS "Authenticated users can update accounting entries" ON public.accounting_entries;
CREATE POLICY "Authenticated users can update accounting entries" ON public.accounting_entries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete accounting entries" ON public.accounting_entries;
CREATE POLICY "Authenticated users can delete accounting entries" ON public.accounting_entries FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()));
