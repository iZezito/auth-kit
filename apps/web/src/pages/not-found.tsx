import { Link } from "@tanstack/react-router"
import { Link2Off } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center px-4 text-center">
      <Link2Off className="size-28 text-muted-foreground" />
      <h1 className="mt-4 text-6xl font-bold">404</h1>
      <p className="mt-2 text-xl">Página não encontrada</p>
      <p className="mt-4 text-muted-foreground">
        Não encontramos a página que você está procurando.
      </p>
      <Button
        className="mt-6"
        variant="secondary"
        render={<Link to="/home" />}
      >
        Voltar ao início
      </Button>
    </main>
  )
}
