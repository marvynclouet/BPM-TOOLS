/**
 * Script pour créer l'utilisateur admin Emmanuel
 * 
 * Usage: node scripts/create-user-emmanuel.js
 * 
 * Prérequis:
 * - Avoir SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * - Avoir installé les dépendances: npm install
 */

// Charger dotenv si disponible, sinon utiliser les variables d'environnement directement
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  // dotenv n'est pas installé, on utilise les variables d'environnement directement
  console.log('ℹ️  dotenv non trouvé, utilisation des variables d\'environnement système')
}

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser() {
  const email = 'emmanuel.kabouh@hotmail.com'
  const password = 'azerty123'
  const fullName = 'Emmanuel'
  const role = 'admin'

  try {
    console.log('🔄 Création de l\'utilisateur dans Supabase Auth...')
    
    // 1. Créer l'utilisateur dans auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError) {
      // Si l'utilisateur existe déjà, on continue
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('⚠️  L\'utilisateur existe déjà dans auth.users, récupération...')
        
        // Récupérer l'utilisateur existant
        const { data: users, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) {
          throw new Error(`Erreur lors de la récupération: ${listError.message}`)
        }
        
        const existingUser = users.users.find(u => u.email === email)
        if (!existingUser) {
          throw new Error('Utilisateur non trouvé dans auth.users')
        }
        
        authData.user = existingUser
        console.log('✅ Utilisateur trouvé dans auth.users')
      } else {
        throw authError
      }
    } else {
      console.log('✅ Utilisateur créé dans auth.users')
    }

    const userId = authData.user.id
    console.log(`   UUID: ${userId}`)

    // 2. Créer ou mettre à jour dans public.users
    console.log('🔄 Création/mise à jour dans public.users...')
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: role,
        full_name: fullName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (userError) {
      throw new Error(`Erreur lors de la création dans public.users: ${userError.message}`)
    }

    console.log('✅ Utilisateur créé/mis à jour dans public.users')
    
    // 3. Résumé
    console.log('\n📊 Résumé:')
    console.log(`   UUID: ${userId}`)
    console.log(`   Email: ${email}`)
    console.log(`   Mot de passe: ${password}`)
    console.log(`   Rôle: ${role}`)
    console.log(`   Nom: ${fullName}`)
    console.log('\n✅ L\'utilisateur peut maintenant se connecter !')
    console.log(`   URL: ${supabaseUrl.replace('/rest/v1', '')}/auth/v1/login`)
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

createUser()
