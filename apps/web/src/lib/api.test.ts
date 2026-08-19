import { afterEach, describe, expect, it, vi } from "vitest"

import {
  api,
  getApiErrorMessage,
  isApiError,
  isErrorWithMessage,
  isUnauthorized,
} from "@/lib/api"
import type { ApiError } from "@/types"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("cliente Eden", () => {
  const apiError = {
    message: "Dados inválidos",
    code: 400,
    timestamp: "2026-08-19T12:00:00.000Z",
  } satisfies ApiError

  it("reconhece o contrato completo de ApiError", () => {
    expect(isApiError(apiError)).toBe(true)
    expect(isApiError({ message: "Sem acesso", code: 403 })).toBe(false)
    expect(
      isApiError({ ...apiError, code: "400" }),
    ).toBe(false)
  })

  it("normaliza somente formatos de erro conhecidos", () => {
    expect(getApiErrorMessage(apiError)).toBe("Dados inválidos")
    expect(isErrorWithMessage({ message: "Sem acesso" })).toBe(true)
    expect(getApiErrorMessage("Token expirado")).toBe("Token expirado")
    expect(getApiErrorMessage({ message: "Sem acesso" })).toBe("Sem acesso")
    expect(getApiErrorMessage({ error: "desconhecido" }, "Falha")).toBe(
      "Falha",
    )
    expect(isUnauthorized({ status: 401, value: apiError })).toBe(true)
    expect(isUnauthorized({ status: 403, value: apiError })).toBe(false)
  })

  it("preserva o status 202 do desafio 2FA e envia cookies", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ message: "Código enviado" }), {
          status: 202,
          headers: { "content-type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await api.auth.login.post({
      email: "person@example.com",
      password: "secret-password",
      codeOTP: "",
    })

    expect(result.status).toBe(202)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ message: "Código enviado" })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: "include",
    })
  })

  it("mantém erros HTTP como valor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(apiError), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    )

    const result = await api.auth.login.post({
      email: "person@example.com",
      password: "secret-password",
      codeOTP: "",
    })

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({ status: 400, value: apiError })
    expect(getApiErrorMessage(result.error?.value)).toBe("Dados inválidos")
  })

  it("mantém falhas de transporte como valor 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Sem conexão")
      }),
    )

    const result = await api.users.get()

    expect(result.data).toBeNull()
    expect(result.error?.status).toBe(503)
    expect(getApiErrorMessage(result.error?.value)).toBe("Sem conexão")
  })
})
