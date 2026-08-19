import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"

import { useAppForm } from "@/components/forms/app-form"
import { FormRootError } from "@/components/forms/form-components"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  api,
  getApiErrorMessage,
  getGoogleOAuthUrl,
} from "@/lib/api"
import { currentUserQueryOptions } from "@/lib/auth"
import { loginSchema, type LoginData } from "@/types"

export default function Login() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [requires2FA, setRequires2FA] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
      codeOTP: "",
    } satisfies LoginData,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)

      const result = await api.auth.login.post(value)

      if (result.error) {
        setSubmitError(
          getApiErrorMessage(result.error.value, "Erro ao efetuar login"),
        )
        return
      }

      if (result.status === 202) {
        setRequires2FA(true)
        return
      }

      queryClient.removeQueries({
        queryKey: currentUserQueryOptions.queryKey,
      })
      const session = await queryClient.ensureQueryData(currentUserQueryOptions)

      if (session.error) {
        setSubmitError(
          getApiErrorMessage(
            session.error.value,
            "Não foi possível carregar sua sessão.",
          ),
        )
        return
      }

      await router.invalidate()
      await navigate({ to: "/home", replace: true })
    },
  })

  return (
    <main className="flex min-h-svh items-start justify-center p-4 pt-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            {requires2FA
              ? "Digite o código de verificação enviado para o seu e-mail"
              : "Insira suas credenciais para acessar sua conta"}
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
                    placeholder="voce@provedor.com.br"
                    autoComplete="email"
                    disabled={requires2FA}
                  />
                )}
              </form.AppField>
              <form.AppField name="password">
                {(field) => (
                  <field.TextField
                    label="Senha"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={requires2FA}
                  />
                )}
              </form.AppField>
              {requires2FA ? (
                <form.AppField name="codeOTP">
                  {(field) => <field.OtpField label="Código de verificação" />}
                </form.AppField>
              ) : null}
              <form.SubmitButton
                className="w-full"
                idleLabel={requires2FA ? "Validar código" : "Entrar"}
                submittingLabel="Carregando..."
              />
            </form.AppForm>
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:border-t after:border-border">
              <span className="relative z-10 bg-card px-2 text-muted-foreground">
                Ou
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => window.location.assign(getGoogleOAuthUrl())}
            >
              Continuar com o Google
            </Button>
            <div className="space-y-2 text-center text-sm">
              <p>
                Não possui uma conta?{" "}
                <Link to="/signup" className="underline underline-offset-4">
                  Cadastre-se
                </Link>
              </p>
              <Link
                to="/forgot-password"
                className="underline underline-offset-4"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
