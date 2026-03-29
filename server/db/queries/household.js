const { queryOne, queryAll, query } = require('../connection');
const crypto = require('crypto');

async function createHousehold(ownerId, name) {
  const household = await queryOne(
    `INSERT INTO households (name, owner_id) VALUES ($1, $2) RETURNING *`,
    [name, ownerId]
  );
  // Add owner as member
  await query(
    `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [household.id, ownerId]
  );
  // Set as active household
  await query(
    `UPDATE users SET active_household_id = $1, updated_at = NOW() WHERE id = $2`,
    [household.id, ownerId]
  );
  return household;
}

async function getHousehold(householdId) {
  return queryOne('SELECT * FROM households WHERE id = $1', [householdId]);
}

async function getHouseholdMembers(householdId) {
  return queryAll(
    `SELECT u.id, u.name, u.email, hm.role, hm.joined_at
     FROM household_members hm
     JOIN users u ON u.id = hm.user_id
     WHERE hm.household_id = $1
     ORDER BY hm.joined_at`,
    [householdId]
  );
}

async function createInvitation(householdId, email, invitedBy) {
  const token = crypto.randomBytes(32).toString('hex');
  return queryOne(
    `INSERT INTO household_invitations (household_id, email, invited_by, token)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [householdId, email, invitedBy, token]
  );
}

async function getInvitationByToken(token) {
  return queryOne(
    `SELECT hi.*, h.name as household_name
     FROM household_invitations hi
     JOIN households h ON h.id = hi.household_id
     WHERE hi.token = $1 AND hi.status = 'pending' AND hi.expires_at > NOW()`,
    [token]
  );
}

async function acceptInvitation(token, userId) {
  const invitation = await getInvitationByToken(token);
  if (!invitation) return null;

  // Add as member
  await query(
    `INSERT INTO household_members (household_id, user_id, role)
     VALUES ($1, $2, 'member') ON CONFLICT (household_id, user_id) DO NOTHING`,
    [invitation.household_id, userId]
  );

  // Set active household
  await query(
    `UPDATE users SET active_household_id = $1, updated_at = NOW() WHERE id = $2`,
    [invitation.household_id, userId]
  );

  // Mark invitation as accepted
  await query(
    `UPDATE household_invitations SET status = 'accepted' WHERE id = $1`,
    [invitation.id]
  );

  return invitation;
}

async function getPendingInvitations(householdId) {
  return queryAll(
    `SELECT * FROM household_invitations
     WHERE household_id = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [householdId]
  );
}

async function getHouseholdByGuestToken(token) {
  return queryOne(
    `SELECT * FROM households
     WHERE guest_share_token = $1 AND guest_share_token_expires_at > NOW()`,
    [token]
  );
}

async function generateGuestShareToken(householdId) {
  return queryOne(
    `UPDATE households
     SET guest_share_token = $1, guest_share_token_expires_at = NOW() + INTERVAL '7 days'
     WHERE id = $2 RETURNING guest_share_token, guest_share_token_expires_at`,
    [crypto.randomUUID(), householdId]
  );
}

async function revokeGuestShareToken(householdId) {
  return query(
    `UPDATE households SET guest_share_token = NULL, guest_share_token_expires_at = NULL WHERE id = $1`,
    [householdId]
  );
}

module.exports = {
  createHousehold,
  getHousehold,
  getHouseholdMembers,
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  getPendingInvitations,
  getHouseholdByGuestToken,
  generateGuestShareToken,
  revokeGuestShareToken,
};
