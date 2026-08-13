export type MobilePlatformCode = 'IOS' | 'ANDROID'

export type MobileInstallationStatusCode = 'ACTIVE' | 'INACTIVE'

export type NotificationKindCode = 'MATCH_START' | 'GOAL' | 'MATCH_FINISH'

export type RegisterInstallationRequest = {
  installationId: string
  expoPushToken: string
  platform: MobilePlatformCode
  appVersion?: string
}

export type RegisterInstallationResponse = {
  installationId: string
  status: MobileInstallationStatusCode
}

export type TeamSubscriptionInput = {
  seasonTeamId: string
  notifyMatchStart?: boolean
  notifyGoals?: boolean
  notifyFinal?: boolean
}

export type ReplaceSubscriptionsRequest = {
  teams: TeamSubscriptionInput[]
}

export type ReplaceSubscriptionsResponse = {
  teams: Array<{
    seasonTeamId: string
    notifyMatchStart: boolean
    notifyGoals: boolean
    notifyFinal: boolean
  }>
}
