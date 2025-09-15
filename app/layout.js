import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import GATracker from './tracker'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Agency Search Ads Management',
  description: 'Manage Google Search Ads campaigns, ad groups, and responsive search ads',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body className={inter.className}>
        <Providers>
          {/* Google Analytics: loaded only when session exists */}
          <GATracker />
          {children}
        </Providers>
      </body>
    </html>
  )
}

