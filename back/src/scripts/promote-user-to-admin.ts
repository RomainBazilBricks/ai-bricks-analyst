import '../alias-config';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Script pour promouvoir un utilisateur en administrateur
 * Usage: npm run promote-admin <email>
 */
async function promoteUserToAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Veuillez fournir un email d\'utilisateur');
    console.log('Usage: npm run promote-admin <email>');
    process.exit(1);
  }

  try {
    // Vérifier si l'utilisateur existe
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user[0]) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      process.exit(1);
    }

    if (user[0].role === 'admin') {
      console.log(`✅ L'utilisateur ${email} est déjà administrateur`);
      process.exit(0);
    }

    // Promouvoir l'utilisateur en admin
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, email));

    console.log(`✅ L'utilisateur ${email} a été promu administrateur avec succès`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la promotion:', error);
    process.exit(1);
  }
}

promoteUserToAdmin();
