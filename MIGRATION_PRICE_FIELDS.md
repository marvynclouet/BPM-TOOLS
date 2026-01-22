# Migration : Ajouter les champs prix fixé et prix acompte

## Exécuter la migration

1. Allez dans votre **Supabase Dashboard**
2. Ouvrez le **SQL Editor**
3. Exécutez le script `supabase/migrations/004_add_price_fields_to_leads.sql`

```sql
-- Ajouter les champs prix fixé et prix acompte à la table leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS price_fixed DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_deposit DECIMAL(10, 2);

-- Commentaires pour documentation
COMMENT ON COLUMN public.leads.price_fixed IS 'Prix fixé pour la formation';
COMMENT ON COLUMN public.leads.price_deposit IS 'Prix de l''acompte (si applicable)';
```

## Fonctionnalités

✅ **Prix fixé** : Champ pour définir le prix total de la formation
✅ **Prix acompte** : Champ pour définir le montant de l'acompte (optionnel)
✅ **Édition inline** : Cliquez directement sur les prix dans le CRM pour les modifier
✅ **Format monétaire** : Affichage avec 2 décimales et symbole €
✅ **Formulaire d'ajout** : Possibilité de définir les prix lors de la création d'un lead

## Utilisation

1. **Dans le CRM** : Cliquez sur le prix fixé ou l'acompte pour les modifier directement
2. **Lors de l'ajout** : Remplissez les champs prix dans le formulaire "Ajouter un client"
3. **Affichage** : Les prix s'affichent avec 2 décimales et le symbole €, ou "-" si non défini

---

**Une fois la migration exécutée, les champs prix seront disponibles dans le CRM !** ✅
