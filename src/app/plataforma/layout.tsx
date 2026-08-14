import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-zinc-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-display text-lg font-bold">AdminTorneo</span>
          <nav className="flex items-center gap-4 font-ui text-sm">
            <Link href="/plataforma" className="text-zinc-300 hover:text-white">
              Empresas
            </Link>
            <Link href="/plataforma/apps" className="text-zinc-300 hover:text-white">
              Apps
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
