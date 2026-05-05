import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  codeOTP: z.string().optional(),
});

export type LoginData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Por favor, insira um email válido."), 
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const userSchema = z
  .object({
    name: z.string().min(4, "O nome deve ter no mínimo 4 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
    repetirSenha: z.string(),
  })
  .refine(
    (values) => {
      return values.password === values.repetirSenha;
    },
    {
      message: "Deve ser igual ao campo senha",
      path: ["repetirSenha"],
    },
  );

export const userUpdateSchema = z.object({
  name: z.string().min(1, "O nome deve ter no mínimo 1 caractere"),
  email: z.string().min(1, "O email deve ter no mínimo 1 caractere"),
  twoFactorAuthenticationEnabled: z.boolean(),
});

export type UpdateUser = z.infer<typeof userUpdateSchema>;

export type UserDTO = {
  id: number;
  nome: string;
  email: string;
};

export type University = {
  id: string;
  institutionName: string;
  campus: string;
};

export type CreateUser = z.infer<typeof userSchema>;

export type ApiError = {
  message: string;
  code: number;
  timestamp: string;
};

export const Roles = {
  ADMIN: "ADMIN",
  DEFAULT: "DEFAULT",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export type User = {
  id: string;
  name: string;
  email: string;
  twoFactorAuthenticationEnabled: boolean;
  role: Role;
  password: string;
};

export type Usuario = {
  id: number;
};

type Pageable = {
  sort: Sort;
  offset: number;
  pageNumber: number;
  pageSize: number;
  unpaged: boolean;
  paged: boolean;
};

type Sort = {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
};

export type ResponseType<T> = {
  id: number;
  content: T[];
  pageable: Pageable;
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: Sort;
  first: boolean;
  numberOfElements: number;
};
