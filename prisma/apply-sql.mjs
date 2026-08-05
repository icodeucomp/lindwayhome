/**
 * Applies a .sql file to DATABASE_URL. Exists because psql is not installed in
 * every environment this repo is developed in, while `pg` is already a dependency.
 *
 *   node prisma/apply-sql.mjs prisma/triggers/product-stock.sql
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node prisma/apply-sql.mjs <file.sql>");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(readFileSync(file, "utf8"));
  console.log(`✓ applied ${file}`);
} catch (error) {
  console.error(`✗ failed applying ${file}:`, error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
