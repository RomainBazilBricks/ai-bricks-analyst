export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type CreateAccountInput = {
  name: string;
  email: string;
  password: string;
};

export type CreateAccountResponse = {
  user: AuthUser;
  token: string;
}; 