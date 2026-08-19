import type { CreateUser, UpdateUser } from "@/types"

export function toSignupPayload(value: CreateUser) {
  return {
    name: value.name,
    email: value.email,
    password: value.password,
  }
}

export function toProfilePayload(value: UpdateUser) {
  return {
    name: value.name,
    twoFactorAuthenticationEnabled: value.twoFactorAuthenticationEnabled,
  }
}
