const { queryOne, queryAll, query } = require('../connection');

async function trackUsage(householdId, userId, month, inputTokens, outputTokens, costUsd) {
  return query(
    `INSERT INTO bot_usage (household_id, user_id, month, input_tokens, output_tokens, cost_usd)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [householdId, userId, month, inputTokens, outputTokens, costUsd]
  );
}

async function getMonthlyUsage(householdId, month) {
  return queryOne(
    `SELECT COALESCE(SUM(input_tokens), 0) as total_input,
            COALESCE(SUM(output_tokens), 0) as total_output,
            COALESCE(SUM(cost_usd), 0) as total_cost_usd
     FROM bot_usage WHERE household_id = $1 AND month = $2`,
    [householdId, month]
  );
}

// Wiki
async function getRecentWiki(householdId, limit = 20) {
  return queryAll(
    `SELECT * FROM bot_wiki WHERE household_id = $1 ORDER BY updated_at DESC LIMIT $2`,
    [householdId, limit]
  );
}

async function searchWiki(householdId, searchQuery) {
  return queryAll(
    `SELECT * FROM bot_wiki WHERE household_id = $1
     AND (title ILIKE $2 OR content ILIKE $2 OR category ILIKE $2)
     ORDER BY updated_at DESC LIMIT 10`,
    [householdId, `%${searchQuery}%`]
  );
}

async function saveWiki(householdId, title, content, category) {
  return queryOne(
    `INSERT INTO bot_wiki (household_id, title, content, category)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [householdId, title, content, category || null]
  );
}

async function deleteWiki(id, householdId) {
  return queryOne('DELETE FROM bot_wiki WHERE id = $1 AND household_id = $2 RETURNING id', [id, householdId]);
}

module.exports = {
  trackUsage,
  getMonthlyUsage,
  getRecentWiki,
  searchWiki,
  saveWiki,
  deleteWiki,
};
