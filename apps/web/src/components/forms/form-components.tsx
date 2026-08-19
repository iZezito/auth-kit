import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { useFormContext } from "@/components/forms/form-context"

export function SubmitButton({
  idleLabel,
  submittingLabel,
  className,
}: {
  idleLabel: string
  submittingLabel: string
  className?: string
}) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          type="submit"
          className={className}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? submittingLabel : idleLabel}
        </Button>
      )}
    </form.Subscribe>
  )
}

export function FormRootError({ message }: { message: string | null }) {
  if (!message) {
    return null
  }

  return <FieldError role="alert">{message}</FieldError>
}
