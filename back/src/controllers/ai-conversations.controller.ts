import { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db/index';
import { projects, sessions, conversations_with_ai } from '@/db/schema';
import type { 
  SaveConversationInput,
  ConversationResponse
} from '@shared/types/projects';
import { z } from 'zod';

// Schema de validation pour sauvegarder une conversation IA
const SaveAIConversationSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  conversationUrl: z.string().url('Must be a valid URL'),
  model: z.string().min(1, 'Model is required'),
  taskId: z.string().optional(),
});

/**
 * Sauvegarde une URL de conversation IA liée à un projet
 * @route POST /api/ai-conversations
 * @param {SaveConversationInput} req.body - Données de la conversation IA
 * @returns {ConversationResponse} Conversation IA sauvegardée
 */
export const saveAIConversation = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validation des données d'entrée
    const validatedData = SaveAIConversationSchema.parse(req.body);
    const conversationData: SaveConversationInput = validatedData;

    // Vérifier que le projet existe
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, conversationData.projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Vérifier s'il existe une session active pour ce projet
    // Si pas de session, en créer une automatiquement
    let projectSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.projectId, project[0].id))
      .limit(1);

    if (projectSession.length === 0) {
      // Créer une session automatiquement
      const newSession = await db
        .insert(sessions)
        .values({
          projectId: project[0].id,
          name: `Session automatique - ${new Date().toLocaleDateString('fr-FR')}`,
          description: 'Session créée automatiquement lors de la première conversation IA',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      projectSession = newSession;
      console.log(`✅ Session créée automatiquement pour le projet ${conversationData.projectUniqueId}`);
    }

    // Vérifier si cette URL de conversation IA existe déjà
    const existingConversation = await db
      .select()
      .from(conversations_with_ai)
      .where(eq(conversations_with_ai.url, conversationData.conversationUrl))
      .limit(1);

    if (existingConversation.length > 0) {
      // URL déjà enregistrée, retourner la conversation existante
      const response: ConversationResponse = {
        id: existingConversation[0].id,
        sessionId: existingConversation[0].sessionId,
        url: existingConversation[0].url,
        model: existingConversation[0].model,
        createdAt: existingConversation[0].createdAt,
      };

      return res.status(200).json(response);
    }

    // Sauvegarder la nouvelle conversation IA
    const newConversation = await db
      .insert(conversations_with_ai)
      .values({
        sessionId: projectSession[0].id,
        url: conversationData.conversationUrl,
        model: conversationData.model,
        createdAt: new Date(),
      })
      .returning();

    const response: ConversationResponse = {
      id: newConversation[0].id,
      sessionId: newConversation[0].sessionId,
      url: newConversation[0].url,
      model: newConversation[0].model,
      createdAt: newConversation[0].createdAt,
    };

    console.log(`✅ Conversation IA sauvegardée: ${conversationData.conversationUrl} (${conversationData.model})`);
    res.status(201).json(response);
    
  } catch (error) {
    console.error('Error saving AI conversation:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'SAVE_AI_CONVERSATION_ERROR'
    });
  }
};

/**
 * Récupère toutes les conversations IA liées à un projet
 * @route GET /api/ai-conversations/project/:projectUniqueId
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ConversationResponse[]} Liste des conversations IA
 */
export const getAIConversationsByProject = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    // Vérifier que le projet existe
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Récupérer toutes les conversations IA liées à ce projet via les sessions
    const aiConversations = await db
      .select({
        id: conversations_with_ai.id,
        sessionId: conversations_with_ai.sessionId,
        url: conversations_with_ai.url,
        model: conversations_with_ai.model,
        createdAt: conversations_with_ai.createdAt,
      })
      .from(conversations_with_ai)
      .leftJoin(sessions, eq(conversations_with_ai.sessionId, sessions.id))
      .where(eq(sessions.projectId, project[0].id))
      .orderBy(desc(conversations_with_ai.createdAt)); // Plus récente en premier

    const response: ConversationResponse[] = aiConversations.map(conv => ({
      id: conv.id,
      sessionId: conv.sessionId,
      url: conv.url,
      model: conv.model,
      createdAt: conv.createdAt,
    }));

    // ✅ Toujours retourner un tableau (vide si pas de conversations)
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'GET_AI_CONVERSATIONS_ERROR'
    });
  }
};

/**
 * Récupère la dernière conversation IA d'un projet
 * @route GET /api/ai-conversations/project/:projectUniqueId/latest
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ConversationResponse | null} Dernière conversation IA ou null
 */
export const getLatestAIConversation = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    // Vérifier que le projet existe
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Récupérer la dernière conversation IA
    const latestConversation = await db
      .select({
        id: conversations_with_ai.id,
        sessionId: conversations_with_ai.sessionId,
        url: conversations_with_ai.url,
        model: conversations_with_ai.model,
        createdAt: conversations_with_ai.createdAt,
      })
      .from(conversations_with_ai)
      .leftJoin(sessions, eq(conversations_with_ai.sessionId, sessions.id))
      .where(eq(sessions.projectId, project[0].id))
      .orderBy(desc(conversations_with_ai.createdAt))
      .limit(1);

    if (latestConversation.length === 0) {
      return res.status(404).json({ 
        error: 'Aucune conversation IA trouvée pour ce projet',
        code: 'NO_AI_CONVERSATION_FOUND'
      });
    }

    const response: ConversationResponse = {
      id: latestConversation[0].id,
      sessionId: latestConversation[0].sessionId,
      url: latestConversation[0].url,
      model: latestConversation[0].model,
      createdAt: latestConversation[0].createdAt,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'GET_LATEST_AI_CONVERSATION_ERROR'
    });
  }
};
