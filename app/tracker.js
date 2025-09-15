'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Script from 'next/script'

export default function GATracker() {
  const { data: session, status } = useSession()

  // Only render GA scripts when a session exists
  const hasSession = status === 'authenticated' && session?.user
  if (!hasSession || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}


