import { Request, Response } from 'express';
import { and, gt, lt, desc, asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { 
  api_configurations,
  CreateApiConfigSchema,
  UpdateApiConfigSchema,
  GetApiConfigsQuerySchema
} from '../db/schema';
import type { 
  ApiConfigResponse, 
  CreateApiConfigInput, 
  UpdateApiConfigInput,
  PaginatedApiConfigsResponse
} from '@shared/types/api-config';

/**
 * Récupère toutes les configurations d'API avec pagination par cursor
 * @route GET /api/api-configs
 * @param {string} cursor - Cursor pour la pagination
 * @param {number} limit - Nombre d'éléments par page (max 100)
 * @param {string} direction - Direction de pagination ('next' | 'prev')
 * @param {string} name - Filtrer par nom (optionnel)
 * @param {boolean} isActive - Filtrer par statut actif (optionnel)
 * @returns {PaginatedApiConfigsResponse} Liste paginée des configurations d'API
 */
export const getPaginatedApiConfigs = async (req: Request, res: Response): Promise<any> => {
  try {
    const validation = GetApiConfigsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Paramètres de requête invalides',
        details: validation.error.issues
      });
    }

    const { cursor, limit, direction, name, isActive } = validation.data;

    // Construire les conditions
    const conditions = [];
    if (cursor) {
      const condition = direction === 'next' 
        ? gt(api_configurations.id, Number(cursor))
        : lt(api_configurations.id, Number(cursor));
      conditions.push(condition);
    }
    if (name) {
      conditions.push(eq(api_configurations.name, name));
    }
    if (isActive !== undefined) {
      conditions.push(eq(api_configurations.isActive, isActive));
    }

    // Construire et exécuter la requête
    const baseQuery = db.select().from(api_configurations);
    const finalQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const results = await finalQuery
      .orderBy(direction === 'next' ? asc(api_configurations.id) : desc(api_configurations.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const response: PaginatedApiConfigsResponse = {
      items,
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
 * Récupère une configuration d'API par son ID
 * @route GET /api/api-configs/:id
 * @param {number} id - ID de la configuration d'API
 * @returns {ApiConfigResponse} Configuration d'API
 */
export const getApiConfigById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const [config] = await db
      .select()
      .from(api_configurations)
      .where(eq(api_configurations.id, id));

    if (!config) {
      return res.status(404).json({ error: 'Configuration d\'API non trouvée' });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Récupère la configuration d'API Python active
 * @route GET /api/api-configs/python/active
 * @returns {ApiConfigResponse} Configuration d'API Python active
 */
export const getActivePythonApiConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const [config] = await db
      .select()
      .from(api_configurations)
      .where(and(
        eq(api_configurations.name, 'Python API'),
        eq(api_configurations.isActive, true)
      ));

    if (!config) {
      // Retourner une configuration par défaut si aucune n'est trouvée
      return res.json({
        id: 0,
        name: 'Python API',
        url: 'http://localhost:8000',
        description: 'Configuration par défaut',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Crée une nouvelle configuration d'API
 * @route POST /api/api-configs
 * @param {CreateApiConfigInput} body - Données de la configuration d'API
 * @returns {ApiConfigResponse} Configuration d'API créée
 */
export const createApiConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const validation = CreateApiConfigSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: validation.error.issues
      });
    }

    const configData: CreateApiConfigInput = validation.data;

    const [newConfig] = await db
      .insert(api_configurations)
      .values({
        ...configData,
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newConfig);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Met à jour une configuration d'API
 * @route POST /api/api-configs/:id/update
 * @param {number} id - ID de la configuration d'API
 * @param {UpdateApiConfigInput} body - Données de mise à jour
 * @returns {ApiConfigResponse} Configuration d'API mise à jour
 */
export const updateApiConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const validation = UpdateApiConfigSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: validation.error.issues
      });
    }

    const updateData: UpdateApiConfigInput = validation.data;

    const [updatedConfig] = await db
      .update(api_configurations)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(api_configurations.id, id))
      .returning();

    if (!updatedConfig) {
      return res.status(404).json({ error: 'Configuration d\'API non trouvée' });
    }

    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Supprime une configuration d'API (soft delete en désactivant)
 * @route POST /api/api-configs/:id/delete
 * @param {number} id - ID de la configuration d'API
 * @returns {ApiConfigResponse} Configuration d'API désactivée
 */
export const deleteApiConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const [deletedConfig] = await db
      .update(api_configurations)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(api_configurations.id, id))
      .returning();

    if (!deletedConfig) {
      return res.status(404).json({ error: 'Configuration d\'API non trouvée' });
    }

    res.json(deletedConfig);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Met à jour la configuration de l'API Python
 * @route POST /api/api-configs/python/update
 * @param {string} url - Nouvelle URL de l'API Python
 * @param {boolean} isActive - Statut actif (optionnel)
 * @returns {ApiConfigResponse} Configuration d'API Python mise à jour
 */
export const updatePythonApiConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const { url, isActive = true } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL invalide ou manquante' });
    }

    // Vérifier si l'URL est valide
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Format d\'URL invalide' });
    }

    // Chercher la configuration Python existante
    const [existingConfig] = await db
      .select()
      .from(api_configurations)
      .where(eq(api_configurations.name, 'Python API'));

    let updatedConfig;

    if (existingConfig) {
      // Mettre à jour la configuration existante
      [updatedConfig] = await db
        .update(api_configurations)
        .set({
          url,
          isActive,
          updatedAt: new Date()
        })
        .where(eq(api_configurations.id, existingConfig.id))
        .returning();
    } else {
      // Créer une nouvelle configuration
      [updatedConfig] = await db
        .insert(api_configurations)
        .values({
          name: 'Python API',
          url,
          description: 'Configuration de l\'API Python pour l\'envoi de messages',
          isActive,
          updatedAt: new Date()
        })
        .returning();
    }

    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};
