import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { ibmPlexMono, manrope, oswald } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'LigaLab',
    template: '%s · LigaLab',
  },
  description: 'Plataforma SaaS para administrar ligas de fútbol con marcador en vivo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'LigaLab',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B1210',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es-CL"
      className={`${oswald.variable} ${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
