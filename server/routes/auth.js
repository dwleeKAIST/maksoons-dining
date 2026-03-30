const express = require('express');
const router = express.Router();
const { authenticate, requireHousehold, requireHouseholdOwner } = require('../middleware/auth');
const { getUserById, getUserSettings, updateUser, updateSettings } = require('../db/queries/users');
const householdQueries = require('../db/queries/household');
const { sendTelegramMessage } = require('../utils/telegram');

// POST /api/auth/verify — Firebase 토큰 검증 + 프로필 반환
router.post('/verify', authenticate, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    const settings = await getUserSettings(req.user.id);
    let household = null;
    if (user.active_household_id) {
      household = await householdQueries.getHousehold(user.active_household_id);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        active_household_id: user.active_household_id,
      },
      settings: settings || {},
      household,
    });
  } catch (err) {
    console.error('[auth] verify error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    const settings = await getUserSettings(req.user.id);
    let household = null;
    if (user.active_household_id) {
      household = await householdQueries.getHousehold(user.active_household_id);
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        active_household_id: user.active_household_id,
      },
      settings: settings || {},
      household,
    });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/auth/me — 프로필 수정
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (Object.keys(updates).length === 0) return res.json({});
    const updated = await updateUser(req.user.id, updates);
    res.json({ id: updated.id, email: updated.email, name: updated.name });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/auth/settings — 설정 변경
router.patch('/settings', authenticate, async (req, res) => {
  try {
    const allowed = ['bot_max_cost_krw', 'usd_to_krw', 'telegram_bot_token', 'telegram_chat_id', 'telegram_enabled', 'cellartracker_user', 'cellartracker_password'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.json(await getUserSettings(req.user.id));
    const result = await updateSettings(req.user.id, updates);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/settings/telegram-test
router.post('/settings/telegram-test', authenticate, async (req, res) => {
  try {
    const settings = await getUserSettings(req.user.id);
    if (!settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      return res.status(400).json({ error: '텔레그램 설정이 없습니다.' });
    }
    const ok = await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id,
      "🍷 Maksoon's Dining 텔레그램 연동 테스트 성공!");
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ error: '전송 실패' });
  }
});

// ── Household 관리 ──

// POST /api/auth/household — 가정 생성
router.post('/household', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '가정 이름을 입력해주세요.' });
    const household = await householdQueries.createHousehold(req.user.id, name.trim());
    res.json(household);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/auth/household/members
router.get('/household/members', authenticate, requireHousehold, async (req, res) => {
  try {
    const members = await householdQueries.getHouseholdMembers(req.user.householdId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/household/invite — 초대
router.post('/household/invite', authenticate, requireHouseholdOwner, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: '이메일을 입력해주세요.' });
    const invitation = await householdQueries.createInvitation(req.user.householdId, email.trim(), req.user.id);
    res.json({ token: invitation.token, expires_at: invitation.expires_at });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/auth/household/invitations — 대기 중 초대 목록
router.get('/household/invitations', authenticate, requireHouseholdOwner, async (req, res) => {
  try {
    const invitations = await householdQueries.getPendingInvitations(req.user.householdId);
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/invite/accept — 초대 수락
router.post('/invite/accept', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: '초대 토큰이 필요합니다.' });
    const result = await householdQueries.acceptInvitation(token, req.user.id);
    if (!result) return res.status(404).json({ error: '유효하지 않거나 만료된 초대입니다.' });
    res.json({ household_name: result.household_name });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// ── 게스트 링크 관리 ──

// GET /api/auth/household/guest-link — 현재 토큰 조회
router.get('/household/guest-link', authenticate, requireHousehold, async (req, res) => {
  try {
    const household = await householdQueries.getHousehold(req.user.householdId);
    res.json({
      token: household.guest_share_token || null,
      expires_at: household.guest_share_token_expires_at || null,
    });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/household/guest-link — 토큰 생성/재생성
router.post('/household/guest-link', authenticate, requireHouseholdOwner, async (req, res) => {
  try {
    const result = await householdQueries.generateGuestShareToken(req.user.householdId);
    res.json({
      token: result.guest_share_token,
      expires_at: result.guest_share_token_expires_at,
    });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /api/auth/household/guest-link — 토큰 삭제
router.delete('/household/guest-link', authenticate, requireHouseholdOwner, async (req, res) => {
  try {
    await householdQueries.revokeGuestShareToken(req.user.householdId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/auth/invite/:token — 초대 정보 조회
router.get('/invite/:token', async (req, res) => {
  try {
    const invitation = await householdQueries.getInvitationByToken(req.params.token);
    if (!invitation) return res.status(404).json({ error: '유효하지 않거나 만료된 초대입니다.' });
    res.json({ household_name: invitation.household_name, email: invitation.email });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
