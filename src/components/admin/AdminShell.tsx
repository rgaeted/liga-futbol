import Link from 'next/link'
import { AdminNav, type AdminNavItem } from '@/components/admin/AdminNav'
import { personInitials } from '@/lib/player-name'

type Props = {
  nav: AdminNavItem[]
  userName: string
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

export function AdminShell({ nav, userName, signOutAction, children }: Props) {
  const initials = personInitials(userName)

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-7 gap-y-3 px-4 py-2.5 sm:px-7 sm:py-2.5">
          <div className="flex shrink-0 items-center gap-3">
            <div className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-zinc-900 font-[family-name:var(--font-montserrat)] text-xl font-bold tracking-wide text-white">
              TK
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[21px] font-bold uppercase tracking-[0.06em]">
                Torneos
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Gestión deportiva
              </span>
            </div>
          </div>

          <div className="order-3 flex w-full min-w-0 items-center lg:order-none lg:w-auto lg:flex-1">
            <AdminNav nav={nav} />
          </div>

          <div className="order-2 ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5 lg:order-none lg:flex-none">
            <label className="hidden h-[38px] min-w-[44px] max-w-[208px] flex-1 items-center gap-2 rounded-[9px] border border-zinc-200 bg-[#fafafa] px-3 sm:flex">
              <span className="text-sm text-zinc-400" aria-hidden>
                ⌕
              </span>
              <input
                type="search"
                placeholder="Buscar equipo o jugador"
                className="w-full border-none bg-transparent font-ui text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400"
                disabled
                aria-label="Buscar equipo o jugador"
              />
            </label>
            <Link
              href="/ayuda"
              className="hidden h-[38px] items-center rounded-[9px] border border-zinc-200 bg-white px-3 font-ui text-[13px] font-semibold text-zinc-600 hover:bg-zinc-100 sm:inline-flex"
            >
              Ayuda
            </Link>
            <div className="flex items-center gap-2.5 border-l border-zinc-200 pl-3">
              <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#b91c1c] text-[13px] font-bold text-white">
                {initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-[13px] font-semibold">{userName}</div>
                <div className="text-[11px] text-zinc-400">Administrador</div>
              </div>
              <form action={signOutAction} className="sm:ml-1">
                <button
                  type="submit"
                  className="rounded-lg px-2 py-1 font-ui text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
        <AdminNav nav={nav} mobile />
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:pb-14">{children}</main>
    </div>
  )
}
