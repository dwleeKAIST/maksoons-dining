const express = require('express');
const router = express.Router();
const { authenticate, requireHousehold } = require('../middleware/auth');
const groceryQueries = require('../db/queries/groceries');

router.use(authenticate);
router.use(requireHousehold);

// GET / — 식재료 목록 조회
router.get('/', async (req, res) => {
  try {
    const items = await groceryQueries.getAllGroceries(req.user.householdId);
    res.json(items);
  } catch (err) {
    console.error('[groceries] list error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST / — 식재료 등록 (단건 또는 벌크)
router.post('/', async (req, res) => {
  try {
    const { items } = req.body;
    // 배열이면 벌크, 아니면 단건
    if (Array.isArray(items)) {
      if (items.length === 0) return res.status(400).json({ error: '등록할 항목이 없습니다.' });
      if (items.some(i => !i.name?.trim())) return res.status(400).json({ error: '모든 항목에 이름이 필요합니다.' });
      const result = await groceryQueries.addGroceries(req.user.householdId, req.user.id, items);
      res.json(result);
    } else {
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: '이름이 필요합니다.' });
      const result = await groceryQueries.addGrocery(req.user.householdId, req.user.id, req.body);
      res.json(result);
    }
  } catch (err) {
    console.error('[groceries] add error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /:id — 식재료 수정
router.patch('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: '잘못된 ID입니다.' });
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '이름이 필요합니다.' });
    const result = await groceryQueries.updateGrocery(req.params.id, req.user.householdId, req.body);
    if (!result) return res.status(404).json({ error: '식재료를 찾을 수 없습니다.' });
    res.json(result);
  } catch (err) {
    console.error('[groceries] update error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /:id — 식재료 삭제
router.delete('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: '잘못된 ID입니다.' });
    const result = await groceryQueries.deleteGrocery(req.params.id, req.user.householdId);
    if (!result) return res.status(404).json({ error: '식재료를 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    console.error('[groceries] delete error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
