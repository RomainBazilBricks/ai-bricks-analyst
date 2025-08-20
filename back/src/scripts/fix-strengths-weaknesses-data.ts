#!/usr/bin/env tsx

import { db } from '@/db/index';
import { sql } from 'drizzle-orm';

async function fixStrengthsWeaknessesData() {
  try {
    console.log('🔄 Nettoyage des données strengths_and_weaknesses...');

    // D'abord, vérifions les données existantes dans vigilance_points
    const existingData = await db.execute(sql`
      SELECT id, why_vigilance, title 
      FROM vigilance_points 
      LIMIT 10
    `);
    
    console.log('📊 Données existantes:', existingData.rows);

    // Mettre à jour les données pour qu'elles correspondent à l'enum
    // Toutes les données existantes seront considérées comme des "weakness" par défaut
    await db.execute(sql`
      UPDATE vigilance_points 
      SET why_vigilance = 'weakness'
      WHERE why_vigilance NOT IN ('strength', 'weakness')
    `);

    console.log('✅ Données nettoyées avec succès');

    // Vérifier le résultat
    const updatedData = await db.execute(sql`
      SELECT DISTINCT why_vigilance 
      FROM vigilance_points
    `);
    
    console.log('📊 Valeurs distinctes après nettoyage:', updatedData.rows);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixStrengthsWeaknessesData();
}

export { fixStrengthsWeaknessesData };
