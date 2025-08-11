import 'module-alias/register';

import app from './app';
import dotenv from 'dotenv';
import { initializeDefaultAnalysisSteps } from '@/controllers/workflow.controller';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Health check available at: http://${HOST}:${PORT}/api/health`);
  
  try {
    // Initialiser les étapes d'analyse par défaut
    await initializeDefaultAnalysisSteps();
    console.log(`✅ Default analysis steps initialized`);
  } catch (error) {
    console.error(`❌ Error initializing default analysis steps:`, error);
  }
});
