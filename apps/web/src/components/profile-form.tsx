import { useService } from "@/hooks/use-service";
import {
  type UpdateUser,
  type User,
  userUpdateSchema,
} from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment } from "react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Switch } from "@/components/ui/switch";

type ProfileFormProps = {
  user: User;
  onSuccess?: () => void;
};

export function ProfileForm({ user, onSuccess }: ProfileFormProps) {
  const service = useService<User>("users");
  const client = useQueryClient();

  const form = useForm<UpdateUser>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      twoFactorAuthenticationEnabled: user.twoFactorAuthenticationEnabled,
    }
  });

  const onSubmit = async (data: UpdateUser): Promise<void> => {
    try {
      await service.update(user.id, {
        name: data.name,
        twoFactorAuthenticationEnabled: data.twoFactorAuthenticationEnabled,
      });
      toast.success("Perfil atualizado com sucesso!", {
        description: "Seus dados foram atualizados com sucesso.",
      });
      client.invalidateQueries({ queryKey: ["usuarioLogado"] });
      onSuccess?.();
    } catch {
      toast.error("Erro ao atualizar o perfil.");
    }
  };

  return (
    <Fragment>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-4xl mx-auto"
        >
          <div className="space-y-2 mt-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Meu Perfil
            </h1>
            <p className="text-muted-foreground">
              Preencha os campos abaixo para atualizar seus dados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      disabled
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="twoFactorAuthenticationEnabled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ativar 2FA</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>


          <div className="flex justify-end">
            <Button type="submit">
              {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>
    </Fragment>
  );
}
