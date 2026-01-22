# Migration : Format de formation et planning automatique

## Exécuter la migration

1. Allez dans votre **Supabase Dashboard**
2. Ouvrez le **SQL Editor**
3. Exécutez le script `supabase/migrations/006_add_formation_format_and_planning_auto.sql`

## Fonctionnalités

### 1. Format de formation
- **Mensuelle** : 4 samedis ou dimanches consécutifs
- **Semaine** : Du lundi au vendredi

### 2. Planning automatique
Quand un lead passe en **"Acompte réglé"** ou **"Closé"** :
- Si `formation_format`, `formation_day` et `formation_start_date` sont définis
- Le système calcule automatiquement les dates selon la date choisie
- Crée une entrée dans le planning
- **Mensuelle** : Trouve les 4 samedis ou dimanches du mois de la date choisie
- **Semaine** : Réserve la semaine complète (lundi-vendredi) de la semaine de la date choisie

### 3. Calendrier
- Vue calendrier (comme Google Agenda)
- Vue liste
- Navigation mois précédent/suivant
- Affichage des formations sur les jours concernés

## Utilisation

1. **Définir le format et la date** :
   - Dans le CRM, lors de l'ajout d'un lead
   - Ou en édition inline (cliquer sur les champs)
   - Choisir "Semaine" ou "Mensuelle"
   - Choisir le jour (lundi-vendredi pour semaine, samedi/dimanche pour mensuelle)
   - **Choisir la date de début** (le closer choisit la date)

2. **Planning automatique** :
   - Quand vous marquez "Acompte réglé" ou "Closé"
   - Le planning est créé automatiquement
   - **Semaine** : Réserve la semaine complète (lundi-vendredi) de la date choisie
   - **Mensuelle** : Réserve les 4 samedis ou dimanches du mois de la date choisie

3. **Voir le planning** :
   - Allez sur `/dashboard/planning`
   - Vue calendrier par défaut
   - Vue liste disponible

---

**Une fois la migration exécutée, le système de planning automatique sera actif !** ✅
