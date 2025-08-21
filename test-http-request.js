const express = require('express');
const axios = require('axios');

const app = express();

// Middleware JSON custom comme dans notre code
app.use('/api/projects', express.raw({ type: 'application/json' }), (req, res, next) => {
  if (req.method === 'POST' && req.body) {
    try {
      // Convertir le buffer en string et nettoyer les caractères de contrôle
      let jsonString = req.body.toString('utf8');
      
      console.log('📥 JSON brut reçu (premiers 500 chars):');
      console.log(jsonString.substring(0, 500));
      console.log('...');
      
      // Chercher les caractères de contrôle
      const controlChars = jsonString.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
      if (controlChars) {
        console.log('❌ Caractères de contrôle trouvés:', controlChars.length);
        console.log('Premiers caractères problématiques:', controlChars.slice(0, 10).map(c => c.charCodeAt(0)));
      }
      
      // Nettoyer les caractères de contrôle problématiques mais garder les sauts de ligne légitimes
      jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
      
      // Parser le JSON nettoyé
      req.body = JSON.parse(jsonString);
      console.log('✅ JSON nettoyé et parsé avec succès');
    } catch (error) {
      console.error('❌ Erreur parsing JSON même après nettoyage:', error.message);
      return res.status(400).json({
        error: 'Format JSON invalide',
        details: error.message,
        code: 'JSON_PARSE_ERROR'
      });
    }
  }
  next();
});

// Parser JSON standard pour les autres routes
app.use(express.json());

// Route de test
app.post('/api/projects', (req, res) => {
  console.log('✅ Données reçues et parsées:');
  console.log('- projectName:', req.body.projectName);
  console.log('- filesUrls count:', req.body.filesUrls?.length);
  console.log('- conversations length:', req.body.conversations?.length);
  
  res.json({ 
    success: true, 
    message: 'Projet créé avec succès',
    projectName: req.body.projectName 
  });
});

// Démarrer le serveur
const server = app.listen(3001, () => {
  console.log('🚀 Serveur de test démarré sur http://localhost:3001');
  
  // Tester avec les données problématiques
  setTimeout(testWithProblematicData, 1000);
});

async function testWithProblematicData() {
  console.log('\n=== TEST AVEC DONNÉES BUBBLE ===');
  
  // Données exactes de Bubble
  const testData = {
    "project_bubble_uniqueId": "1751634726443x470302460201926660",
    "filesUrls": [
      "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751634908943x879596519496958600/IMG_1923.jpeg",
      "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751634921777x920379779519970200/Insertion%2C%20Place%20Franc%C3%8C%C2%A7ois%201er%20final.jpg"
    ],
    "projectName": "Les Salons de la Cité",
    "conversations": "Auteur : Porteur de projet\nMessage : Test avec caractères de contrôle\x0B\x0C\x1F",
    "fiche": "Test fiche"
  };
  
  try {
    console.log('📤 Envoi de la requête...');
    
    const response = await axios.post('http://localhost:3001/api/projects', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Réponse reçue:', response.data);
    
  } catch (error) {
    console.error('❌ Erreur requête:', error.response?.data || error.message);
  }
  
  // Fermer le serveur
  server.close();
  process.exit(0);
}
