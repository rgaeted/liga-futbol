import Link from 'next/link'

type Props = {
  children: React.ReactNode
  productName?: string
  active?: 'home' | 'ayuda'
  homeHref?: string
  ayudaHref?: string
  loginCallback?: string
  showLogin?: boolean
  /** When set, replaces the login CTA (logged-in user with org access). */
  panelHref?: string | null
}

export function MarketingShell({
  children,
  productName = 'LigaLab',
  active,
  homeHref = '/',
  ayudaHref = '/kelme/ayuda',
  loginCallback,
  showLogin = true,
  panelHref,
}: Props) {
  const loginHref = loginCallback
    ? `/login?callbackUrl=${encodeURIComponent(loginCallback)}`
    : '/login'
  const showAuthNav = showLogin && !panelHref

  return (
    <div className="flex min-h-screen flex-col bg-[#0B1210] text-[#E8E4D8]">
      <header className="relative sticky top-0 z-20 border-b border-[#2A3A32] bg-[#121A18]">
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] bg-org-primary"
        />
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <Link href={homeHref} className="flex items-center gap-3 no-underline">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-org-primary text-xl font-black text-[#E8E4D8]">
              LL
            </div>
            <div>
              <span className="font-display text-lg font-black tracking-[0.1em] text-[#E8E4D8]">
                {productName.toUpperCase()}
              </span>
              <p className="text-[10px] font-extrabold tracking-[0.13em] text-[#8A938C]">
                GESTIÓN DEPORTIVA
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href={ayudaHref}
              className={`hidden rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold sm:inline-flex ${
                active === 'ayuda'
                  ? 'text-org-primary'
                  : 'text-[#8A938C] hover:bg-[#0B1210]'
              }`}
            >
              Guía de uso
            </Link>
            {panelHref ? (
              <Link href={panelHref} className="btn-kelme text-sm">
                Ir al panel
              </Link>
            ) : showAuthNav ? (
              <Link href={loginHref} className="btn-kelme text-sm">
                Ingresar
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-[#2A3A32] py-6 text-[#8A938C]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center font-ui text-xs sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {productName}
          </span>
          <Link href={ayudaHref} className="font-bold text-[#E8E4D8] hover:text-[#8A938C]">
            Guía de uso
          </Link>
        </div>
      </footer>
    </div>
  )
}
