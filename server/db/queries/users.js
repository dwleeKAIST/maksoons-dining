const { queryOne, query } = require('../connection');

async function getUserById(id) {
  return queryOne('SELECT * FROM users WHERE id = $1', [id]);
}

async function getUserByEmail(email) {
  return queryOne('SELECT * FROM users WHERE email = $1', [email]);
}

async function getUserSettings(userId) {
  return queryOne('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
}

async function updateUser(userId, fields) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = $${i++}`);
    vals.push(val);
  }
  sets.push(`updated_at = NOW()`);
  vals.push(userId);
  return queryOne(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
}

async function updateSettings(userId, fields) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = $${i++}`);
    vals.push(val);
  }
  sets.push(`updated_at = NOW()`);
  vals.push(userId);
  return queryOne(
    `UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = $${i} RETURNING *`,
    vals
  );
}

async function getUserMembership(userId) {
  return queryOne(
    `SELECT hm.*, h.name as household_name, h.owner_id
     FROM household_members hm
     JOIN households h ON h.id = hm.household_id
     JOIN users u ON u.id = $1 AND u.active_household_id = hm.household_id
     WHERE hm.user_id = $1`,
    [userId]
  );
}

module.exports = {
  getUserById,
  getUserByEmail,
  getUserSettings,
  updateUser,
  updateSettings,
  getUserMembership,
};
