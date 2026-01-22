# 🔍 Debug Cookies - Instructions

## Le problème persiste

Les cookies ne se synchronisent toujours pas entre le client et le serveur. Voici comment diagnostiquer :

## 1. Vérifier les cookies dans le navigateur

1. **Ouvrez les DevTools** (F12)
2. Allez dans **Application** → **Cookies** → `http://localhost:3000`
3. **Connectez-vous** sur `/login`
4. **Regardez les cookies** :
   - Y a-t-il des cookies créés après la connexion ?
   - Cherchez des cookies commençant par `sb-` ou `supabase`
   - Notez leurs noms et valeurs

## 2. Vérifier la console du navigateur

1. Ouvrez la **Console** (F12 → Console)
2. Connectez-vous
3. Regardez les messages :
   - `✅ Connexion réussie, session créée`
   - `✅ Session vérifiée, redirection vers dashboard`
   - Ou des erreurs en rouge

## 3. Vérifier les requêtes réseau

1. Ouvrez **Network** (F12 → Network)
2. Connectez-vous
3. Regardez la requête vers `/dashboard` :
   - **Headers** → **Request Headers** → Cherchez `Cookie:`
   - Y a-t-il des cookies envoyés ?
   - Quels sont les noms des cookies ?

## 4. Test avec console.log

Après connexion, dans la console du navigateur, tapez :
```javascript
document.cookie
```

Cela affichera tous les cookies. Y en a-t-il qui commencent par `sb-` ou `supabase` ?

## 5. Solution alternative : Vérifier la version de @supabase/ssr

La version `0.1.0` est très ancienne. Il faudrait peut-être mettre à jour :

```bash
npm install @supabase/ssr@latest
```

## Dites-moi ce que vous voyez

1. **Y a-t-il des cookies créés après connexion ?** (Oui/Non)
2. **Quels sont les noms des cookies ?** (ex: `sb-xxxxx-auth-token`)
3. **Y a-t-il des erreurs dans la console ?**
4. **Les cookies sont-ils envoyés dans les requêtes vers `/dashboard` ?**

Ces informations m'aideront à identifier le problème exact ! 🔍
