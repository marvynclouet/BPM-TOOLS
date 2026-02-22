# Correction du schéma Planning – à exécuter UNE FOIS

## Problème

Le planning affichait "0 participant" car :
- Le code lit les liens dans `planning_lead`
- Ta base n’a pas la table `planning_lead` OU elle est vide
- Les liens étaient dans `planning.lead_id`, mais le code ne lisait pas cette colonne

## Solution (exécuter dans Supabase SQL Editor)

**Étape 1** – Créer `planning_lead` si elle n’existe pas :

```sql
CREATE TABLE IF NOT EXISTS public.planning_lead (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES public.planning(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  UNIQUE(planning_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_lead_planning_id ON public.planning_lead(planning_id);
CREATE INDEX IF NOT EXISTS idx_planning_lead_lead_id ON public.planning_lead(lead_id);

ALTER TABLE public.planning_lead ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Formateur read planning_lead" ON public.planning_lead;
CREATE POLICY "Formateur read planning_lead" ON public.planning_lead FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'formateur', 'closer'))
);

DROP POLICY IF EXISTS "Admin all planning_lead" ON public.planning_lead;
CREATE POLICY "Admin all planning_lead" ON public.planning_lead FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
```

**Étape 2** – Migrer les liens depuis `planning.lead_id` (si la colonne existe) :

```sql
INSERT INTO public.planning_lead (planning_id, lead_id)
SELECT id, lead_id FROM public.planning
WHERE lead_id IS NOT NULL
ON CONFLICT (planning_id, lead_id) DO NOTHING;
```

Si l’erreur `column "lead_id" does not exist` apparaît, passe directement à l’étape 3.

**Étape 3** – Optionnel : supprimer `lead_id` de `planning` pour aligner le schéma :

```sql
ALTER TABLE public.planning DROP COLUMN IF EXISTS lead_id;
```

---

## À partir de maintenant

- **"Ajouter une session"** crée les liens dans `planning_lead`
- La page Planning lit dans `planning_lead` (et en fallback dans `planning.lead_id` si besoin)
- Plus besoin de toucher à ce schéma ensuite
