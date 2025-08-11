import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { parse } from 'pg-connection-string';

dotenv.config();

const config = parse(process.env.DATABASE_URL!);

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: config.host!,
    port: config.port ? parseInt(config.port) : 5432,
    user: config.user!,
    password: config.password!,
    database: config.database!,
    ssl: true,
  },
} satisfies Config;
