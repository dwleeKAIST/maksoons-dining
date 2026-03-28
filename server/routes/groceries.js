const express = require('express');
const router = express.Router();
const { authenticate, requireHousehold } = require('../middleware/auth');

router.use(authenticate);
router.use(requireHousehold);

// TBU - 식재료 관리 (Coming Soon)
router.get('/', async (req, res) => {
  res.json({ message: '식재료 관리 기능은 준비 중입니다.', items: [] });
});

module.exports = router;
