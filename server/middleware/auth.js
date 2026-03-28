const admin = require('firebase-admin');
const { queryOne, query } = require('../db/connection');
const { sendAdminNotification } = require('../utils/telegram');
const { getUserMembership } = require('../db/queries/users');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  admin.initializeApp(
    serviceAccount
      ? { credential: admin.credential.cert(serviceAccount) }
      : { credential: admin.credential.applicationDefault() }
  );
}

async function findOrCreateUser(decodedToken) {
  const { uid, email, name, display_name } = decodedToken;
  const displayName = name || display_name || email?.split('@')[0] || 'User';
  const safeEmail = email || `${uid}@firebase.local`;

  // 1. Look up by firebase_uid
  let user = await queryOne('SELECT * FROM users WHERE firebase_uid = $1', [uid]);

  // 2. Check email for account linking
  if (!user) {
    const existingByEmail = await queryOne('SELECT * FROM users WHERE email = $1', [safeEmail]);
    if (existingByEmail) {
      await query('UPDATE users SET firebase_uid = $1, updated_at = NOW() WHERE id = $2', [uid, existingByEmail.id]);
      user = { ...existingByEmail, firebase_uid: uid };
    }
  }

  // 3. Create new user
  if (!user) {
    try {
      const result = await query(
        `INSERT INTO users (firebase_uid, email, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
         RETURNING *`,
        [uid, safeEmail, displayName]
      );
      user = result.rows[0];
      console.log(`[auth] New user created: ${user.email} (${user.id})`);
      sendAdminNotification(`🆕 새 사용자 가입\n이름: ${displayName}\n이메일: ${safeEmail}`);
    } catch (err) {
      if (err.code === '23505') {
        user = await queryOne('SELECT * FROM users WHERE email = $1', [safeEmail]);
        if (user) {
          await query('UPDATE users SET firebase_uid = $1, updated_at = NOW() WHERE id = $2', [uid, user.id]);
          user.firebase_uid = uid;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
  }

  // Ensure user_settings exist
  const hasSettings = await queryOne('SELECT 1 FROM user_settings WHERE user_id = $1', [user.id]);
  if (!hasSettings) {
    await query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [user.id]);
  }

  // Auto-assign admin
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.includes(user.email.toLowerCase()) && !user.is_admin) {
    await query('UPDATE users SET is_admin = TRUE WHERE id = $1', [user.id]);
    user.is_admin = true;
  }

  return user;
}

async function getSkipAuthUser() {
  const email = 'admin@maksoons-dining.local';
  let user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
  if (!user) {
    const result = await query(
      `INSERT INTO users (firebase_uid, email, name, is_admin)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING *`,
      ['skip-auth-uid', email, 'Admin (Dev)']
    );
    user = result.rows[0];
    await query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [user.id]);

    // Create default household
    const householdQueries = require('../db/queries/household');
    const household = await householdQueries.createHousehold(user.id, "Maksoon's Home");
    user.active_household_id = household.id;
  }

  let householdId = null;
  let householdRole = null;
  if (user.active_household_id) {
    const membership = await getUserMembership(user.id);
    if (membership) {
      householdId = membership.household_id;
      householdRole = membership.role;
    }
  }

  return {
    id: user.id,
    firebaseUid: user.firebase_uid,
    email: user.email,
    name: user.name,
    isAdmin: user.is_admin,
    householdId,
    householdRole,
  };
}

async function authenticate(req, res, next) {
  try {
    if (process.env.SKIP_AUTH === 'true') {
      req.user = await getSkipAuthUser();
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (tokenErr) {
      return res.status(401).json({ error: '인증 토큰이 유효하지 않습니다.' });
    }

    const user = await findOrCreateUser(decodedToken);

    let householdId = null;
    let householdRole = null;
    if (user.active_household_id) {
      const membership = await getUserMembership(user.id);
      if (membership) {
        householdId = membership.household_id;
        householdRole = membership.role;
      }
    }

    req.user = {
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      name: user.name,
      isAdmin: user.is_admin,
      householdId,
      householdRole,
    };

    next();
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '이미 다른 방법으로 가입된 이메일입니다.', code: 'EMAIL_CONFLICT' });
    }
    console.error('[auth] Error:', err.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

function requireHousehold(req, res, next) {
  if (!req.user?.householdId) {
    return res.status(400).json({ error: '가정(Household)에 소속되어야 합니다. 가정을 생성하거나 초대를 수락해주세요.' });
  }
  next();
}

function requireHouseholdOwner(req, res, next) {
  if (!req.user?.householdId) {
    return res.status(400).json({ error: '가정 소속이 필요합니다.' });
  }
  if (req.user.householdRole !== 'owner') {
    return res.status(403).json({ error: '가정 주인 권한이 필요합니다.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

module.exports = { authenticate, requireHousehold, requireHouseholdOwner, requireAdmin };
