const { queryOne, queryAll } = require('../connection');

async function getAllGroceries(householdId) {
  return queryAll('SELECT * FROM groceries WHERE household_id = $1 ORDER BY created_at DESC', [householdId]);
}

async function addGrocery(householdId, userId, data) {
  return queryOne(
    `INSERT INTO groceries (household_id, added_by, name, category, quantity, unit, purchase_date, expiry_date, memo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [householdId, userId, data.name, data.category || null, data.quantity || null, data.unit || null, data.purchase_date || null, data.expiry_date || null, data.memo || null]
  );
}

async function addGroceries(householdId, userId, items) {
  if (!items.length) return [];
  const values = [];
  const params = [];
  let idx = 1;
  for (const item of items) {
    values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    params.push(householdId, userId, item.name, item.category || null, item.quantity || null, item.unit || null, item.purchase_date || null, item.expiry_date || null, item.memo || null);
  }
  return queryAll(
    `INSERT INTO groceries (household_id, added_by, name, category, quantity, unit, purchase_date, expiry_date, memo)
     VALUES ${values.join(', ')}
     RETURNING *`,
    params
  );
}

async function updateGrocery(id, householdId, data) {
  return queryOne(
    `UPDATE groceries SET name = $1, category = $2, quantity = $3, unit = $4, purchase_date = $5, expiry_date = $6, memo = $7
     WHERE id = $8 AND household_id = $9
     RETURNING *`,
    [data.name, data.category || null, data.quantity || null, data.unit || null, data.purchase_date || null, data.expiry_date || null, data.memo || null, id, householdId]
  );
}

async function deleteGrocery(id, householdId) {
  return queryOne('DELETE FROM groceries WHERE id = $1 AND household_id = $2 RETURNING id', [id, householdId]);
}

module.exports = { getAllGroceries, addGrocery, addGroceries, updateGrocery, deleteGrocery };
