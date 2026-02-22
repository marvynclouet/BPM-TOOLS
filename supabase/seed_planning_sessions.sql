-- Script générique : crée des sessions pour les leads clos / acompte réglé.
-- Une session par lead, dates de base (à ajuster si besoin).
-- À exécuter dans Supabase : SQL Editor > New query.

-- Vérifier d'abord les leads éligibles :
-- SELECT id, first_name, last_name, phone, status FROM public.leads WHERE status IN ('clos', 'acompte_regle');

DO $$
DECLARE
  r RECORD;
  start_d TIMESTAMPTZ := '2026-03-02T09:00:00+01:00';  -- à modifier
  end_d   TIMESTAMPTZ := '2026-03-06T18:00:00+01:00';  -- à modifier
  n       INT := 0;
BEGIN
  FOR r IN (
    SELECT id FROM public.leads
    WHERE status IN ('clos', 'acompte_regle')
    ORDER BY last_name
    LIMIT 20
  )
  LOOP
    INSERT INTO public.planning (lead_id, start_date, end_date, created_at, updated_at)
    VALUES (r.id, start_d, end_d, NOW(), NOW());
    n := n + 1;
  END LOOP;

  RAISE NOTICE 'Sessions créées : %', n;
END $$;
