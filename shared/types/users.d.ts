export type User = {
    id: number;
    name: string | null;
    email: string | null;
};

export type CreateUserInput = {
    name: string;
    email: string;
};

export type UserResponse = {
    id: number;
    name: string;
    email: string;
};