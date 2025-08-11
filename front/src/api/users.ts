import { useFetcher } from "@/api/api";
import type { UserResponse } from '@shared/types/users';

export const useGetAllUsers = (options = {}) => {
  return useFetcher<undefined, UserResponse[]>({
    key: ["users"],
    path: "/users",
    options,
  });
};