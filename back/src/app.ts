import './alias-config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import usersRoutes from '@/routes/users.routes';
import authRoutes from '@/routes/auth.routes';
import projectRoutes from '@/routes/projects.routes';
import workflowRoutes from '@/routes/workflow.routes';
import aiCredentialsRoutes from '@/routes/ai-credentials.routes';
import apiConfigRoutes from '@/routes/api-config.routes';
import aiConversationsRoutes from '@/routes/ai-conversations.routes';
import slackTestRoutes from '@/routes/slack-test.routes';
import openRouterRoutes from '@/routes/openrouter.routes';
import { getCredentialByPlatformAndUserPublic } from '@/controllers/ai-credentials.controller';

const app = express();

// Configuration CORS pour permettre les requêtes depuis le frontend
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction ? false : ['http://localhost:5173'], // Désactiver CORS en production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware JSON custom global qui nettoie les caractères de contrôle et corrige les erreurs communes
app.use((req, res, next) => {
  // Seulement pour les requêtes JSON
  if (req.headers['content-type']?.includes('application/json')) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        // Fonction pour nettoyer et échapper le contenu JSON
        function cleanJsonContent(content: string): string {
          // 1. Nettoyer les caractères de contrôle problématiques (sauf \n, \r, \t)
          let cleaned = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
          
          // 2. Échapper les caractères spéciaux dans les valeurs de chaînes
          // Remplacer les caractères qui peuvent casser le JSON
          cleaned = cleaned.replace(/\\/g, '\\\\'); // Échapper les backslashes
          cleaned = cleaned.replace(/"/g, '\\"'); // Échapper les guillemets dans les valeurs
          cleaned = cleaned.replace(/\n/g, '\\n'); // Échapper les retours à la ligne
          cleaned = cleaned.replace(/\r/g, '\\r'); // Échapper les retours chariot
          cleaned = cleaned.replace(/\t/g, '\\t'); // Échapper les tabulations
          
          return cleaned;
        }
        
        // Nettoyer le contenu JSON de manière plus robuste
        let cleanedBody = body;
        
        // Identifier et nettoyer le contenu des chaînes JSON
        cleanedBody = cleanedBody.replace(/"([^"]*(?:\\.[^"]*)*)"/g, (match, content) => {
          // Ne pas nettoyer les clés JSON (qui sont courtes et sans caractères spéciaux)
          if (content.length < 50 && !/[[\]{}()]/.test(content)) {
            return match; // Garder les clés telles quelles
          }
          
          // Nettoyer le contenu des valeurs longues
          const cleaned = content
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Supprimer les caractères de contrôle
            .replace(/\\/g, '\\\\') // Échapper les backslashes
            .replace(/"/g, '\\"') // Échapper les guillemets
            .replace(/\n/g, '\\n') // Échapper les retours à la ligne
            .replace(/\r/g, '\\r') // Échapper les retours chariot
            .replace(/\t/g, '\\t'); // Échapper les tabulations
          
          return `"${cleaned}"`;
        });
        
        // Corrections multiples pour les erreurs JSON communes de Bubble
        
        // 1. Corriger les virgules manquantes entre éléments de tableau
        // Pattern: "text""autre_text" -> "text","autre_text"
        cleanedBody = cleanedBody.replace(/("(?:[^"\\]|\\.)*")("(?:[^"\\]|\\.)*")/g, '$1,$2');
        
        // 2. Corriger les virgules manquantes après les valeurs dans les objets
        // Pattern: "key":"value""autre_key" -> "key":"value","autre_key"
        cleanedBody = cleanedBody.replace(/("(?:[^"\\]|\\.)*":\s*"(?:[^"\\]|\\.)*")("(?:[^"\\]|\\.)*")/g, '$1,$2');
        
        // 3. Appliquer la correction plusieurs fois pour les cas multiples
        for (let i = 0; i < 3; i++) {
          cleanedBody = cleanedBody.replace(/("(?:[^"\\]|\\.)*")("(?:[^"\\]|\\.)*")/g, '$1,$2');
        }
        
        console.log('🧹 JSON nettoyé et corrigé pour:', req.path);
        
        // Parser le JSON nettoyé
        req.body = JSON.parse(cleanedBody);
        console.log('✅ JSON parsé avec succès pour:', req.path);
        next();
      } catch (error) {
        console.error('❌ Erreur parsing JSON même après nettoyage:', error);
        console.error('❌ Contenu problématique (premiers 1000 chars):', body.substring(0, 1000));
        
        // Extraire la position d'erreur du message d'erreur
        const errorMessage = (error as Error).message;
        const positionMatch = errorMessage.match(/position (\d+)/);
        const errorPosition = positionMatch ? parseInt(positionMatch[1]) : 0;
        
        console.error('❌ Contenu autour de la position d\'erreur:', body.substring(Math.max(0, errorPosition - 200), errorPosition + 200));
        return res.status(400).json({
          error: 'Format JSON invalide',
          details: (error as Error).message,
          code: 'JSON_PARSE_ERROR'
        });
      }
    });
  } else {
    // Pour les autres types de contenu, utiliser le middleware standard
    express.json()(req, res, next);
  }
});

// Servir les fichiers statiques du frontend en production
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Endpoint GET
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!!');
});

// Endpoint POST
app.post('/api/message', (req: Request, res: Response) => {
  const { message } = req.body;
  res.json({ received: message });
});

// Routes API
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/ai-credentials', aiCredentialsRoutes);
app.use('/api/api-configs', apiConfigRoutes);
app.use('/api/ai-conversations', aiConversationsRoutes);
app.use('/api/slack', slackTestRoutes);
app.use('/api/openrouter', openRouterRoutes);

// Route publique pour l'intégration externe (sécurisée par clé API)
app.get('/api/public/ai-credentials/platform/:platform/user/:userIdentifier', getCredentialByPlatformAndUserPublic);

// Health check pour Railway
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Test basique de la base de données
    await db.execute(sql`SELECT 1`);
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: (error as Error).message
    });
  }
});

// Catch-all handler: renvoie l'index.html pour toutes les routes non-API en production
if (isProduction) {
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

export default app;

