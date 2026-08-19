import { isRedirect } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { type CurrentUser } from "@/lib/api"
import {
  handleProtectedRouteError,
  redirectAuthenticatedUser,
  requireRole,
} from "@/lib/route-guards"

const user = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "DEFAULT",
  oauth2Provider: null,
  emailVerified: true,
  twoFactorAuthenticationEnabled: false,
} satisfies CurrentUser

function captureThrow(callback: () => void) {
  try {
    callback()
  } catch (error) {
    return error
  }

  throw new Error("A função deveria lançar um redirecionamento")
}

describe("guardas de rota", () => {
  it("permite visitante em rotas públicas exclusivas", () => {
    expect(redirectAuthenticatedUser(null)).toBeUndefined()
  })

  it("redireciona usuário autenticado para home", () => {
    expect(isRedirect(captureThrow(() => redirectAuthenticatedUser(user)))).toBe(
      true,
    )
  })

  it("redireciona sessão ausente para login", () => {
    expect(
      isRedirect(
        captureThrow(() =>
          handleProtectedRouteError({
            status: 401,
            value: {
              message: "Unauthorized",
              code: 401,
              timestamp: "2026-08-19T12:00:00.000Z",
            },
          }),
        ),
      ),
    ).toBe(true)
  })

  it("bloqueia papéis não permitidos", () => {
    const admin = { ...user, role: "ADMIN" } satisfies CurrentUser
    expect(isRedirect(captureThrow(() => requireRole(admin, ["DEFAULT"])))).toBe(
      true,
    )
  })

  it("protege o grupo administrativo", () => {
    const admin = { ...user, role: "ADMIN" } satisfies CurrentUser

    expect(requireRole(admin, ["ADMIN"])).toBeUndefined()
    expect(
      isRedirect(captureThrow(() => requireRole(user, ["ADMIN"]))),
    ).toBe(true)
  })
})
