import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const sql = readFileSync(join(__dirname, '../prisma/migrations/001_init/migration.sql'), 'utf8');
  await client.query(sql);
  await client.end();
  console.log('Migration 001_init applied');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
