import './alias-config';

import app from './app';
import dotenv from 'dotenv';
import { initializeDefaultAnalysisSteps, startTimeoutMonitoring } from '@/controllers/workflow.controller';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Health check available at: http://${HOST}:${PORT}/api/health`);
  
  try {
    // Initialiser les étapes d'analyse par défaut
    await initializeDefaultAnalysisSteps();
    console.log(`✅ Default analysis steps initialized`);
    
    // Démarrer le monitoring des tâches en timeout
    startTimeoutMonitoring();
    console.log(`✅ Timeout monitoring started`);
  } catch (error) {
    console.error(`❌ Error initializing application:`, error);
  }
});
