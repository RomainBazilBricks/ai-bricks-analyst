#!/usr/bin/env tsx

import { db } from '@/db/index';
import { sql } from 'drizzle-orm';

async function fixStrengthsWeaknessesData() {
  try {
    console.log('🔄 Vérification des tables existantes...');

    // Vérifier quelles tables existent
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('vigilance_points', 'strengths_and_weaknesses')
    `);
    
    console.log('📊 Tables trouvées:', tables.rows);

    // Vérifier si vigilance_points existe
    const vigilancePointsExists = tables.rows.some((row: any) => row.table_name === 'vigilance_points');
    const strengthsWeaknessesExists = tables.rows.some((row: any) => row.table_name === 'strengths_and_weaknesses');

    if (vigilancePointsExists) {
      console.log('🔍 Table vigilance_points trouvée, nettoyage...');
      
      // Vérifier les données existantes
      const existingData = await db.execute(sql`
        SELECT DISTINCT why_vigilance 
        FROM vigilance_points 
        LIMIT 10
      `);
      
      console.log('📊 Valeurs existantes dans why_vigilance:', existingData.rows);

      // Mettre à jour les données pour qu'elles correspondent à l'enum
      await db.execute(sql`
        UPDATE vigilance_points 
        SET why_vigilance = 'weakness'
        WHERE why_vigilance NOT IN ('strength', 'weakness')
      `);

      console.log('✅ Données vigilance_points nettoyées');
    }

    if (strengthsWeaknessesExists) {
      console.log('🔍 Table strengths_and_weaknesses trouvée, vérification...');
      
      // Vérifier les données existantes
      const existingData = await db.execute(sql`
        SELECT DISTINCT type 
        FROM strengths_and_weaknesses 
        LIMIT 10
      `);
      
      console.log('📊 Valeurs existantes dans type:', existingData.rows);

      // Nettoyer si nécessaire
      await db.execute(sql`
        UPDATE strengths_and_weaknesses 
        SET type = 'weakness'
        WHERE type NOT IN ('strength', 'weakness')
      `);

      console.log('✅ Données strengths_and_weaknesses nettoyées');
    }

    console.log('✅ Nettoyage terminé avec succès');

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
