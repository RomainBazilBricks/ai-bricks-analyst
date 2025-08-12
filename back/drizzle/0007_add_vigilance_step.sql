-- Migration pour ajouter l'étape "Points de vigilance" et réorganiser les ordres
-- 1. Décaler l'étape 4 (Rédaction du message) vers l'ordre 5
-- 2. Ajouter la nouvelle étape "Points de vigilance" à l'ordre 4

-- Cette migration a déjà été appliquée via le script add_vigilance_step.js
-- Ce fichier sert de documentation pour les futurs déploiements

UPDATE "analysis_steps" SET "order" = 5 WHERE "order" = 4;

INSERT INTO "analysis_steps" (name, description, prompt, "order", is_active, created_at) 
VALUES (
  'Points de vigilance',
  'Identification des risques critiques qui pourraient compromettre le financement',
  'Analysez le projet d''investissement immobilier et identifiez tous les points de vigilance critiques qui pourraient compromettre l''obtention du financement. Organisez votre analyse en catégories : 1) Risques financiers (ratio d''endettement, capacité de remboursement, apport personnel), 2) Risques juridiques (servitudes, litiges, conformité), 3) Risques techniques (état du bien, travaux nécessaires, diagnostics), 4) Risques de marché (localisation, évolution des prix, demande locative). Pour chaque point, évaluez le niveau de criticité et proposez des solutions ou documents complémentaires.',
  4,
  1,
  NOW()
); 