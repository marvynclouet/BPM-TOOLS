/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Configuration pour Vercel
  output: 'standalone',
  // Inclure les fichiers statiques dans le build
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./public/**/*'],
    },
  },
  // Exclure les Edge Functions Supabase du build
  webpack: (config) => {
    config.externals = config.externals || []
    config.externals.push({
      'https://deno.land/std@0.168.0/http/server.ts': 'commonjs https://deno.land/std@0.168.0/http/server.ts',
    })
    return config
  },
}

module.exports = nextConfig
