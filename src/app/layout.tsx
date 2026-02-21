import type { Metadata } from 'next'
import './globals.css'
import MetaPixel from '@/components/tracking/MetaPixel'
import TikTokPixel from '@/components/tracking/TikTokPixel'

export const metadata: Metadata = {
  title: 'BPM Tools',
  description: 'Outil de gestion CRM et automatisation pour formations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <MetaPixel />
        <TikTokPixel />
        {children}
      </body>
    </html>
  )
}
