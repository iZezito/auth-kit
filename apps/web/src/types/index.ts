import { z } from "zod"

export type ApiError = {
  message: string
  code: number
  timestamp: string
}

export type ErrorWithMessage = {
  message: string
}

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  codeOTP: z.union([
    z.literal(""),
    z.string().regex(/^\d{6}$/, "Informe os seis dígitos do código"),
  ]),
})

export type LoginData = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.email("Por favor, insira um email válido."),
})

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const userSchema = z
  .object({
    name: z.string().min(4, "O nome deve ter no mínimo 4 caracteres"),
    email: z.email("Email inválido"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
    repetirSenha: z.string(),
  })
  .refine((values) => values.password === values.repetirSenha, {
    message: "Deve ser igual ao campo senha",
    path: ["repetirSenha"],
  })

export type CreateUser = z.infer<typeof userSchema>

export const userUpdateSchema = z.object({
  name: z.string().min(1, "O nome deve ter no mínimo 1 caractere"),
  email: z.email("Email inválido"),
  twoFactorAuthenticationEnabled: z.boolean(),
})

export type UpdateUser = z.infer<typeof userUpdateSchema>

export const tokenSearchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
})
