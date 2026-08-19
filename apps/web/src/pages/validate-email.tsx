import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { CheckCircle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { api, getApiErrorMessage } from "@/lib/api"

export default function ValidateEmail({ token }: { token?: string }) {
  const navigate = useNavigate()
  const validation = useQuery({
    queryKey: ["email-validation", token],
    queryFn: () =>
      api.users["email-verification"].get({ query: { token: token! } }),
    enabled: Boolean(token),
    retry: false,
  })

  if (validation.isPending && token) {
    return (
      <ValidationCard
        title="Validando seu e-mail"
        description="Aguarde enquanto verificamos o link."
      >
        <Spinner className="size-10 text-primary" />
      </ValidationCard>
    )
  }

  const result = validation.data
  const isValidated = Boolean(result?.data && !result.error)
  const message = !token
    ? "O link de validação é inválido ou está incompleto."
    : result?.error
      ? getApiErrorMessage(
          result.error.value,
          "Não foi possível validar seu e-mail.",
        )
      : validation.error
        ? getApiErrorMessage(
            validation.error,
            "Não foi possível validar seu e-mail.",
          )
        : result?.data

  return (
    <ValidationCard
      title={isValidated ? "E-mail validado" : "Falha na validação"}
      description={
        isValidated
          ? "Seu endereço de e-mail foi confirmado."
          : "Não foi possível validar seu e-mail."
      }
    >
      {isValidated ? (
        <CheckCircle className="size-16 text-green-500" />
      ) : (
        <XCircle className="size-16 text-destructive" />
      )}
      <p className="text-center">{message}</p>
      <Button className="w-full" onClick={() => navigate({ to: "/home" })}>
        Voltar para a página inicial
      </Button>
    </ValidationCard>
  )
}

function ValidationCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh items-start justify-center p-4 pt-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
