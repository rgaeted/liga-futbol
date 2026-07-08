import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { montserrat, poppins, roboto } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Torneos Kelme',
  description: 'Plataforma oficial de gestión de torneos KELME con marcador en vivo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Torneos Kelme',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#CD212A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es-CL"
      className={`${montserrat.variable} ${poppins.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
