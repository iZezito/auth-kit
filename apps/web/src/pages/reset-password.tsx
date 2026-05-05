import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
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
import { useQueryState } from "nuqs";
import { resetPasswordSchema, type ResetPasswordValues } from "@/types";



export default function ResetPasswordForm() {
  const [token] = useQueryState("token", { defaultValue: "vazio" });

  const navigate = useNavigate();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordValues) {
    await api
      .put("/users/password-reset", {
        token: token,
        newPassword: data.newPassword,
      })
      .then(() => {
        toast.success("Senha alterada com sucesso!", {
          description: "Você pode agora fazer login com sua nova senha",
        });
        navigate("/login");
      })
      .catch((error) => {
        toast.error("Erro ao resetar a senha", {
          description: error?.response?.data,
        });
      });
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Redefinir Senha</CardTitle>
        <CardDescription>
          Digite sua nova senha abaixo para redefinir sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
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
                ? "Redefinindo..."
                : "Redefinir Senha"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
