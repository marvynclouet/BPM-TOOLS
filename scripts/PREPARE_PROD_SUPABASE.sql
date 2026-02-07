-- Préparation prod : garder uniquement les 5 leads + tous les users.
-- À exécuter dans Supabase : SQL Editor → New query → Coller tout → Run.
--
-- Si erreur "relation leads does not exist" : les tables n'existent pas encore.
-- Il faut d'abord exécuter les migrations du projet (dossier supabase/migrations)
-- depuis Supabase Dashboard ou avec: supabase db push

-- Vérifier que la table existe (à lancer seul si besoin) :
-- SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'leads';

-- 1) IDs des leads à SUPPRIMER (tous sauf les 5 numéros ci-dessous)
CREATE TEMP TABLE ids_to_delete AS
SELECT l.id
FROM leads l
WHERE l.id NOT IN (
  SELECT ld.id
  FROM (
    SELECT
      id,
      CASE
        WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
             AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '33%'
        THEN right(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
        WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
        THEN right(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
        ELSE regexp_replace(phone, '[^0-9]', '', 'g')
      END AS digits
    FROM leads
  ) ld
  WHERE ld.digits IN ('0627467272', '0769191881', '0623668220', '0767498871', '0686693740')
);

-- 2) Supprimer les données liées
DELETE FROM accounting_entries WHERE lead_id IN (SELECT id FROM ids_to_delete);
DELETE FROM lead_payments WHERE lead_id IN (SELECT id FROM ids_to_delete);
DELETE FROM lead_comments WHERE lead_id IN (SELECT id FROM ids_to_delete);
DELETE FROM documents WHERE lead_id IN (SELECT id FROM ids_to_delete);
DELETE FROM planning WHERE lead_id IN (SELECT id FROM ids_to_delete);
DELETE FROM deals WHERE lead_id IN (SELECT id FROM ids_to_delete);

-- 3) Supprimer les leads
DELETE FROM leads WHERE id IN (SELECT id FROM ids_to_delete);
