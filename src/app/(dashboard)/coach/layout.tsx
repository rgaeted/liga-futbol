import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== Role.COACH) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex gap-6">
          <Link href="/coach" className="font-bold text-emerald-400">DT</Link>
          <Link href="/coach/evaluations">Evaluaciones</Link>
        </div>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
          <button type="submit" className="text-sm text-slate-400 hover:text-white">Salir</button>
        </form>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
