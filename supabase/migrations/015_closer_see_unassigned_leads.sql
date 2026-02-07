-- Les closers doivent voir les leads non assignés (nouveaux) pour pouvoir les récupérer
-- Actuellement ils ne voient que les leads où closer_id = auth.uid()

DROP POLICY IF EXISTS "Closer access own leads" ON public.leads;

CREATE POLICY "Closer access own leads" ON public.leads FOR ALL USING (
  closer_id = auth.uid()
  OR closer_id IS NULL
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'formateur'))
);
