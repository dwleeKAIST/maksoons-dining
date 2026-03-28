const express = require('express');
const router = express.Router();
const { authenticate, requireHousehold } = require('../middleware/auth');
const wineQueries = require('../db/queries/wines');
const diaryQueries = require('../db/queries/diary');

router.use(authenticate);
router.use(requireHousehold);

// GET /api/wines — 와인 리스트
router.get('/', async (req, res) => {
  try {
    const filters = {};
    if (req.query.wine_type) filters.wine_type = req.query.wine_type;
    if (req.query.vintage_min) filters.vintage_min = parseInt(req.query.vintage_min);
    if (req.query.vintage_max) filters.vintage_max = parseInt(req.query.vintage_max);
    if (req.query.drinking_recommendation) filters.drinking_recommendation = req.query.drinking_recommendation;
    if (req.query.is_consumed !== undefined) filters.is_consumed = req.query.is_consumed === 'true';
    if (req.query.search) filters.search = req.query.search;

    const wines = await wineQueries.getAllWines(req.user.householdId, filters);
    res.json(wines);
  } catch (err) {
    console.error('[wines] list error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/wines/:id — 와인 상세
router.get('/:id', async (req, res) => {
  try {
    const wine = await wineQueries.getWineById(parseInt(req.params.id), req.user.householdId);
    if (!wine) return res.status(404).json({ error: '와인을 찾을 수 없습니다.' });
    res.json(wine);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/wines — 와인 추가
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '와인 이름을 입력해주세요.' });
    const wine = await wineQueries.addWine(req.user.householdId, req.user.id, req.body);
    res.status(201).json(wine);
  } catch (err) {
    console.error('[wines] add error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/wines/:id — 와인 수정
router.patch('/:id', async (req, res) => {
  try {
    const wine = await wineQueries.updateWine(parseInt(req.params.id), req.user.householdId, req.body);
    if (!wine) return res.status(404).json({ error: '와인을 찾을 수 없습니다.' });
    res.json(wine);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /api/wines/:id — 와인 삭제
router.delete('/:id', async (req, res) => {
  try {
    const result = await wineQueries.deleteWine(parseInt(req.params.id), req.user.householdId);
    if (!result) return res.status(404).json({ error: '와인을 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/wines/:id/consume — 와인 소비 처리
router.post('/:id/consume', async (req, res) => {
  try {
    const wineId = parseInt(req.params.id);
    const wine = await wineQueries.getWineById(wineId, req.user.householdId);
    if (!wine) return res.status(404).json({ error: '와인을 찾을 수 없습니다.' });

    // 수량 감소 또는 소비 완료 처리
    const newQuantity = Math.max(0, wine.quantity - 1);
    const isConsumed = newQuantity === 0;
    const updated = await wineQueries.updateWine(wineId, req.user.householdId, {
      quantity: newQuantity,
      is_consumed: isConsumed,
    });

    // 다이어리 엔트리 생성 (요청에 포함된 경우)
    let diary = null;
    if (req.body.rating) {
      diary = await diaryQueries.addDiaryEntry(req.user.householdId, req.user.id, {
        wine_id: wineId,
        rating: req.body.rating,
        tasting_notes: req.body.tasting_notes,
        consumed_date: req.body.consumed_date,
        occasion: req.body.occasion,
        food_pairing: req.body.food_pairing,
      });
    }

    res.json({ wine: updated, diary });
  } catch (err) {
    console.error('[wines] consume error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
