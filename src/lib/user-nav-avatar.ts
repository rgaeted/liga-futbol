import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { friendlyPlayerPhotoUrl, personHasPhoto } from '@/lib/friendly-player-photo'

export async function resolveUserNavAvatarUrl(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      person: {
        select: {
          photoMimeType: true,
          photoData: true,
          players: { select: { id: true }, take: 1 },
        },
      },
      refereeProfile: { select: { photoStoragePath: true } },
    },
  })
  if (!user) return null

  const person = user.person
  if (person && personHasPhoto(person) && person.players[0]) {
    return friendlyPlayerPhotoUrl(person.players[0].id)
  }

  return editorialPublicUrl(user.refereeProfile?.photoStoragePath ?? null)
}
