import React, { createContext, useContext } from "react";
import { login, logout, type AuthResponse } from "../services/auth";
import type { LoginData, User } from "@/types";
import type { AxiosResponse } from "axios";
import { useService } from "@/hooks/use-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthContextProps {
  login: (login: LoginData) => Promise<AxiosResponse<AuthResponse>>;
  logout: () => void;
  loading: boolean;
  error: Error | null;
  user: User | null;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextProps | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const service = useService<User>("/users");
  const queryClient = useQueryClient();

  const {
    data: usuario,
    isPending,
    error,
  } = useQuery<User>({
    queryKey: ["usuarioLogado"],
    queryFn: () => service.get(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleLogin = async (
    loginData: LoginData
  ): Promise<AxiosResponse<AuthResponse>> => {
    return await login(loginData)
      .then((response) => {
        queryClient.invalidateQueries({queryKey: ["usuarioLogado"]});
        return response;
      });
  };

  const handleLogout = () => {
    logout().then(() => {
      queryClient.invalidateQueries({ queryKey: ["usuarioLogado"] });
    });
  };

  return (
    <AuthContext.Provider
      value={{
        login: handleLogin,
        logout: handleLogout,
        loading: isPending,
        error,
        user: usuario || null,
        isAuthenticated: !!usuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextProps {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
