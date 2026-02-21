-- Script pour créer les sessions de formation (sans table planning_lead).
-- Une ligne planning par participant, mêmes dates = même session (l'app les regroupe à l'affichage).
-- À exécuter dans le SQL Editor Supabase : Dashboard > SQL Editor > New query, coller et Run.
-- Les leads sont identifiés par téléphone (chiffres) ou email.

DO $$
DECLARE
  lid UUID;
  start_1 TIMESTAMPTZ := '2026-02-23T09:00:00+01:00';
  end_1   TIMESTAMPTZ := '2026-02-27T18:00:00+01:00';
  start_2 TIMESTAMPTZ := '2026-03-16T09:00:00+01:00';
  end_2   TIMESTAMPTZ := '2026-03-20T18:00:00+01:00';
  start_3 TIMESTAMPTZ := '2026-03-02T09:00:00+01:00';
  end_3   TIMESTAMPTZ := '2026-03-06T18:00:00+01:00';
  start_4 TIMESTAMPTZ := '2026-03-01T09:00:00+01:00';
  end_4   TIMESTAMPTZ := '2026-03-22T18:00:00+01:00';
  spec_4  DATE[] := ARRAY['2026-03-01'::date, '2026-03-08'::date, '2026-03-15'::date, '2026-03-22'::date];
BEGIN
  -- Session 1 : 23-27 févr. 2026 (Wahid, Mathieu Bassiste) — 1 ligne planning par lead
  FOR lid IN (
    SELECT id FROM public.leads
    WHERE regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%49078581%' OR email = 'Mathieulopa@gmail.com'
  )
  LOOP
    INSERT INTO public.planning (lead_id, start_date, end_date, created_at, updated_at)
    VALUES (lid, start_1, end_1, NOW(), NOW());
  END LOOP;

  -- Session 2 : 16-20 mars 2026 (Calvin)
  FOR lid IN (SELECT id FROM public.leads WHERE regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%602416904%' LIMIT 1)
  LOOP
    INSERT INTO public.planning (lead_id, start_date, end_date, created_at, updated_at)
    VALUES (lid, start_2, end_2, NOW(), NOW());
    EXIT;
  END LOOP;

  -- Session 3 : 02-06 mars 2026 (Charles Roselet)
  FOR lid IN (
    SELECT id FROM public.leads
    WHERE regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%615651763%'
       OR regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%151651763%'
    LIMIT 1
  )
  LOOP
    INSERT INTO public.planning (lead_id, start_date, end_date, created_at, updated_at)
    VALUES (lid, start_3, end_3, NOW(), NOW());
    EXIT;
  END LOOP;

  -- Session 4 : Mensuelle 01, 08, 15, 22 mars 2026 (Jay, Dyksa, Diana, Mayline)
  FOR lid IN (
    SELECT id FROM public.leads
    WHERE regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%635472640%'
       OR regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%665344865%'
       OR regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%623668220%'
       OR regexp_replace(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%608990568%'
  )
  LOOP
    INSERT INTO public.planning (lead_id, start_date, end_date, specific_dates, created_at, updated_at)
    VALUES (lid, start_4, end_4, spec_4, NOW(), NOW());
  END LOOP;
END $$;
