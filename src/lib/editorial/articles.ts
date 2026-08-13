import { EditorialStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { applyPublishTransition } from '@/lib/editorial/publication'
import type { CreateArticleInput, UpdateArticleInput } from '@/lib/validations/editorial'

export async function listAdminArticles(seasonId: string) {
  return db.article.findMany({
    where: { seasonId },
    orderBy: [{ updatedAt: 'desc' }],
  })
}

export async function createArticle(
  seasonId: string,
  authorId: string,
  input: CreateArticleInput,
) {
  const now = new Date()
  const status = input.status ?? EditorialStatus.DRAFT
  return db.article.create({
    data: {
      seasonId,
      authorId,
      title: input.title,
      summary: input.summary ?? null,
      body: input.body,
      status,
      publishedAt: applyPublishTransition(status, null, now),
    },
  })
}

export async function updateArticle(
  seasonId: string,
  articleId: string,
  input: UpdateArticleInput,
) {
  const existing = await db.article.findFirst({
    where: { id: articleId, seasonId },
  })
  if (!existing) return null

  const now = new Date()
  const status = input.status ?? existing.status
  return db.article.update({
    where: { id: articleId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.summary !== undefined ? { summary: input.summary ?? null } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      status,
      publishedAt: applyPublishTransition(status, existing.publishedAt, now),
    },
  })
}

export async function deleteArticle(seasonId: string, articleId: string) {
  const existing = await db.article.findFirst({
    where: { id: articleId, seasonId },
  })
  if (!existing) return null

  await db.article.delete({ where: { id: articleId } })
  return { coverStoragePath: existing.coverStoragePath }
}

export function articleCoverStoragePath(seasonId: string, articleId: string, ext: string) {
  return `seasons/${seasonId}/articles/${articleId}/cover.${ext}`
}
