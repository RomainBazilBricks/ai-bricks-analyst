import 'module-alias/register';

import app from './app';
import dotenv from 'dotenv';
import { initializeDefaultAnalysisSteps } from '@/controllers/workflow.controller';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  // Initialiser les étapes d'analyse par défaut
  await initializeDefaultAnalysisSteps();
});
