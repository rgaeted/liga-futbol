import Link from 'next/link'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-kelme-gray-100 px-4">
      <section className="w-full max-w-lg rounded-2xl border border-kelme-border bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <KelmeLogo size="md" />
        </div>
        <h1 className="font-display text-3xl font-bold text-kelme-gray-900">
          Estamos realizando una mejora
        </h1>
        <p className="mt-4 font-body text-kelme-gray-600">
          Torneos Kelme está en una breve ventana de mantenimiento. Vuelve a
          intentarlo en unos minutos.
        </p>
        <Link href="/" className="btn-kelme mt-6 inline-flex">
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}
