require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, queryOne } = require('./connection');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const failed = [];

  for (const file of files) {
    const existing = await queryOne('SELECT id FROM _migrations WHERE name = $1', [file]);
    if (existing) {
      console.log(`[migrate] Skip (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`[migrate] Applying: ${file}`);
    try {
      await query(sql);
      await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`[migrate] Applied: ${file}`);
    } catch (err) {
      console.error(`[migrate] FAILED: ${file} — ${err.message}`);
      failed.push(file);
    }
  }

  if (failed.length > 0) {
    console.warn(`[migrate] ${failed.length} migration(s) failed: ${failed.join(', ')}`);
  }
  console.log('[migrate] Migration run complete.');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => { console.error('[migrate] Error:', err); process.exit(1); });
} else {
  module.exports = migrate;
}
