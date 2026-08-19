import { createFileRoute } from "@tanstack/react-router"

import Signup from "@/pages/signup"

export const Route = createFileRoute("/_guest/signup")({
  component: Signup,
})
