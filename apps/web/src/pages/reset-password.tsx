import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { useAppForm } from "@/components/forms/app-form"
import { FormRootError } from "@/components/forms/form-components"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { api, getApiErrorMessage } from "@/lib/api"
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/types"

export default function ResetPassword({ token }: { token?: string }) {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    } satisfies ResetPasswordValues,
    validators: {
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      if (!token) {
        setSubmitError("O link de redefinição é inválido ou está incompleto.")
        return
      }

      setSubmitError(null)

      const result = await api.users["password-reset"].put({
        token,
        newPassword: value.newPassword,
      })

      if (result.error) {
        setSubmitError(
          getApiErrorMessage(result.error.value, "Erro ao redefinir a senha."),
        )
        return
      }

      toast.add({
        type: "success",
        title: "Senha alterada com sucesso!",
        description: "Você já pode entrar usando a nova senha.",
      })
      await navigate({ to: "/login" })
    },
  })

  return (
    <main className="flex min-h-svh items-start justify-center p-4 pt-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            Digite sua nova senha para recuperar o acesso à conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <form.AppForm>
              <FormRootError
                message={
                  token
                    ? submitError
                    : "O link de redefinição é inválido ou está incompleto."
                }
              />
              <form.AppField name="newPassword">
                {(field) => (
                  <field.TextField
                    label="Nova senha"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={!token}
                  />
                )}
              </form.AppField>
              <form.AppField name="confirmPassword">
                {(field) => (
                  <field.TextField
                    label="Confirmar nova senha"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={!token}
                  />
                )}
              </form.AppField>
              <form.SubmitButton
                className="w-full"
                idleLabel="Redefinir senha"
                submittingLabel="Redefinindo..."
              />
            </form.AppForm>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
