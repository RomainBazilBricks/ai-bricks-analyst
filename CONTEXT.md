Contexte Métier pour la Plateforme Centralisée d'Analyse de Dossiers chez Bricks.co
Introduction à Bricks.co
Bricks.co est une plateforme d'investissement immobilier fractionné qui démocratise l'accès à l'immobilier locatif. Elle permet aux investisseurs particuliers d'acquérir des parts dans des biens immobiliers sélectionnés, en générant des revenus locatifs mensuels sans les contraintes traditionnelles de la propriété (gestion, entretien, etc.). L'entreprise cible un public large, des investisseurs novices aux plus expérimentés, en mettant l'accent sur la simplicité, la transparence et la rentabilité. Avec une croissance rapide, Bricks.co gère un volume croissant de dossiers d'investissement, incluant des documents variés comme des rapports financiers, contrats de location, évaluations immobilières et analyses de marché.
L'objectif principal est de centraliser les processus métier autour d'une plateforme unique qui fluidifie l'analyse de ces dossiers, accélère les décisions d'investissement et améliore l'expérience utilisateur, tout en intégrant des fonctionnalités d'automatisation et des interfaces API pour interagir avec des outils externes comme ManusAI et des services de stockage comme AWS.
Besoins Métier Principaux
La plateforme vise à répondre à plusieurs enjeux métier critiques :

Centralisation des Données : Tous les dossiers d'investissement (composés de documents variés tels que PDF de contrats, tableaux Excel de projections financières, rapports d'expertise immobilière) doivent être accessibles en un seul point d'entrée via une API. Cela évite la dispersion des informations et facilite le suivi pour les équipes internes, les investisseurs et les outils externes comme ManusAI.
Automatisation de l'Analyse : Les dossiers nécessitent une évaluation rapide pour identifier les opportunités d'investissement, évaluer les risques (comme la rentabilité locative, la stabilité du marché) et générer des synthèses actionnables. L'automatisation permet de traiter un plus grand nombre de dossiers sans augmentation proportionnelle des ressources humaines, en intégrant des outils comme ManusAI pour l'analyse.
Gestion des Projets et Documents :
Envoi de Documents : Les documents, originellement stockés dans l'espace financement de Bubble.io, doivent être transférés via une API POST vers un stockage AWS, rattachés à un projet spécifique en base de données (identifié par un projectUniqueId). Si le projet n'existe pas, il est créé ; si le projet existe, le document est rattaché sans duplication si le fichier existe déjà.
Récupération des Documents : Une API GET permet à ManusAI de récupérer les documents associés à un projet pour analyse, en garantissant un accès rapide et sécurisé.
Réception des Synthèses : Une API POST permet à ManusAI de renvoyer la synthèse de l'analyse, qui est rattachée au projet correspondant en base de données pour un suivi centralisé.


Visualisation et Traçabilité : Les projets, leurs documents bruts, les URLs des conversations ManusAI associées et les synthèses générées doivent être accessibles et affichables pour les équipes internes, permettant un suivi complet du cycle de vie d'un dossier.
Conformité et Transparence : Assurer que les analyses respectent les normes réglementaires du secteur immobilier (ex. : transparence financière, protection des investisseurs), en centralisant les traces des évaluations et en sécurisant les accès API.
Intégration Fluide des Résultats : Les synthèses générées par ManusAI doivent être intégrées automatiquement dans les systèmes internes pour déclencher des actions métier, comme l'approbation d'un projet d'investissement, la mise à jour des dashboards investisseurs ou l'envoi de notifications.

Ces besoins permettent à Bricks.co de scaler ses opérations tout en maintenant une haute qualité de service.
Flux Opérationnels Métier
La plateforme centralisée opère selon un flux métier linéaire et automatisé, orienté sur les résultats business :

Création ou Mise à Jour d'un Projet :
Un dossier est initié lorsqu'un nouveau bien immobilier est proposé ou qu'un investisseur soumet une demande via Bubble.io.
Les documents associés (ex. : acte de propriété, bilan locatif) sont envoyés via une API POST depuis Bubble.io vers AWS pour stockage. Le projet est créé en base de données avec un projectUniqueId unique, ou mis à jour si le projet existe déjà. Les documents sont rattachés au projet, avec une vérification pour éviter les doublons (ex. : via hash ou nom de fichier).


Accès aux Documents :
Une API GET expose les documents d'un projet (identifié par projectUniqueId) pour permettre à ManusAI de les récupérer pour analyse. Les documents sont accessibles via des URLs sécurisées pointant vers AWS (ex. : S3 pre-signed URLs).


Lancement de l'Analyse :
Automatiquement ou sur demande, le dossier est soumis à ManusAI via une conversation initiée avec un prompt prédéfini (ex. : "Analyse ces documents, extrais les points clés, fais une synthèse, puis POST la synthèse vers [API_URL]"). Cela inclut l'extraction de données clés (ex. : rendement attendu, localisation du bien, historique locatif) et la génération d'une synthèse métier.


Réception et Stockage de la Synthèse :
Une fois l'analyse terminée, ManusAI envoie la synthèse via une API POST à la plateforme. La synthèse est rattachée au projet correspondant en base de données, avec un lien vers la conversation ManusAI pour traçabilité.


Visualisation des Données :
Les équipes internes peuvent consulter une interface affichant :
La liste des projets avec leur projectUniqueId.
Les documents bruts associés (accessibles via liens AWS).
Les URLs des conversations ManusAI pour chaque projet.
Les synthèses générées, prêtes à être exploitées pour des décisions ou partagées avec les investisseurs.




Exploitation des Résultats :
Les synthèses sont poussées vers les outils métier connexes, comme le dashboard des investisseurs pour visualiser les opportunités, ou le CRM pour suivre les interactions clients. Cela déclenche des actions comme l'ouverture d'une campagne d'investissement ou l'alerte sur un risque élevé.



Ce flux assure une continuité métier, de la collecte des données à l'exploitation des insights, sans silos.
Bénéfices Métier Attendus
La mise en place de cette plateforme centralisée apporte des avantages directs sur les performances business de Bricks.co :

Gain d'Efficacité Opérationnelle : Réduction du temps d'analyse de dossiers de plusieurs jours à quelques heures grâce à l'automatisation et l'intégration avec ManusAI, permettant de traiter plus de projets immobiliers et d'attirer plus d'investisseurs.
Centralisation et Accessibilité : Un point d'entrée unique pour les projets, documents, conversations ManusAI et synthèses améliore la collaboration interne et la prise de décision rapide.
Amélioration de la Rentabilité : Des analyses précises minimisent les risques d'investissement ratés, optimisant le portefeuille global et augmentant les revenus locatifs partagés.
Satisfaction Client : Les investisseurs bénéficient de rapports clairs et rapides, renforçant la confiance et la fidélité. Par exemple, une synthèse personnalisée peut aider un investisseur à diversifier son portefeuille en fonction de son profil de risque.
Scalabilité Business : La plateforme supporte la croissance, en gérant un volume croissant de dossiers sans impact sur la qualité, facilitant l'expansion vers de nouveaux marchés immobiliers.
Traçabilité et Conformité : Les URLs des conversations ManusAI et les synthèses archivées garantissent une transparence totale, essentielle pour les audits et la conformité réglementaire.
Avantage Concurrentiel : En centralisant l'intelligence métier et en automatisant via des API robustes, Bricks.co se positionne comme leader innovant dans l'investissement fractionné, différenciant ses services par la rapidité et la fiabilité des évaluations.

Acteurs Métier Impliqués

Équipes Internes : Analystes immobiliers et financiers qui utilisent la plateforme pour valider des opportunités ; équipes commerciales pour exploiter les synthèses dans les pitches investisseurs ; équipes conformité pour vérifier les analyses.
Investisseurs : Accèdent indirectement aux résultats via des dashboards, recevant des recommandations personnalisées basées sur les synthèses.
Partenaires Externes : Promoteurs immobiliers ou experts qui soumettent des dossiers via Bubble.io, bénéficiant d'un processus accéléré pour l'approbation.
Direction : Utilise les insights agrégés pour des décisions stratégiques, comme l'allocation de fonds ou l'évaluation de la performance globale.
Outil Externe (ManusAI) : Interagit avec la plateforme via API pour récupérer les documents, effectuer les analyses et renvoyer les synthèses, agissant comme un partenaire clé dans l'automatisation.

Spécifications Fonctionnelles Métier

API POST pour Envoi de Documents :
Fonction : Transférer un fichier depuis l'espace financement Bubble.io vers AWS S3, créer ou mettre à jour un projet en base de données, et rattacher le fichier au projet.
Logique :
Entrée : Fichier (PDF, Excel, etc.), projectUniqueId, métadonnées (ex. : nom du fichier, type).
Comportement :
Si le projet n'existe pas, créer un projet avec projectUniqueId en base de données.
Si le projet existe, rattacher le fichier au projet existant.
Vérifier si le fichier existe déjà (ex. : via hash ou nom) pour éviter les doublons.


Sortie : Confirmation de l'upload et de l'association au projet.


Exemple : Un promoteur upload un contrat PDF pour le projet "Immeuble Lyon 2025". Si le projet existe, le PDF est rattaché ; sinon, un nouveau projet est créé.


API GET pour Récupération des Documents :
Fonction : Permettre à ManusAI de récupérer les documents associés à un projectUniqueId.
Logique :
Entrée : projectUniqueId.
Sortie : Liste de documents (URLs AWS S3 sécurisées ou contenu brut, selon les besoins).
Sécurité : Authentification via API key ou token pour restreindre l'accès à ManusAI.


Exemple : ManusAI appelle /projects/{projectUniqueId}/documents pour récupérer les fichiers d’un projet avant analyse.


API POST pour Réception des Synthèses :
Fonction : Recevoir la synthèse générée par ManusAI et l'associer au projet en base de données.
Logique :
Entrée : projectUniqueId, contenu de la synthèse (texte ou JSON).
Comportement : Stocker la synthèse en base de données, liée au projet, et enregistrer l’URL de la conversation ManusAI pour traçabilité.
Sortie : Confirmation de réception et association.


Exemple : ManusAI envoie { "projectUniqueId": "12345", "synthese": "Rendement attendu : 6%, risques modérés" } à /projects/synthese.


Interface de Visualisation :
Fonction : Afficher une vue centralisée pour les équipes internes.
Contenu :
Liste des projets avec leur projectUniqueId.
Documents bruts associés (liens vers AWS S3).
URLs des conversations ManusAI (pour consulter l’historique).
Synthèses générées (texte ou formaté pour lecture facile).


Exemple : Un tableau montre le projet "Immeuble Lyon 2025", ses 3 documents (contrat, bilan, expertise), l’URL de la convo ManusAI, et la synthèse "Rendement 6%, bien situé, faible risque".



Vision Métier Globale
Cette plateforme n'est pas seulement un outil d'analyse, mais un hub métier qui transforme les données brutes en valeur ajoutée pour Bricks.co. Elle aligne les opérations quotidiennes avec la mission de démocratiser l'investissement immobilier, en rendant les processus plus intelligents, centralisés et centrés sur l'utilisateur. À terme, elle pourrait évoluer pour inclure des prédictions marché, des simulations d'investissement ou des recommandations personnalisées avancées, renforçant la position de Bricks.co comme référence dans l'investissement fractionné. La combinaison d’un stockage robuste (AWS), d’une intégration AI (ManusAI) et d’une gestion centralisée des projets garantit une scalabilité et une efficacité inégalées.