import moduleAlias from 'module-alias';
import path from 'path';

// Configuration des alias selon l'environnement
const isProduction = process.env.NODE_ENV === 'production';
const baseDir = isProduction ? 'dist' : 'src';

moduleAlias.addAliases({
  '@': path.resolve(__dirname, isProduction ? '.' : '../src'),
  '@controllers': path.resolve(__dirname, `${isProduction ? '.' : '../src'}/controllers`),
  '@routes': path.resolve(__dirname, `${isProduction ? '.' : '../src'}/routes`),
  '@db': path.resolve(__dirname, `${isProduction ? '.' : '../src'}/db`),
});

console.log(`✅ Module aliases configured for ${isProduction ? 'production' : 'development'}`); 