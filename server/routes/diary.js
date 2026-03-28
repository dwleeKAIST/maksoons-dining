const express = require('express');
const router = express.Router();
const { authenticate, requireHousehold } = require('../middleware/auth');
const diaryQueries = require('../db/queries/diary');

router.use(authenticate);
router.use(requireHousehold);

// GET /api/diary — 다이어리 목록
router.get('/', async (req, res) => {
  try {
    const entries = await diaryQueries.getAllDiaryEntries(req.user.householdId);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/diary/wine/:wineId — 특정 와인 다이어리
router.get('/wine/:wineId', async (req, res) => {
  try {
    const entries = await diaryQueries.getDiaryByWine(parseInt(req.params.wineId), req.user.householdId);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/diary — 다이어리 작성
router.post('/', async (req, res) => {
  try {
    const { wine_id, rating } = req.body;
    if (!wine_id) return res.status(400).json({ error: '와인을 선택해주세요.' });
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: '별점은 1~5 사이로 입력해주세요.' });
    const entry = await diaryQueries.addDiaryEntry(req.user.householdId, req.user.id, req.body);
    res.status(201).json(entry);
  } catch (err) {
    console.error('[diary] add error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/diary/:id — 다이어리 수정
router.patch('/:id', async (req, res) => {
  try {
    const entry = await diaryQueries.updateDiaryEntry(parseInt(req.params.id), req.user.householdId, req.body);
    if (!entry) return res.status(404).json({ error: '다이어리를 찾을 수 없습니다.' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /api/diary/:id — 다이어리 삭제
router.delete('/:id', async (req, res) => {
  try {
    const result = await diaryQueries.deleteDiaryEntry(parseInt(req.params.id), req.user.householdId);
    if (!result) return res.status(404).json({ error: '다이어리를 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
