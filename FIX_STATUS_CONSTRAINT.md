# 🔧 Correction de l'erreur de contrainte SQL

## ❌ Erreur
```
Erreur: new row for relation "leads" violates check constraint "leads_status_check"
```

## 🔍 Cause
La contrainte SQL sur la colonne `status` de la table `leads` ne contient pas tous les statuts utilisés dans l'application.

## ✅ Solution

### Option 1 : Exécuter la migration SQL (Recommandé)

1. **Allez dans Supabase Dashboard** → Votre projet → **SQL Editor**

2. **Exécutez cette requête SQL** :

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

-- Ajouter la nouvelle contrainte avec tous les statuts
ALTER TABLE public.leads
ADD CONSTRAINT leads_status_check 
CHECK (status IN (
  'nouveau', 
  'chinois', 
  'rats', 
  'nrp', 
  'en_cours_de_closing', 
  'acompte_en_cours',
  'appele', 
  'acompte_regle', 
  'clos', 
  'ko'
));

-- Mettre à jour le commentaire
COMMENT ON COLUMN public.leads.status IS 'Statut du lead: nouveau (👶), chinois (🇨🇳 parle chinois), rats (🐀 pas de sous), nrp (📞 pas répondu), en_cours_de_closing (👍), acompte_en_cours (💰), appele (📞), acompte_regle (💰), clos (✅), ko (❌)';
```

3. **Vérifiez que la contrainte est bien appliquée** :

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.leads'::regclass 
AND conname = 'leads_status_check';
```

### Option 2 : Utiliser la migration

Si vous utilisez Supabase CLI, exécutez :

```bash
supabase migration up
```

Cela exécutera la migration `013_fix_status_constraint.sql` qui corrige automatiquement la contrainte.

## 📋 Statuts autorisés

Après correction, les statuts suivants seront acceptés :

- `nouveau` - 👶 Nouveau
- `chinois` - 🇨🇳 Chinois (parle chinois)
- `rats` - 🐀 Rats (pas de sous)
- `nrp` - 📞 NRP (pas répondu)
- `en_cours_de_closing` - 👍 En cours de closing
- `acompte_en_cours` - 💰 Acompte en cours
- `appele` - 📞 Appelé
- `acompte_regle` - 💰 Acompte réglé
- `clos` - ✅ Closé
- `ko` - ❌ KO

## ✅ Vérification

Après avoir exécuté la migration, testez en créant un lead avec n'importe lequel de ces statuts. L'erreur ne devrait plus apparaître.
