export function friendlyMatchRequiresCategory(
  friendlyCategoryId: string | null | undefined
): boolean {
  return Boolean(friendlyCategoryId)
}

export function assertPlayersBelongToCategory(
  categoryId: string,
  players: Array<{ id: string; friendlyCategoryId: string | null }>
): { ok: true } | { ok: false; foreignPlayerIds: string[] } {
  const foreignPlayerIds = players
    .filter((p) => p.friendlyCategoryId !== categoryId)
    .map((p) => p.id)

  if (foreignPlayerIds.length > 0) {
    return { ok: false, foreignPlayerIds }
  }
  return { ok: true }
}
