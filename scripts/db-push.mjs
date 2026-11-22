import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing in .env.local");
  process.exit(1);
}

const migrationsDir = path.resolve("supabase/migrations");
const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No migration files found.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log(`Connected. Applying ${files.length} migrations...`);

  await client.query(`
    create table if not exists public._migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  for (const file of files) {
    const { rows } = await client.query("select 1 from public._migrations where id = $1", [file]);
    if (rows.length > 0) {
      console.log(`skip  ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const transactional = !/\bADD VALUE\b/i.test(sql) && !/\bCONCURRENTLY\b/i.test(sql);
    console.log(`apply ${file}${transactional ? "" : " (no tx)"}`);
    try {
      if (transactional) await client.query("begin");
      await client.query(sql);
      await client.query("insert into public._migrations(id) values ($1)", [file]);
      if (transactional) await client.query("commit");
      console.log(`ok    ${file}`);
    } catch (err) {
      if (transactional) await client.query("rollback");
      console.error(`fail  ${file}`);
      console.error(err.message);
      process.exit(1);
    }
  }

  await client.end();
  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
