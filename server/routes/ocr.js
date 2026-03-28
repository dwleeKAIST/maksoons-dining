const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const vision = require('@google-cloud/vision');
const { authenticate, requireHousehold } = require('../middleware/auth');
const { getUserSettings } = require('../db/queries/users');
const botQueries = require('../db/queries/bot');

const visionClient = new vision.ImageAnnotatorClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';
const INPUT_COST = 0.80 / 1_000_000;
const OUTPUT_COST = 4.00 / 1_000_000;

function getCurrentMonth() {
  const now = new Date();
  return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

router.use(authenticate);
router.use(requireHousehold);

// POST /api/ocr/scan-wine — 와인 라벨/영수증 OCR 스캔
router.post('/scan-wine', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: '이미지가 필요합니다.' });

    // Base64 → Buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Google Cloud Vision OCR
    let ocrText;
    try {
      const [result] = await visionClient.textDetection(imageBuffer);
      ocrText = result.fullTextAnnotation?.text;
      if (!ocrText) {
        return res.status(400).json({ error: '이미지에서 텍스트를 인식할 수 없습니다.' });
      }
    } catch (err) {
      if (err.message?.includes('PERMISSION_DENIED') || err.code === 7) {
        return res.status(503).json({ error: 'Google Cloud Vision API가 활성화되지 않았습니다.' });
      }
      throw err;
    }

    // Claude로 와인 정보 파싱
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `다음은 와인 라벨 또는 영수증에서 OCR로 추출한 텍스트입니다. 이 텍스트에서 와인 정보를 추출해주세요.

OCR 텍스트:
${ocrText}

다음 JSON 형식으로 응답해주세요. 확인할 수 없는 필드는 null로 두세요:
{
  "wines": [
    {
      "name": "와인 이름 (생산자 + 와인명)",
      "vintage": 연도(숫자) 또는 null,
      "region": "산지",
      "country": "국가",
      "grape_variety": "포도 품종",
      "wine_type": "red/white/rosé/sparkling/dessert/fortified/natural/orange",
      "purchase_price": 가격(숫자, 원) 또는 null,
      "quantity": 수량(숫자) 또는 1
    }
  ]
}

JSON만 응답하세요.`,
        },
      ],
    });

    // 비용 추적
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const costUsd = inputTokens * INPUT_COST + outputTokens * OUTPUT_COST;
    await botQueries.trackUsage(req.user.householdId, req.user.id, getCurrentMonth(), inputTokens, outputTokens, costUsd);

    // 파싱 결과 추출
    let parsed;
    try {
      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return res.status(400).json({ error: 'AI가 와인 정보를 파싱하지 못했습니다.', raw_text: ocrText });
    }

    res.json({
      ocr_text: ocrText,
      parsed_wines: parsed.wines || [],
      usage: { input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: costUsd },
    });
  } catch (err) {
    console.error('[ocr] scan-wine error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/ocr/scan-grocery — TBU
router.post('/scan-grocery', async (req, res) => {
  res.status(501).json({ error: '식재료 스캔 기능은 준비 중입니다. (Coming Soon)' });
});

module.exports = router;
