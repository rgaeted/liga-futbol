'use client'

export function SharePlayerCardButton({
  nombreCorto,
  path,
  ogPath,
}: {
  nombreCorto: string
  path: string
  ogPath: string
}) {
  async function onShare() {
    const url = new URL(path, window.location.origin).toString()
    if (navigator.share) {
      await navigator.share({
        title: `Carta de ${nombreCorto}`,
        text: 'Stats reales, cero humo.',
        url,
      })
      return
    }
    const res = await fetch(ogPath)
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'carta-loslunes.png'
    a.click()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={() => void onShare()}
        className="rounded-lg bg-gradient-to-br from-[#E8C878] to-[#C79A3E] px-8 py-3 font-[family-name:var(--font-oswald)] text-lg uppercase tracking-wide text-[#141B15]"
      >
        Compartir carta
      </button>
      <p className="mt-2 text-sm text-[#8BA598]">Stats reales, cero humo.</p>
    </div>
  )
}
