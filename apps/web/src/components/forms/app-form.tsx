import { createFormHook } from "@tanstack/react-form"

import {
  fieldContext,
  formContext,
} from "@/components/forms/form-context"
import {
  OtpField,
  SwitchField,
  TextField,
} from "@/components/forms/form-fields"
import { SubmitButton } from "@/components/forms/form-components"

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    OtpField,
    SwitchField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})
