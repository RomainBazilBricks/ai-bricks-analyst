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

const app = express();

// Configuration CORS pour permettre les requêtes depuis le frontend
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction ? false : ['http://localhost:5173'], // Désactiver CORS en production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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

