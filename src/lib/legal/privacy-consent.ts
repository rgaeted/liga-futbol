import { PRIVACY_POLICY_VERSION } from '@/lib/legal/constants'

export function privacyConsentData(now = new Date()) {
  return {
    privacyPolicyAcceptedAt: now,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  }
}
