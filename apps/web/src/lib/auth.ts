import { queryOptions, type QueryClient } from "@tanstack/react-query"

import { api, isUnauthorized } from "@/lib/api"

export const currentUserQueryKey = ["auth", "current-user"] as const

export async function getCurrentUser() {
  return api.users.get()
}

export type CurrentUserResponse = Awaited<ReturnType<typeof getCurrentUser>>

export const currentUserQueryOptions = queryOptions({
  queryKey: currentUserQueryKey,
  queryFn: getCurrentUser,
  staleTime: 30_000,
  retry: false,
})

export async function getOptionalCurrentUser(queryClient: QueryClient) {
  const result = await queryClient.ensureQueryData(currentUserQueryOptions)

  if (!result.error) {
    return result.data
  }

  if (isUnauthorized(result.error)) {
    return null
  }

  throw result.error
}
