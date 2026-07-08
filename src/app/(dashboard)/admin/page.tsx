import Link from 'next/link'

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Panel de Administración</h1>
      <p className="text-kelme-gray-400">Gestiona equipos, jugadores, temporadas y partidos.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/admin/teams', label: 'Equipos' },
          { href: '/admin/players', label: 'Jugadores' },
          { href: '/admin/seasons', label: 'Temporadas' },
          { href: '/admin/matches', label: 'Partidos' },
          { href: '/admin/users', label: 'Usuarios' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-kelme-border bg-kelme-surface p-6 hover:border-kelme-red"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
