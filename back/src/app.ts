import 'module-alias/register';
import express, { Request, Response } from 'express';
import cors from 'cors';
import usersRoutes from '@/routes/users.routes';
import authRoutes from '@/routes/auth.routes';
import projectRoutes from '@/routes/projects.routes';
import workflowRoutes from '@/routes/workflow.routes';
import aiCredentialsRoutes from '@/routes/ai-credentials.routes';

const app = express();

// Configuration CORS pour permettre les requêtes depuis le frontend
app.use(cors({
  origin: ['http://localhost:5173'], // Port du frontend Vite
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Endpoint GET
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!!');
});

// Endpoint POST
app.post('/api/message', (req: Request, res: Response) => {
  const { message } = req.body;
  res.json({ received: message });
});

app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/ai-credentials', aiCredentialsRoutes);

export default app;

