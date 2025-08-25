import { Request, Response } from 'express';
import { openRouterService } from '../services/openrouter.service';
import type { 
  OpenRouterTestRequest,
  OpenRouterTestResponse,
  OpenRouterModel 
} from '@shared/types/openrouter';

/**
 * Teste la connectivité avec OpenRouter
 * @route GET /api/openrouter/health
 * @returns {object} Statut de la connectivité
 */
export const checkOpenRouterHealth = async (req: Request, res: Response): Promise<any> => {
  try {
    const healthCheck = await openRouterService.healthCheck();
    
    if (healthCheck.success) {
      res.json({
        success: true,
        message: healthCheck.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        message: healthCheck.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Liste les modèles disponibles sur OpenRouter
 * @route GET /api/openrouter/models
 * @returns {OpenRouterModel[]} Liste des modèles disponibles
 */
export const getAvailableModels = async (req: Request, res: Response): Promise<any> => {
  try {
    const models = openRouterService.getAvailableModels();
    
    res.json({
      success: true,
      models,
      count: models.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Teste un modèle spécifique avec un prompt
 * @route POST /api/openrouter/test
 * @param {OpenRouterTestRequest} body - Paramètres du test
 * @returns {OpenRouterTestResponse} Résultat du test
 */
export const testModel = async (req: Request, res: Response): Promise<any> => {
  try {
    const { model, prompt, temperature, max_tokens } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Modèle et prompt requis',
        code: 'MISSING_PARAMETERS'
      });
    }

    const testRequest: OpenRouterTestRequest = {
      model,
      prompt,
      temperature,
      max_tokens
    };

    const result = await openRouterService.testModel(testRequest);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Appel spécifique à GPT-4o via OpenRouter
 * @route POST /api/openrouter/gpt4o
 * @param {string} prompt - Le prompt à envoyer
 * @param {string} systemPrompt - Prompt système optionnel
 * @param {number} temperature - Température (0-1)
 * @param {number} max_tokens - Nombre maximum de tokens
 * @returns {OpenRouterTestResponse} Réponse de GPT-4o
 */
export const callGPT4o = async (req: Request, res: Response): Promise<any> => {
  try {
    const { prompt, systemPrompt, temperature, max_tokens } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt requis',
        code: 'MISSING_PROMPT'
      });
    }

    console.log(`🚀 Appel GPT-4o via OpenRouter avec prompt: "${prompt.substring(0, 100)}..."`);

    const result = await openRouterService.callGPT4o(prompt, {
      systemPrompt,
      temperature,
      max_tokens
    });
    
    if (result.success) {
      console.log(`✅ Réponse GPT-4o reçue (${result.usage?.total_tokens} tokens)`);
      res.json(result);
    } else {
      console.error(`❌ Erreur GPT-4o: ${result.error}`);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Erreur controller GPT-4o:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Endpoint de test rapide pour GPT-4o
 * @route GET /api/openrouter/gpt4o/quick-test
 * @returns {OpenRouterTestResponse} Test simple de GPT-4o
 */
export const quickTestGPT4o = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('🧪 Test rapide GPT-4o via OpenRouter...');
    
    const result = await openRouterService.callGPT4o(
      'Salut ! Peux-tu me dire en une phrase que tu es GPT-4o et que tu fonctionnes via OpenRouter ?',
      {
        systemPrompt: 'Tu es un assistant IA qui répond de manière concise et amicale.',
        temperature: 0.3,
        max_tokens: 100
      }
    );
    
    if (result.success) {
      console.log('✅ Test GPT-4o réussi !');
      res.json({
        ...result,
        test_type: 'quick_test',
        message: 'Test rapide GPT-4o réussi'
      });
    } else {
      console.error(`❌ Test GPT-4o échoué: ${result.error}`);
      res.status(400).json({
        ...result,
        test_type: 'quick_test',
        message: 'Test rapide GPT-4o échoué'
      });
    }
  } catch (error) {
    console.error('❌ Erreur test rapide GPT-4o:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR',
      test_type: 'quick_test'
    });
  }
};
