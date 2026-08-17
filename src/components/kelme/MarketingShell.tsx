import Link from 'next/link'

type Props = {
  children: React.ReactNode
  productName?: string
  active?: 'home' | 'ayuda'
}

export function MarketingShell({ children, productName = 'LigaLab', active }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f7] text-[#17171a]">
      <header className="sticky top-0 z-20 border-b border-[#e5e5e9] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#c91f26] text-xl font-black text-white">
              LL
            </div>
            <div>
              <span className="font-display text-lg font-black tracking-[0.1em] text-[#17171a]">
                {productName.toUpperCase()}
              </span>
              <p className="text-[10px] font-extrabold tracking-[0.13em] text-[#aaa]">
                GESTIÓN DEPORTIVA
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/kelme/ayuda"
              className={`hidden rounded-xl border border-[#dddde2] bg-white px-3.5 py-2.5 text-sm font-bold sm:inline-flex ${
                active === 'ayuda'
                  ? 'text-[#c91f26]'
                  : 'text-[#5f5f66] hover:bg-[#f7f7f9]'
              }`}
            >
              Guía de uso
            </Link>
            <Link href="/login" className="btn-kelme text-sm">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-[#e5e5e9] bg-white py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center font-ui text-xs text-[#8d8d96] sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {productName}
          </span>
          <Link href="/kelme/ayuda" className="font-bold hover:text-[#505058]">
            Guía de uso
          </Link>
        </div>
      </footer>
    </div>
  )
}
