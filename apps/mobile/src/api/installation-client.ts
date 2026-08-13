import type {
  RegisterInstallationRequest,
  RegisterInstallationResponse,
  ReplaceSubscriptionsRequest,
  ReplaceSubscriptionsResponse,
} from '@liga/mobile-contracts'
import { getApiBaseUrl } from '../lib/runtime-config'
import { mobileApiPaths } from './paths'

export class InstallationApiClient {
  constructor(private readonly baseUrl = getApiBaseUrl()) {}

  async registerInstallation(
    body: RegisterInstallationRequest,
  ): Promise<RegisterInstallationResponse> {
    const response = await fetch(`${this.baseUrl}${mobileApiPaths().installations}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`register_failed_${response.status}`)
    }

    return response.json() as Promise<RegisterInstallationResponse>
  }

  async replaceSubscriptions(
    installationId: string,
    body: ReplaceSubscriptionsRequest,
  ): Promise<ReplaceSubscriptionsResponse> {
    const response = await fetch(
      `${this.baseUrl}${mobileApiPaths().installationSubscriptions(installationId)}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${installationId}`,
        },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      throw new Error(`subscriptions_failed_${response.status}`)
    }

    return response.json() as Promise<ReplaceSubscriptionsResponse>
  }
}

export const installationApiClient = new InstallationApiClient()
