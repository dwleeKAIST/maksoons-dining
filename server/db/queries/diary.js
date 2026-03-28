const { queryOne, queryAll, query } = require('../connection');

async function getAllDiaryEntries(householdId) {
  return queryAll(
    `SELECT d.*, w.name as wine_name, w.vintage, w.wine_type, w.region
     FROM wine_diary d
     JOIN wines w ON w.id = d.wine_id
     WHERE d.household_id = $1
     ORDER BY d.consumed_date DESC, d.created_at DESC`,
    [householdId]
  );
}

async function getDiaryByWine(wineId, householdId) {
  return queryAll(
    `SELECT d.*, u.name as user_name
     FROM wine_diary d
     JOIN users u ON u.id = d.user_id
     WHERE d.wine_id = $1 AND d.household_id = $2
     ORDER BY d.consumed_date DESC`,
    [wineId, householdId]
  );
}

async function addDiaryEntry(householdId, userId, data) {
  return queryOne(
    `INSERT INTO wine_diary (wine_id, household_id, user_id, rating, tasting_notes, consumed_date, occasion, food_pairing)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      data.wine_id, householdId, userId, data.rating,
      data.tasting_notes || null, data.consumed_date || new Date().toISOString().split('T')[0],
      data.occasion || null, data.food_pairing || null,
    ]
  );
}

async function updateDiaryEntry(id, householdId, data) {
  const sets = [];
  const vals = [];
  let i = 1;
  const allowed = ['rating', 'tasting_notes', 'consumed_date', 'occasion', 'food_pairing'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(data[key]);
    }
  }
  if (sets.length === 0) return null;
  vals.push(id, householdId);
  return queryOne(
    `UPDATE wine_diary SET ${sets.join(', ')} WHERE id = $${i++} AND household_id = $${i} RETURNING *`,
    vals
  );
}

async function deleteDiaryEntry(id, householdId) {
  return queryOne('DELETE FROM wine_diary WHERE id = $1 AND household_id = $2 RETURNING id', [id, householdId]);
}

async function getRecentDiary(householdId, limit = 10) {
  return queryAll(
    `SELECT d.*, w.name as wine_name, w.vintage, w.wine_type
     FROM wine_diary d
     JOIN wines w ON w.id = d.wine_id
     WHERE d.household_id = $1
     ORDER BY d.consumed_date DESC
     LIMIT $2`,
    [householdId, limit]
  );
}

module.exports = {
  getAllDiaryEntries,
  getDiaryByWine,
  addDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  getRecentDiary,
};
