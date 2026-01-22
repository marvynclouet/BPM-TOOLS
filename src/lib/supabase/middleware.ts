import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Vérifier que les variables d'environnement sont définies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Si les variables ne sont pas définies, permettre l'accès au formulaire public
    // et à la page de setup
    if (
      request.nextUrl.pathname.startsWith('/form') ||
      request.nextUrl.pathname.startsWith('/setup')
    ) {
      return NextResponse.next()
    }
    
    // Pour les autres routes, rediriger vers la page de setup
    const url = request.nextUrl.clone()
    url.pathname = '/setup'
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Configuration standard de Supabase SSR pour le middleware
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  // IMPORTANT: Appeler getSession() dans le middleware pour rafraîchir la session
  // Cela garantit que les cookies sont synchronisés
  await supabase.auth.getSession()

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Permettre l'accès à /test-login, /debug et /test-simple sans auth
  if (
    request.nextUrl.pathname.startsWith('/test-login') || 
    request.nextUrl.pathname.startsWith('/debug') ||
    request.nextUrl.pathname.startsWith('/test-simple')
  ) {
    return supabaseResponse
  }

  // Si l'utilisateur est connecté et essaie d'accéder à /login, rediriger vers /dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Si pas d'utilisateur et pas sur une page publique, rediriger vers /login
  // MAIS: Ne pas bloquer /dashboard si on vient juste de se connecter
  // Le layout du dashboard vérifiera lui-même l'auth
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/form') &&
    !request.nextUrl.pathname.startsWith('/api/leads') &&
    !request.nextUrl.pathname.startsWith('/setup') &&
    request.nextUrl.pathname !== '/'
  ) {
    // Pour /dashboard, on laisse passer - le layout vérifiera l'auth
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return supabaseResponse
    }
    
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
