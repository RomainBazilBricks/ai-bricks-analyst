import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users } from '../db/schema';
import jwt from 'jsonwebtoken';
import type { LoginInput, AuthResponse, AuthUser, CreateAccountInput, CreateAccountResponse } from '@shared/types/auth';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

/**
 * Authentifie un utilisateur et retourne un JWT
 * @route POST /api/auth/login
 * @param {LoginInput} req.body - Identifiants de connexion
 * @returns {AuthResponse} Token JWT et utilisateur
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginInput = req.body;
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user[0]) {
      res.status(401).json({ error: 'Utilisateur non trouvé', code: 'USER_NOT_FOUND' });
      return;
    }
    const valid = await bcrypt.compare(password, user[0].password);
    if (!valid) {
      res.status(401).json({ error: 'Mot de passe invalide', code: 'INVALID_PASSWORD' });
      return;
    }
    const payload: AuthUser = { id: user[0].id, email: user[0].email, name: user[0].name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const response: AuthResponse = { token, user: payload };
    res.json(response);
    return;
  } catch (error) {
    res.status(500).json({ error: (error as Error).message, code: 'INTERNAL_SERVER_ERROR' });
    return;
  }
};

/**
 * Crée un nouvel utilisateur
 * @route POST /api/auth/register
 * @param {CreateAccountInput} req.body - Données de création
 * @returns {CreateAccountResponse} Utilisateur créé
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password }: CreateAccountInput = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Tous les champs sont requis', code: 'FIELDS_REQUIRED' });
      return;
    }
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      res.status(409).json({ error: 'Email déjà utilisé', code: 'EMAIL_EXISTS' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const [created] = await db.insert(users).values({ name, email, password: hashed }).returning();
    const user: AuthUser = { id: created.id, email: created.email, name: created.name };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    const response: CreateAccountResponse = { user, token };
    res.status(201).json(response);
    return;
  } catch (error) {
    res.status(500).json({ error: (error as Error).message, code: 'INTERNAL_SERVER_ERROR' });
    return;
  }
}; 