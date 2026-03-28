const { Pool } = require('pg');

function buildPoolConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return {};

  // Cloud SQL Unix socket: postgresql://user:pass@/db?host=/cloudsql/project:region:instance
  const hostMatch = dbUrl.match(/[?&]host=([^&]+)/);
  if (hostMatch) {
    const urlWithoutHost = dbUrl.replace(/[?&]host=[^&]+/, '').replace(/\?$/, '');
    const m = urlWithoutHost.match(/^postgresql:\/\/([^:]+):([^@]+)@\/(.+)$/);
    if (m) {
      return { user: m[1], password: m[2], database: m[3], host: hostMatch[1] };
    }
  }

  return { connectionString: dbUrl };
}

const pool = new Pool({
  ...buildPoolConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function queryOne(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

async function queryAll(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

module.exports = { pool, query, queryOne, queryAll };
