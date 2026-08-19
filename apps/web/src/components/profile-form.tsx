import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"

import { useAppForm } from "@/components/forms/app-form"
import { FormRootError } from "@/components/forms/form-components"
import { toast } from "@/components/ui/toast"
import { api, type CurrentUser, getApiErrorMessage } from "@/lib/api"
import { currentUserQueryKey } from "@/lib/auth"
import { toProfilePayload } from "@/lib/payloads"
import { userUpdateSchema, type UpdateUser } from "@/types"

export function ProfileForm({ user }: { user: CurrentUser }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      name: user.name,
      email: user.email,
      twoFactorAuthenticationEnabled:
        user.twoFactorAuthenticationEnabled ?? false,
    } satisfies UpdateUser,
    validators: {
      onSubmit: userUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)

      const result = await api.users({ id: user.id }).put(
        toProfilePayload(value),
      )

      if (result.error) {
        setSubmitError(
          getApiErrorMessage(
            result.error.value,
            "Erro ao atualizar o perfil.",
          ),
        )
        return
      }

      await queryClient.invalidateQueries({
        queryKey: currentUserQueryKey,
        refetchType: "all",
      })
      await router.invalidate()
      toast.add({
        type: "success",
        title: "Perfil atualizado com sucesso!",
      })
    },
  })

  return (
    <form
      className="mx-auto w-full max-w-4xl space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.AppForm>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Meu perfil
          </h1>
          <p className="text-muted-foreground">
            Atualize seus dados e preferências de segurança.
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
              <field.TextField label="E-mail" type="email" disabled />
            )}
          </form.AppField>
          <form.AppField name="twoFactorAuthenticationEnabled">
            {(field) => <field.SwitchField label="Ativar autenticação 2FA" />}
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
  )
}
