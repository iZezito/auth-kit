import { treaty, type Treaty } from "@elysia/eden"
import type { App } from "@server/app"

import type { ApiError, ErrorWithMessage } from "@/types"

export const apiBaseUrl =
  import.meta.env.VITE_BASE_URL || "http://localhost:3000"

const publicPaths = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/validate-email",
])

export const api = treaty<App>(apiBaseUrl, {
  parseDate: false,
  fetch: {
    credentials: "include",
  },
  onResponse(response) {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !publicPaths.has(window.location.pathname)
    ) {
      window.location.assign("/login")
    }
  },
})

export type EdenErrorValue = {
  status: unknown
  value: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isApiError(value: unknown): value is ApiError {
  return (
    isRecord(value) &&
    typeof value.message === "string" &&
    typeof value.code === "number" &&
    typeof value.timestamp === "string"
  )
}

export function isErrorWithMessage(value: unknown): value is ErrorWithMessage {
  return isRecord(value) && typeof value.message === "string"
}

export function getApiErrorMessage(
  value: unknown,
  fallback = "Não foi possível concluir a operação.",
) {
  if (isApiError(value)) {
    return value.message
  }

  if (isErrorWithMessage(value)) {
    return value.message
  }

  if (typeof value === "string" && value.length > 0) {
    return value
  }

  return fallback
}

export function isUnauthorized(
  error: EdenErrorValue | null | undefined,
) {
  return error?.status === 401
}

export function getGoogleOAuthUrl() {
  return new URL("/auth/oauth/google", apiBaseUrl).toString()
}

export type CurrentUser = Treaty.Data<typeof api.users.get>
export type LoginResponse = Treaty.Data<typeof api.auth.login.post>
