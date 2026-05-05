import { type LoginData } from "@/types/index.ts";
import api from "./api.ts";
import { type AxiosResponse } from "axios";

export type AuthResponse = {
  token: string;
  usuario: string;
};

export const login = async (
  data: LoginData
): Promise<AxiosResponse<AuthResponse>> => {
  const response = await api.post<AuthResponse>("/auth/login", {
    ...data,
  });

  return response;
};

export const logout = async () => {
  return await api.post("/auth/logout");
};
