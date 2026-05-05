import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import api from "@/services/api";
import { toast } from "sonner";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/types";

export default function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordValues) {
    await api
      .post("/users/forgot-password", {
        email: data.email,
      })
      .then((response) => {
        toast(response.data);
        form.reset();
      })
      .catch((error) => {
        toast.error("Erro ao enviar o token de recuperação de senha.", {
          description:
            error?.response?.data ||
            "Não foi possível enviar o token de recuperação de senha.",
        });
      });
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Esqueceu sua senha?</CardTitle>
        <CardDescription>
          Digite seu email abaixo para receber instruções de recuperação de
          senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Enviando..."
                : "Enviar instruções"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
