const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const vision = require('@google-cloud/vision');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { authenticate, requireHousehold } = require('../middleware/auth');
const { getUserSettings } = require('../db/queries/users');
const botQueries = require('../db/queries/bot');

let _visionClient;
function getVisionClient() {
  if (!_visionClient) _visionClient = new vision.ImageAnnotatorClient();
  return _visionClient;
}

let _anthropic;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}
const MODEL = 'claude-haiku-4-5-20251001';
const INPUT_COST = 0.80 / 1_000_000;
const OUTPUT_COST = 4.00 / 1_000_000;

function getCurrentMonth() {
  const now = new Date();
  return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Firebase Storage에 이미지 업로드
async function uploadLabelImage(householdId, base64Data) {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.warn('[ocr] No FIREBASE_STORAGE_BUCKET configured — skipping image upload');
      return { url: null, error: 'FIREBASE_STORAGE_BUCKET 환경변수가 설정되지 않았습니다.' };
    }
    const bucket = admin.storage().bucket(bucketName);
    const fileName = `wine-labels/${householdId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
    const file = bucket.file(fileName);
    const imageBuffer = Buffer.from(base64Data, 'base64');
    await file.save(imageBuffer, { contentType: 'image/jpeg', metadata: { cacheControl: 'public, max-age=31536000' } });
    await file.makePublic();
    return { url: `https://storage.googleapis.com/${bucketName}/${fileName}`, error: null };
  } catch (err) {
    console.error('[ocr] Image upload failed:', err.code || '', err.message);
    return { url: null, error: `이미지 업로드 실패: ${err.message}` };
  }
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
      const [result] = await getVisionClient().textDetection(imageBuffer);
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

    // Claude로 와인 정보 파싱 (OCR 오류 교정 포함)
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `다음은 와인 라벨 또는 영수증에서 OCR로 추출한 텍스트입니다. 이 텍스트에서 와인 정보를 추출해주세요.

⚠️ 중요: OCR 텍스트에는 인식 오류가 있을 수 있습니다. 와인 전문 지식을 활용하여 다음을 교정하세요:
- 와인 이름의 정확한 철자 복원 (예: "Chateau Latite" → "Château Lafite", "Sassicala" → "Sassicaia")
- 프랑스어/이탈리아어/스페인어/독일어 등 원어 표기 복원 (악센트, 움라우트 등)
- 알려진 와인/생산자 이름과 대조하여 가장 가능성 높은 정확한 이름 추론
- 산지, 품종 등도 OCR 오류가 있으면 교정

OCR 텍스트:
${ocrText}

다음 JSON 형식으로 응답해주세요. 확인할 수 없는 필드는 null로 두세요:
{
  "wines": [
    {
      "name": "교정된 정확한 와인 이름 (생산자 + 와인명)",
      "original_ocr_name": "OCR 원문 그대로의 이름 (교정 전)",
      "corrected": true 또는 false (이름을 교정했으면 true),
      "confidence": "high/medium/low (교정 확신도)",
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

    // Firebase Storage에 라벨 이미지 업로드 (실패해도 진행)
    const uploadResult = await uploadLabelImage(req.user.householdId, base64Data);

    res.json({
      ocr_text: ocrText,
      parsed_wines: parsed.wines || [],
      image_url: uploadResult.url,
      image_upload_failed: !uploadResult.url,
      image_upload_error: uploadResult.error,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: costUsd },
    });
  } catch (err) {
    console.error('[ocr] scan-wine error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/ocr/verify-name — CellarTracker 퍼지매칭 + AI 기반 와인 이름 교정
router.post('/verify-name', async (req, res) => {
  try {
    const { wines } = req.body;
    if (!wines || !wines.length) return res.status(400).json({ error: '와인 목록이 필요합니다.' });

    // CellarTracker 데이터 가져오기 시도
    let ctWines = [];
    try {
      const settings = await getUserSettings(req.user.id);
      const ctUser = settings?.cellartracker_user;
      const ctPassword = settings?.cellartracker_password;
      if (ctUser && ctPassword) {
        const url = `https://www.cellartracker.com/xlquery.asp?User=${encodeURIComponent(ctUser)}&Password=${encodeURIComponent(ctPassword)}&Format=tab&Table=List`;
        const ctResponse = await fetch(url);
        const buffer = await ctResponse.arrayBuffer();
        const text = new TextDecoder('windows-1252').decode(buffer);

        if (!text.includes('not logged into CellarTracker')) {
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length >= 2) {
            const headers = lines[0].split('\t');
            const idx = (name) => headers.indexOf(name);
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split('\t');
              ctWines.push({
                wine: cols[idx('Wine')] || '',
                vintage: parseInt(cols[idx('Vintage')]) || null,
                producer: cols[idx('Producer')] || '',
                varietal: cols[idx('Varietal')] || '',
                region: cols[idx('Region')] || '',
                country: cols[idx('Country')] || '',
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[ocr] CT fetch for verify-name failed:', err.message);
    }

    // 각 와인에 대해 CT 퍼지매칭 수행
    const results = wines.map(wine => {
      const wineName = (wine.name || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const wineVintage = wine.vintage ? parseInt(wine.vintage) : null;

      let bestMatch = null;
      let bestScore = 0;

      for (const ct of ctWines) {
        const ctName = (ct.wine || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const ctProducer = (ct.producer || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // 토큰화
        const wineTokens = wineName.split(/[\s,\-()/.]+/).filter(w => w.length > 1);
        const ctTokens = ctName.split(/[\s,\-()/.]+/).filter(w => w.length > 1);
        const ctProdTokens = ctProducer.split(/[\s,\-()/.]+/).filter(w => w.length > 1);

        // 이름 겹침 점수
        const ctSet = new Set([...ctTokens, ...ctProdTokens]);
        const matches = wineTokens.filter(w => ctSet.has(w)).length;
        const score = wineTokens.length > 0 ? matches / Math.min(wineTokens.length, ctTokens.length || 1) : 0;

        // 빈티지 보너스
        const vintageBonus = (wineVintage && ct.vintage === wineVintage) ? 0.2 : 0;
        const totalScore = score + vintageBonus;

        if (totalScore > bestScore && score >= 0.3) {
          bestScore = totalScore;
          bestMatch = ct;
        }
      }

      if (bestMatch) {
        return {
          original_name: wine.name,
          corrected_name: bestMatch.wine,
          source: 'cellartracker',
          score: bestScore,
          details: {
            producer: bestMatch.producer,
            varietal: bestMatch.varietal,
            region: bestMatch.region,
            country: bestMatch.country,
            vintage: bestMatch.vintage,
          },
        };
      }

      // CT 매칭 실패 시 AI OCR 교정 결과 사용
      return {
        original_name: wine.name,
        corrected_name: wine.corrected ? wine.name : null,
        source: wine.corrected ? 'ai_ocr' : null,
        score: 0,
        details: null,
      };
    });

    res.json({ results, ct_count: ctWines.length });
  } catch (err) {
    console.error('[ocr] verify-name error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/ocr/scan-grocery — TBU
router.post('/scan-grocery', async (req, res) => {
  res.status(501).json({ error: '식재료 스캔 기능은 준비 중입니다. (Coming Soon)' });
});

module.exports = router;
