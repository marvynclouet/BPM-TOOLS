# Migration : Ajouter le champ specific_dates au planning

## ⚠️ IMPORTANT - Cette migration est nécessaire

L'erreur `Could not find the 'specific_dates' column` indique que cette migration n'a pas été exécutée.

## Exécuter la migration

1. Allez dans votre **Supabase Dashboard**
2. Ouvrez le **SQL Editor**
3. Exécutez le script `supabase/migrations/007_add_planning_dates_array.sql`

```sql
-- Ajouter un champ pour stocker les dates exactes des formations mensuelles
ALTER TABLE public.planning 
ADD COLUMN IF NOT EXISTS specific_dates DATE[]; -- Tableau des dates exactes (pour format mensuelle: 4 samedis/dimanches)

-- Commentaire
COMMENT ON COLUMN public.planning.specific_dates IS 'Dates exactes des formations (pour format mensuelle: les 4 samedis/dimanches spécifiques)';
```

## Pourquoi cette migration ?

Sans cette colonne :
- ❌ Le format mensuelle affichera la formation sur TOUS les jours entre le premier et le dernier samedi/dimanche
- ✅ Avec cette colonne : Seulement les 4 samedis/dimanches spécifiques seront affichés

## Après la migration

1. Les nouvelles entrées de planning utiliseront `specific_dates`
2. Le calendrier n'affichera que les jours spécifiques pour le format mensuelle
3. Le format semaine continuera de fonctionner normalement

---

**Exécutez cette migration pour corriger l'affichage du calendrier mensuelle !** ✅
