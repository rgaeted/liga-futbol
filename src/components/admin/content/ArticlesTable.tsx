'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'

type ArticleRow = {
  id: string
  title: string
  status: string
  publishedAt: string | null
  updatedAt: string
}

export function ArticlesTable({ seasonId, articles }: { seasonId: string; articles: ArticleRow[] }) {
  const orgPath = useOrgPath()
  return (
    <div className="overflow-hidden rounded-lg border border-kelme-border">
      <table className="min-w-full text-sm">
        <thead className="bg-kelme-gray-100">
          <tr>
            <th className="p-3 text-left">Título</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Publicación</th>
            <th className="p-3 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id} className="border-t border-kelme-border">
              <td className="p-3">{article.title}</td>
              <td className="p-3">{article.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}</td>
              <td className="p-3">
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleString('es-CL')
                  : '—'}
              </td>
              <td className="p-3">
                <Link
                  href={orgPath(`/admin/content/articles/${article.id}?season=${seasonId}`)}
                  className="text-kelme-red hover:underline"
                >
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ArticleForm({
  seasonId,
  articleId,
  initial,
}: {
  seasonId: string
  articleId?: string
  initial?: {
    title: string
    summary: string
    body: string
    status: 'DRAFT' | 'PUBLISHED'
  }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(initial?.status ?? 'DRAFT')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const payload = { title, summary: summary || null, body, status }
    const result = articleId
      ? await submitJson(`/api/admin/seasons/${seasonId}/articles/${articleId}`, 'PUT', payload)
      : await submitJson(`/api/admin/seasons/${seasonId}/articles`, 'POST', payload)
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.push(`/admin/content/articles?season=${seasonId}`)
    router.refresh()
  }

  return (
    <section className="space-y-4 rounded-lg border border-kelme-border p-4">
      <h2 className="font-display text-lg font-semibold">
        {articleId ? 'Editar artículo' : 'Nuevo artículo'}
      </h2>
      <label className="block space-y-1 text-sm">
        <span>Título</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full input-kelme rounded-lg px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Resumen</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="min-h-20 w-full input-kelme rounded-lg px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Cuerpo</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-40 w-full input-kelme rounded-lg px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Estado</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'DRAFT' | 'PUBLISHED')}
          className="input-kelme rounded-lg px-3 py-2"
        >
          <option value="DRAFT">Borrador</option>
          <option value="PUBLISHED">Publicado</option>
        </select>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-kelme-red px-4 py-2 text-sm font-semibold text-white"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </section>
  )
}
