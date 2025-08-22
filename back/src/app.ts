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
        // Nettoyer les caractères de contrôle problématiques
        let cleanedBody = body.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
        
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
        console.error('❌ Contenu autour de la position d\'erreur:', body.substring(Math.max(0, 13241 - 200), 13241 + 200));
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

