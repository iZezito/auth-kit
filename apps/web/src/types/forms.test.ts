import { describe, expect, it } from "vitest"

import { toProfilePayload, toSignupPayload } from "@/lib/payloads"
import {
  loginSchema,
  resetPasswordSchema,
  tokenSearchSchema,
} from "@/types"

describe("contratos dos formulários", () => {
  it("aceita o primeiro passo do login e valida OTP quando informado", () => {
    expect(
      loginSchema.safeParse({
        email: "person@example.com",
        password: "secret-password",
        codeOTP: "",
      }).success,
    ).toBe(true)
    expect(
      loginSchema.safeParse({
        email: "person@example.com",
        password: "secret-password",
        codeOTP: "123",
      }).success,
    ).toBe(false)
  })

  it("rejeita confirmação de senha divergente", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "new-password",
      confirmPassword: "different-password",
    })
    expect(result.success).toBe(false)
  })

  it("trata token ausente sem criar valor sentinela", () => {
    expect(tokenSearchSchema.parse({})).toEqual({})
    expect(tokenSearchSchema.parse({ token: "reset-token" })).toEqual({
      token: "reset-token",
    })
  })

  it("remove campos apenas visuais dos payloads", () => {
    expect(
      toSignupPayload({
        name: "Test User",
        email: "test@example.com",
        password: "secret-password",
        repetirSenha: "secret-password",
      }),
    ).toEqual({
      name: "Test User",
      email: "test@example.com",
      password: "secret-password",
    })

    expect(
      toProfilePayload({
        name: "Updated User",
        email: "immutable@example.com",
        twoFactorAuthenticationEnabled: true,
      }),
    ).toEqual({
      name: "Updated User",
      twoFactorAuthenticationEnabled: true,
    })
  })
})
