import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl px-6 text-center">
        <h1 className="mb-4 font-heading text-4xl font-extrabold leading-none tracking-tight text-foreground md:text-5xl lg:text-6xl">
          Autenticação segura e eficiente
        </h1>
        <p className="mb-8 text-lg text-muted-foreground lg:text-xl">
          Este template oferece login e cadastro de usuário, confirmação de
          e-mail, autenticação de dois fatores, login social e recuperação de
          senha.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button render={<a href="/login" />}>Entrar</Button>
          <Button variant="outline" render={<a href="/signup" />}>
            Criar conta
          </Button>
        </div>
      </div>
    </main>
  )
}
