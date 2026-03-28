// TBU - 식재료 관리 쿼리 (추후 구현)
const { queryOne, queryAll } = require('../connection');

async function getAllGroceries(householdId) {
  return queryAll('SELECT * FROM groceries WHERE household_id = $1 ORDER BY created_at DESC', [householdId]);
}

module.exports = { getAllGroceries };
