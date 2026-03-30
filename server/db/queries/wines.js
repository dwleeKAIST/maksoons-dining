const { queryOne, queryAll, query } = require('../connection');

async function getAllWines(householdId, filters = {}) {
  let sql = `
    SELECT w.*,
      (SELECT json_agg(json_build_object(
        'id', d.id, 'rating', d.rating, 'tasting_notes', d.tasting_notes,
        'consumed_date', d.consumed_date, 'user_id', d.user_id
      ) ORDER BY d.consumed_date DESC)
      FROM wine_diary d WHERE d.wine_id = w.id) as diary_entries
    FROM wines w
    WHERE w.household_id = $1
  `;
  const params = [householdId];
  let i = 2;

  if (filters.wine_type) {
    sql += ` AND w.wine_type = $${i++}`;
    params.push(filters.wine_type);
  }
  if (filters.vintage_min) {
    sql += ` AND w.vintage >= $${i++}`;
    params.push(filters.vintage_min);
  }
  if (filters.vintage_max) {
    sql += ` AND w.vintage <= $${i++}`;
    params.push(filters.vintage_max);
  }
  if (filters.drinking_recommendation) {
    sql += ` AND w.drinking_recommendation = $${i++}`;
    params.push(filters.drinking_recommendation);
  }
  if (filters.is_consumed !== undefined) {
    sql += ` AND w.is_consumed = $${i++}`;
    params.push(filters.is_consumed);
  }
  if (filters.search) {
    sql += ` AND (w.name ILIKE $${i} OR w.region ILIKE $${i} OR w.grape_variety ILIKE $${i} OR w.memo ILIKE $${i})`;
    params.push(`%${filters.search}%`);
    i++;
  }

  sql += ' ORDER BY w.is_consumed ASC, w.created_at DESC';
  return queryAll(sql, params);
}

async function getWineById(id, householdId) {
  return queryOne(
    `SELECT w.*,
      (SELECT json_agg(json_build_object(
        'id', d.id, 'rating', d.rating, 'tasting_notes', d.tasting_notes,
        'consumed_date', d.consumed_date, 'occasion', d.occasion,
        'food_pairing', d.food_pairing, 'user_id', d.user_id
      ) ORDER BY d.consumed_date DESC)
      FROM wine_diary d WHERE d.wine_id = w.id) as diary_entries
    FROM wines w
    WHERE w.id = $1 AND w.household_id = $2`,
    [id, householdId]
  );
}

async function addWine(householdId, userId, data) {
  return queryOne(
    `INSERT INTO wines (household_id, added_by, name, vintage, region, country, grape_variety,
      wine_type, purchase_price, estimated_price, quantity, storage_location, memo,
      purchase_date, drinking_window_start, drinking_window_end,
      drinking_recommendation, recommendation_reason, label_image_url, price_source,
      wine_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     RETURNING *`,
    [
      householdId, userId, data.name, data.vintage || null,
      data.region || null, data.country || null, data.grape_variety || null,
      data.wine_type || 'red', data.purchase_price || null, data.estimated_price || null,
      data.quantity || 1, data.storage_location || null, data.memo || null,
      data.purchase_date || null, data.drinking_window_start || null,
      data.drinking_window_end || null, data.drinking_recommendation || 'unknown',
      data.recommendation_reason || null, data.label_image_url || null,
      data.price_source || null, data.wine_description || null,
    ]
  );
}

async function updateWine(id, householdId, data) {
  const sets = [];
  const vals = [];
  let i = 1;
  const allowed = [
    'name', 'vintage', 'region', 'country', 'grape_variety', 'wine_type',
    'purchase_price', 'estimated_price', 'quantity', 'storage_location', 'memo',
    'purchase_date', 'drinking_window_start', 'drinking_window_end',
    'drinking_recommendation', 'recommendation_reason', 'is_consumed', 'label_image_url',
    'price_source', 'wine_description',
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(data[key]);
    }
  }
  if (sets.length === 0) return getWineById(id, householdId);
  sets.push(`updated_at = NOW()`);
  vals.push(id, householdId);
  return queryOne(
    `UPDATE wines SET ${sets.join(', ')} WHERE id = $${i++} AND household_id = $${i} RETURNING *`,
    vals
  );
}

async function deleteWine(id, householdId) {
  return queryOne('DELETE FROM wines WHERE id = $1 AND household_id = $2 RETURNING id', [id, householdId]);
}

async function searchWinesByName(householdId, name) {
  return queryAll(
    `SELECT * FROM wines WHERE household_id = $1 AND name ILIKE $2 ORDER BY created_at DESC`,
    [householdId, `%${name}%`]
  );
}

async function getWinesSummary(householdId) {
  return queryAll(
    `SELECT id, name, vintage, wine_type, quantity, drinking_recommendation, is_consumed,
      region, grape_variety, storage_location, purchase_price, estimated_price, price_source
     FROM wines WHERE household_id = $1
     ORDER BY is_consumed ASC, name ASC`,
    [householdId]
  );
}

async function getGuestWines(householdId, filters = {}) {
  let sql = `
    SELECT id, name, vintage, region, country, grape_variety, wine_type,
      quantity, drinking_window_start, drinking_window_end,
      drinking_recommendation, recommendation_reason,
      label_image_url, wine_description
    FROM wines
    WHERE household_id = $1 AND is_consumed = false
  `;
  const params = [householdId];
  let i = 2;

  if (filters.wine_type) {
    sql += ` AND wine_type = $${i++}`;
    params.push(filters.wine_type);
  }
  if (filters.country) {
    sql += ` AND country = $${i++}`;
    params.push(filters.country);
  }
  if (filters.grape_variety) {
    sql += ` AND grape_variety = $${i++}`;
    params.push(filters.grape_variety);
  }
  if (filters.drinking_recommendation) {
    sql += ` AND drinking_recommendation = $${i++}`;
    params.push(filters.drinking_recommendation);
  }
  if (filters.search) {
    sql += ` AND (name ILIKE $${i} OR region ILIKE $${i} OR country ILIKE $${i} OR grape_variety ILIKE $${i})`;
    params.push(`%${filters.search}%`);
    i++;
  }

  sql += ` ORDER BY CASE drinking_recommendation
    WHEN 'drink_soon' THEN 1
    WHEN 'optimal_now' THEN 2
    WHEN 'age_more' THEN 3
    ELSE 4 END,
    drinking_window_start ASC NULLS LAST, name ASC`;
  return queryAll(sql, params);
}

async function getGuestWineFilterOptions(householdId) {
  const countries = await queryAll(
    `SELECT DISTINCT country FROM wines WHERE household_id = $1 AND is_consumed = false AND country IS NOT NULL ORDER BY country`,
    [householdId]
  );
  const grapes = await queryAll(
    `SELECT DISTINCT grape_variety FROM wines WHERE household_id = $1 AND is_consumed = false AND grape_variety IS NOT NULL ORDER BY grape_variety`,
    [householdId]
  );
  return {
    countries: countries.map(r => r.country),
    grape_varieties: grapes.map(r => r.grape_variety),
  };
}

module.exports = {
  getAllWines,
  getWineById,
  addWine,
  updateWine,
  deleteWine,
  searchWinesByName,
  getWinesSummary,
  getGuestWines,
  getGuestWineFilterOptions,
};
