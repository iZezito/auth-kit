import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { useAppForm } from "@/components/forms/app-form"
import { FormRootError } from "@/components/forms/form-components"
import { toast } from "@/components/ui/toast"
import { api, getApiErrorMessage } from "@/lib/api"
import { toSignupPayload } from "@/lib/payloads"
import { userSchema, type CreateUser } from "@/types"

export default function Signup() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      repetirSenha: "",
    } satisfies CreateUser,
    validators: {
      onSubmit: userSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)

      const result = await api.users.post(toSignupPayload(value))

      if (result.error) {
        setSubmitError(
          getApiErrorMessage(result.error.value, "Erro ao criar usuário"),
        )
        return
      }

      toast.add({
        type: "success",
        title: "Usuário criado com sucesso!",
        description: `Enviamos as instruções de confirmação para ${value.email}.`,
      })
      await navigate({ to: "/login" })
    },
  })

  return (
    <main className="mx-auto w-full max-w-4xl p-4 pt-10">
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.AppForm>
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Cadastro de usuário
            </h1>
            <p className="text-muted-foreground">
              Preencha os campos abaixo para criar sua conta.
            </p>
          </div>
          <FormRootError message={submitError} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <form.AppField name="name">
              {(field) => (
                <field.TextField label="Nome" placeholder="Seu nome" />
              )}
            </form.AppField>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="E-mail"
                  type="email"
                  placeholder="email@exemplo.com"
                  autoComplete="email"
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              )}
            </form.AppField>
            <form.AppField name="repetirSenha">
              {(field) => (
                <field.TextField
                  label="Repetir senha"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              )}
            </form.AppField>
          </div>
          <div className="flex justify-end">
            <form.SubmitButton
              idleLabel="Salvar"
              submittingLabel="Salvando..."
            />
          </div>
        </form.AppForm>
      </form>
    </main>
  )
}
