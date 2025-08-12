import { Request, Response } from 'express';
import { and, gt, lt, desc, asc, eq, isNull } from 'drizzle-orm';
import { aiCredentials, CreateAiCredentialSchema, UpdateAiCredentialSchema, GetAiCredentialsQuerySchema } from '../db/schema';
import { db } from '../db';
import type { 
  CreateAiCredentialInput, 
  UpdateAiCredentialInput,
  AiCredentialResponse, 
  PaginatedAiCredentialsResponse,
  GetAiCredentialsQuery 
} from '@shared/types/ai-credentials';

/**
 * Récupère tous les credentials avec pagination par cursor et filtres
 * @route GET /api/ai-credentials
 * @param {string} cursor - Cursor pour la pagination
 * @param {number} limit - Nombre d'éléments par page (max 100)
 * @param {string} direction - Direction de pagination ('next' | 'prev')
 * @param {string} platform - Filtrer par plateforme
 * @param {string} userIdentifier - Filtrer par identifiant utilisateur
 * @param {boolean} isActive - Filtrer par statut actif
 * @returns {PaginatedAiCredentialsResponse} Liste paginée des credentials
 */
export const getPaginatedAiCredentials = async (req: Request, res: Response): Promise<any> => {
  try {
    const queryParams = GetAiCredentialsQuerySchema.parse(req.query);
    const { cursor, limit = 10, direction = 'next', platform, userIdentifier, isActive } = queryParams;
    
    const query = db.select().from(aiCredentials);
    
    // Construire les conditions de filtrage
    const conditions = [];
    
    if (cursor) {
      const condition = direction === 'next' 
        ? gt(aiCredentials.id, Number(cursor))
        : lt(aiCredentials.id, Number(cursor));
      conditions.push(condition);
    }
    
    if (platform) {
      conditions.push(eq(aiCredentials.platform, platform));
    }
    
    if (userIdentifier) {
      conditions.push(eq(aiCredentials.userIdentifier, userIdentifier));
    }
    
    if (isActive !== undefined) {
      conditions.push(eq(aiCredentials.isActive, isActive));
    }
    
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    const results = await query
      .orderBy(direction === 'next' ? asc(aiCredentials.id) : desc(aiCredentials.id))
      .limit(Number(limit) + 1);
    
    const hasMore = results.length > Number(limit);
    const items = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    
    const response: PaginatedAiCredentialsResponse = {
      items: items as AiCredentialResponse[],
      nextCursor,
      hasMore
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Récupère un credential spécifique par ID
 * @route GET /api/ai-credentials/:id
 * @param {number} id - ID du credential
 * @returns {AiCredentialResponse} Le credential demandé
 */
export const getAiCredentialById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        code: 'INVALID_ID'
      });
    }
    
    const result = await db
      .select()
      .from(aiCredentials)
      .where(eq(aiCredentials.id, Number(id)))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({ 
        error: 'Credential non trouvé',
        code: 'NOT_FOUND'
      });
    }
    
    // Mettre à jour lastUsedAt
    await db
      .update(aiCredentials)
      .set({ lastUsedAt: new Date() })
      .where(eq(aiCredentials.id, Number(id)));
    
    res.json(result[0] as AiCredentialResponse);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Crée un nouveau credential
 * @route POST /api/ai-credentials
 * @param {CreateAiCredentialInput} body - Données du credential à créer
 * @returns {AiCredentialResponse} Le credential créé
 */
export const createAiCredential = async (req: Request, res: Response): Promise<any> => {
  try {
    const validatedData = CreateAiCredentialSchema.parse(req.body);
    
    const newCredential = {
      platform: validatedData.platform,
      userIdentifier: validatedData.userIdentifier || null,
      credentialName: validatedData.credentialName || 'default',
      sessionData: validatedData.sessionData,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      userAgent: validatedData.userAgent || null,
      notes: validatedData.notes || null,
    };
    
    const result = await db
      .insert(aiCredentials)
      .values(newCredential)
      .returning();
    
    res.status(201).json(result[0] as AiCredentialResponse);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Met à jour un credential existant
 * @route POST /api/ai-credentials/:id/update
 * @param {number} id - ID du credential à mettre à jour
 * @param {UpdateAiCredentialInput} body - Données à mettre à jour
 * @returns {AiCredentialResponse} Le credential mis à jour
 */
export const updateAiCredential = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        code: 'INVALID_ID'
      });
    }
    
    const validatedData = UpdateAiCredentialSchema.parse(req.body);
    
    // Vérifier que le credential existe
    const existing = await db
      .select()
      .from(aiCredentials)
      .where(eq(aiCredentials.id, Number(id)))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Credential non trouvé',
        code: 'NOT_FOUND'
      });
    }
    
    const updateData: any = {
      updatedAt: new Date(),
      lastUsedAt: new Date(),
    };
    
    if (validatedData.platform) updateData.platform = validatedData.platform;
    if (validatedData.userIdentifier !== undefined) updateData.userIdentifier = validatedData.userIdentifier;
    if (validatedData.credentialName) updateData.credentialName = validatedData.credentialName;
    if (validatedData.sessionData) updateData.sessionData = validatedData.sessionData;
    if (validatedData.expiresAt !== undefined) {
      updateData.expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : null;
    }
    if (validatedData.userAgent !== undefined) updateData.userAgent = validatedData.userAgent;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    
    const result = await db
      .update(aiCredentials)
      .set(updateData)
      .where(eq(aiCredentials.id, Number(id)))
      .returning();
    
    res.json(result[0] as AiCredentialResponse);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Supprime (désactive) un credential
 * @route POST /api/ai-credentials/:id/delete
 * @param {number} id - ID du credential à supprimer
 * @returns {AiCredentialResponse} Le credential supprimé
 */
export const deleteAiCredential = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        code: 'INVALID_ID'
      });
    }
    
    // Vérifier que le credential existe
    const existing = await db
      .select()
      .from(aiCredentials)
      .where(eq(aiCredentials.id, Number(id)))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Credential non trouvé',
        code: 'NOT_FOUND'
      });
    }
    
    // Soft delete : désactiver le credential
    const result = await db
      .update(aiCredentials)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(aiCredentials.id, Number(id)))
      .returning();
    
    res.json(result[0] as AiCredentialResponse);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Récupère le credential actif pour une plateforme et un utilisateur
 * @route GET /api/ai-credentials/platform/:platform/user/:userIdentifier
 * @param {string} platform - Nom de la plateforme
 * @param {string} userIdentifier - Identifiant de l'utilisateur
 * @returns {AiCredentialResponse} Le credential actif
 */
export const getCredentialByPlatformAndUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { platform, userIdentifier: encodedUserIdentifier } = req.params;
    
    if (!platform || !encodedUserIdentifier) {
      return res.status(400).json({ 
        error: 'Plateforme et identifiant utilisateur requis',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Décoder le userIdentifier depuis base64
    const userIdentifier = Buffer.from(encodedUserIdentifier, 'base64').toString('utf-8');
    
    const result = await db
      .select()
      .from(aiCredentials)
      .where(
        and(
          eq(aiCredentials.platform, platform),
          eq(aiCredentials.userIdentifier, userIdentifier),
          eq(aiCredentials.isActive, true)
        )
      )
      .orderBy(desc(aiCredentials.lastUsedAt))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({ 
        error: 'Aucun credential actif trouvé pour cette plateforme et cet utilisateur',
        code: 'NOT_FOUND'
      });
    }
    
    // Mettre à jour lastUsedAt
    await db
      .update(aiCredentials)
      .set({ lastUsedAt: new Date() })
      .where(eq(aiCredentials.id, result[0].id));
    
    res.json(result[0] as AiCredentialResponse);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}; 

/**
 * Récupère le credential actif pour une plateforme et un utilisateur (endpoint public pour intégrations externes)
 * @route GET /api/public/ai-credentials/platform/:platform/user/:userIdentifier
 * @param {string} platform - Nom de la plateforme
 * @param {string} userIdentifier - Identifiant de l'utilisateur (encodé en base64)
 * @param {string} x-api-key - Clé API pour l'authentification (header)
 * @returns {AiCredentialResponse} Le credential actif
 */
export const getCredentialByPlatformAndUserPublic = async (req: Request, res: Response): Promise<any> => {
  try {
    const { platform, userIdentifier: encodedUserIdentifier } = req.params;
    const apiKey = req.headers['x-api-key'] as string;
    
    // Vérifier la clé API
    const expectedApiKey = process.env.INTEGRATION_API_KEY;
    if (!expectedApiKey) {
      return res.status(500).json({ 
        error: 'Clé API d\'intégration non configurée sur le serveur',
        code: 'API_KEY_NOT_CONFIGURED'
      });
    }
    
    if (!apiKey || apiKey !== expectedApiKey) {
      return res.status(401).json({ 
        error: 'Clé API invalide ou manquante',
        code: 'INVALID_API_KEY'
      });
    }
    
    if (!platform || !encodedUserIdentifier) {
      return res.status(400).json({ 
        error: 'Plateforme et identifiant utilisateur requis',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Décoder le userIdentifier depuis base64
    const userIdentifier = Buffer.from(encodedUserIdentifier, 'base64').toString('utf-8');
    
    const result = await db
      .select()
      .from(aiCredentials)
      .where(
        and(
          eq(aiCredentials.platform, platform),
          eq(aiCredentials.userIdentifier, userIdentifier),
          eq(aiCredentials.isActive, true)
        )
      )
      .orderBy(desc(aiCredentials.lastUsedAt))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({ 
        error: 'Aucun credential actif trouvé pour cette plateforme et cet utilisateur',
        code: 'NOT_FOUND',
        details: {
          platform,
          userIdentifier: userIdentifier,
          searchedFor: 'active credentials'
        }
      });
    }
    
    // Mettre à jour lastUsedAt
    await db
      .update(aiCredentials)
      .set({ lastUsedAt: new Date() })
      .where(eq(aiCredentials.id, result[0].id));
    
    // Log pour debugging
    console.log(`✅ Credential récupéré pour ${platform}/${userIdentifier} (ID: ${result[0].id})`);
    
    res.json(result[0] as AiCredentialResponse);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du credential public:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}; 