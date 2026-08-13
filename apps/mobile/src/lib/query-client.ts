import { QueryClient } from '@tanstack/react-query'

export function createMobileQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false
          return !(error instanceof Error && error.message.includes('http_4'))
        },
      },
    },
  })
}
