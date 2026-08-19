import { redirect } from "@tanstack/react-router"

import {
  type EdenErrorValue,
  isUnauthorized,
  type CurrentUser,
} from "@/lib/api"

export function redirectAuthenticatedUser(user: CurrentUser | null) {
  if (user) {
    throw redirect({ to: "/home", replace: true })
  }
}

export function requireRole(
  user: CurrentUser,
  allowedRoles: CurrentUser["role"][],
) {
  if (!allowedRoles.includes(user.role)) {
    throw redirect({ to: "/home", replace: true })
  }
}

export function handleProtectedRouteError(error: EdenErrorValue): never {
  if (isUnauthorized(error)) {
    throw redirect({ to: "/login", replace: true })
  }

  throw error
}
