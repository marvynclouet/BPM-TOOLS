'use client'

import { useEffect } from 'react'
import Script from 'next/script'

interface MetaPixelProps {
  pixelId?: string
}

export default function MetaPixel({ pixelId }: MetaPixelProps) {
  const pixelIdValue = pixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID

  useEffect(() => {
    if (!pixelIdValue || typeof window === 'undefined') return

    // Initialiser le pixel Meta si pas déjà fait
    if (!window.fbq) {
      window.fbq = function() {
        // eslint-disable-next-line prefer-rest-params
        window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments)
      }
      window.fbq.push = window.fbq
      window.fbq.loaded = true
      window.fbq.version = '2.0'
      window.fbq.queue = []
    }
  }, [pixelIdValue])

  if (!pixelIdValue) {
    return null
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelIdValue}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelIdValue}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}

// Fonction utilitaire pour déclencher des événements Meta Pixel
export function trackMetaEvent(eventName: string, eventData?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, eventData)
  }
}

// Déclaration TypeScript pour window.fbq
declare global {
  interface Window {
    fbq: {
      (action: string, eventName?: string, eventData?: Record<string, any>): void
      loaded?: boolean
      version?: string
      queue?: any[]
      callMethod?: (...args: any[]) => void
      push: any
    }
  }
}
