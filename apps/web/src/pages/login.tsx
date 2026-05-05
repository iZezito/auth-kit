import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, type LoginData } from "@/types";

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [requires2FA, setRequires2FA] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      codeOTP: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    await login(data)
      .then((response) => {
        if (response.status === 202) {
          setRequires2FA(true);
        } else {
          navigate("/");
        }
      })
      .catch((error) => {
        form.setError("root", {
          type: "manual",
          message: error?.response?.data.message || "Erro ao efetuar login",
        });
      });
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:3000/auth/oauth/google";
  };

  return (
    <Card className="mx-auto max-w-sm mt-10">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          {requires2FA
            ? "Digite o código de verificação enviado para o seu dispositivo"
            : "Insira suas credenciais abaixo para fazer login em sua conta"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <span className="text-red-500 text-left text-sm">
                {form.formState.errors.root.message}
              </span>
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="voce@provedor.com.br"
                      autoComplete="email"
                      {...field}
                      disabled={form.formState.isSubmitting || requires2FA}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="******"
                      autoComplete="current-password"
                      {...field}
                      disabled={form.formState.isSubmitting || requires2FA}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {requires2FA && (
              <FormField
                control={form.control}
                name="codeOTP"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Verificação</FormLabel>
                    <FormControl>
                      <InputOTP maxLength={6} {...field}>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Carregando..." : "Login"}
            </Button>
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 px-2 bg-card text-muted-foreground">
                Ou
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-1">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Continue com o Google
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Não possui uma conta?{" "}
              <Link to="/signup" className="underline">
                Cadastre-se
              </Link>
            </div>
            <div className="mt-4 text-center text-sm">
              <Link to="/forgot-password" className="underline">
                Esqueceu sua senha?
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
