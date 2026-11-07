import { useEffect, useState } from 'react'
import { isOnboardingComplete, subscribeOnboarding } from '../storage/onboarding'

export function useOnboardingGate() {
  const [ready, setReady] = useState(false)
  const [completed, setCompleted] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    let changed = false
    const unsubscribe = subscribeOnboarding((value) => {
      changed = true
      setCompleted(value)
      setReady(true)
    })
    void isOnboardingComplete().then((value) => {
      if (active && !changed) {
        setCompleted(value)
        setReady(true)
      }
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return { ready, completed, setCompleted }
}
