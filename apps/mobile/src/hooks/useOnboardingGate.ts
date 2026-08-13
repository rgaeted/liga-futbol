import { useEffect, useState } from 'react'
import { isOnboardingComplete } from '../storage/onboarding'

export function useOnboardingGate() {
  const [ready, setReady] = useState(false)
  const [completed, setCompleted] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    void isOnboardingComplete().then((value) => {
      if (active) {
        setCompleted(value)
        setReady(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return { ready, completed, setCompleted }
}
