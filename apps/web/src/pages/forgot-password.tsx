import { useState } from "react"

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
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/types"

export default function ForgotPassword() {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      email: "",
    } satisfies ForgotPasswordValues,
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)

      const result = await api.users["forgot-password"].post({
        email: value.email,
      })

      if (result.error) {
        setSubmitError(
          getApiErrorMessage(
            result.error.value,
            "Erro ao enviar as instruções de recuperação.",
          ),
        )
        return
      }

      toast.add({ type: "success", title: result.data })
      form.reset()
    },
  })

  return (
    <main className="flex min-h-svh items-start justify-center p-4 pt-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Digite seu e-mail para receber as instruções de recuperação.
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
              <FormRootError message={submitError} />
              <form.AppField name="email">
                {(field) => (
                  <field.TextField
                    label="E-mail"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                )}
              </form.AppField>
              <form.SubmitButton
                className="w-full"
                idleLabel="Enviar instruções"
                submittingLabel="Enviando..."
              />
            </form.AppForm>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
