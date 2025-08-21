const axios = require('axios');

// Données exactes de Bubble avec caractères problématiques
const bubbleData = {
  "project_bubble_uniqueId": "1751634726443x470302460201926660",
  "filesUrls": [
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751634908943x879596519496958600/IMG_1923.jpeg",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751634921777x920379779519970200/Insertion%2C%20Place%20Franc%C3%8C%C2%A7ois%201er%20final.jpg",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751897403923x988193113707294000/Acte%20du%2026%20octobre%202012.pdf",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752605197540x346418453575767500/25058%20-%20REHABILATATION%20DE%20L%27APPARTEMENT%20N%C2%B07%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752605210574x293916366959966700/25058%20-%20REHABILATATION%20DE%206%20APPARTEMENTS%20DU%20N%C2%B01%20AU%20N%C2%B06%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752605220274x679516896083760500/avis%20de%20valeur%207%20appts%20ARCADOM.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679623007x564060210435302300/Extrait%20KBIS.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679652832x283257305437437900/25058%20-%20REHABILATATION%20DE%206%20APPARTEMENTS%20DU%20N%C2%B01%20AU%20N%C2%B06%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf"
  ],
  "projectName": "Les Salons de la Cité",
  "conversations": `Auteur : Porteur de projet
Message : Bonjour, votre tableur est trop restrictif. Je recherche un financement de 750 000 euros (cout total) pour réaliser des travaux dans la dernière partie d'un bâtiment que nous savons entièrement rénové. Ce financement permettra de commercialiser 7 appartements pour une valeur de 2 000KE. Les garanties sont faciles à proposer.
Ce n'est pas une opération en VEFA, nous devons donc réaliser les appartements pour les vendre.
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour,
Merci pour les précisions. Dans le tableau dans coûts, vous pouvez mettre 0€ en coût d'acquisition étant donné que vous possédez déjà le bien et indiquer les coûts des travaux dans la section dédiée.
[justify][highlight=transparent]Voici les documents requis dans le cadre d'un projet de marchand de biens :&nbsp;[/highlight][/justify]
[justify][/justify]
[ml][ul][li indent=0 align=left][highlight=transparent]Fiche détaillée[/highlight][/li][li indent=0 align=left][highlight=transparent]Compromis de vente&nbsp;ou titre de propriété[/highlight][/li][li indent=0 align=left][highlight=transparent]Preuve de fonds propre [/highlight](une capture d'écran du compte portant l'apport suffit / 10 à 15% d'apport sont généralement souhaités)[/li][li indent=0 align=left][highlight=transparent]Si découpe[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Permis d'aménager[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Permis de construire / décla préalable&nbsp;[/highlight][/li][li indent=0 align=left][highlight=transparent]Prévisionnel de l'opération (prix acquisition, montant travaux, marge)[/highlight][/li][li indent=0 align=left][highlight=transparent]Société (SIREN) / Nous ne pouvons pas financer les SCI et SCCV[/highlight][/li][li indent=0 align=left][highlight=transparent]Si travaux :&nbsp;[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Devis[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Avis de valeur lots à revendre et biens à acheter (réalisés par agence immo)&nbsp;[/highlight][/li][/ul][/ml][justify][highlight=transparent]Merci de privilégier le format PDF (y compris pour les fichiers Excel).[/highlight][/justify]
[justify][highlight=transparent]Une fois cela réalisé, nous pourrons envoyer votre dossier en analyse pour vous donner un retour et un premier accord de principe si le projet répond à nos critères. ✅[/highlight][/justify]
[justify][highlight=transparent]Belle journée,[/highlight][/justify]
[justify][highlight=transparent]Franck 🧱[/highlight][/justify]


_

Auteur : Porteur de projet
Message : Ok, je reviens vers vous avec les informations. Cordialement`,
  "fiche": `Présentation du projet par le porteur de projet :
Aménagement de 7 appartements dans un espace existant neuf dans les Salons de la Cité,  (bureaux, appartements de standing)
_
Présentation du porteur de projet par le porteur de projet :
SAS ARCADOM filiale de la SAS COLISEA
_
Présentation de la localisation par le porteur de projet :
Centre de la ville de Cognac (16100)à
_
Présentation de la structuration financière le porteur de projet :
Vente des appartements pour un total de 2M d'Euros dans un bâtiment que nous avons entièrement rénové pour un cout total d'environ 900 KE`
};

async function testBubbleRequest() {
  console.log('🧪 Test avec les données exactes de Bubble...\n');
  
  try {
    console.log('📤 Envoi de la requête POST /api/projects...');
    
    const response = await axios.post('http://localhost:3001/api/projects', bubbleData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCÈS ! Réponse reçue:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ ÉCHEC ! Erreur:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Pas de réponse du serveur');
      console.error('Request:', error.request);
    } else {
      console.error('Erreur de configuration:', error.message);
    }
  }
}

// Ajouter quelques caractères de contrôle pour tester le nettoyage
console.log('🔍 Ajout de caractères de contrôle pour tester le nettoyage...');
bubbleData.conversations += '\x0B\x0C\x1F'; // Ajout de caractères problématiques
bubbleData.fiche += '\x08\x0E\x7F'; // Ajout de caractères problématiques

testBubbleRequest();
