import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl text-center px-6">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-foreground md:text-5xl lg:text-6xl">
          Autenticação segura e eficiente
        </h1>
        <p className="mb-8 text-lg text-muted-foreground lg:text-xl">
          Este é o frontend do template de autenticação desenvolvido com React,
          Vite e TypeScript. Ele oferece Login e cadastro de usuário,
          Confirmação de e-mail, Autenticação de dois fatores (2FA) e
          Recuperação de senha.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button variant="default" asChild>
            <a href="" target="_blank" rel="noreferrer">
              Saiba mais
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="" target="_blank" rel="noreferrer">
              Ver demonstração
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
