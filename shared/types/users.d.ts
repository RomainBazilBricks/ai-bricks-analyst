export type UserRole = 'user' | 'admin';

export type User = {
    id: number;
    name: string | null;
    email: string | null;
    role: UserRole;
};

export type CreateUserInput = {
    name: string;
    email: string;
};

export type UserResponse = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
};