import { Request, Response } from 'express';
import { users } from "../db/schema"
import { db } from '../db';
import type { CreateUserInput, UserResponse } from '@shared/types/users';

// GET /api/users : récupère tous les utilisateurs
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const userList = await db.select().from(users);
    res.json(userList as UserResponse[]);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}; 