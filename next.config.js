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
}

module.exports = nextConfig
