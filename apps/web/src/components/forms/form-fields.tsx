import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Switch } from "@/components/ui/switch"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useFieldContext } from "@/components/forms/form-context"

function normalizeErrors(errors: unknown[]) {
  return errors.map((error) => {
    if (typeof error === "string") {
      return { message: error }
    }

    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return { message: error.message }
    }

    return undefined
  })
}

type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "name" | "value" | "onBlur" | "onChange" | "onValueChange"
> & {
  label: string
}

export function TextField({ label, ...props }: TextFieldProps) {
  const field = useFieldContext<string>()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={() => field.handleBlur()}
        onValueChange={field.handleChange}
        aria-invalid={invalid}
        {...props}
      />
      {invalid ? (
        <FieldError errors={normalizeErrors(field.state.meta.errors)} />
      ) : null}
    </Field>
  )
}

export function OtpField({ label, disabled }: { label: string; disabled?: boolean }) {
  const field = useFieldContext<string>()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputOTP
        id={field.name}
        name={field.name}
        maxLength={6}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={field.handleChange}
        disabled={disabled}
        aria-invalid={invalid}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      {invalid ? (
        <FieldError errors={normalizeErrors(field.state.meta.errors)} />
      ) : null}
    </Field>
  )
}

export function SwitchField({ label }: { label: string }) {
  const field = useFieldContext<boolean>()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field orientation="horizontal" data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Switch
        id={field.name}
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        aria-invalid={invalid}
      />
      {invalid ? (
        <FieldError errors={normalizeErrors(field.state.meta.errors)} />
      ) : null}
    </Field>
  )
}
