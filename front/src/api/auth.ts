import { useMutator } from "@/api/api";
import type { LoginInput, AuthResponse, CreateAccountInput, CreateAccountResponse } from "@shared/types/auth";

export const useLogin = (options = {}) =>
  useMutator<LoginInput, AuthResponse>("/auth/login", options);

export const useRegister = (options = {}) =>
  useMutator<CreateAccountInput, CreateAccountResponse>("/auth/register", options); 