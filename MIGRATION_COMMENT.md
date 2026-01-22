# Migration : Ajouter le champ commentaire

## Exécuter la migration

1. Allez dans votre **Supabase Dashboard**
2. Ouvrez le **SQL Editor**
3. Exécutez le script suivant :

```sql
-- Ajouter un champ commentaire à la table leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS comment TEXT;
```

## Vérification

Après avoir exécuté la migration, vérifiez que la colonne existe :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'comment';
```

Vous devriez voir `comment | text`.

---

**Une fois la migration exécutée, le formulaire d'édition fonctionnera avec les commentaires !** ✅
