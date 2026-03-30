const express = require('express');
const router = express.Router();
const householdQueries = require('../db/queries/household');
const wineQueries = require('../db/queries/wines');
const botQueries = require('../db/queries/bot');
const { getUserSettings } = require('../db/queries/users');
const { sendTelegramMessage, sendTelegramPhoto } = require('../utils/telegram');

// 게스트 토큰 검증 미들웨어
async function resolveGuestToken(req, res, next) {
  try {
    const { token } = req.params;
    const household = await householdQueries.getHouseholdByGuestToken(token);
    if (!household) {
      return res.status(404).json({ error: '유효하지 않거나 만료된 링크입니다.' });
    }
    req.household = household;
    next();
  } catch (err) {
    console.error('[guest] token resolve error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
}

// GET /api/guest/:token/info — household 이름
router.get('/:token/info', resolveGuestToken, (req, res) => {
  res.json({ name: req.household.name });
});

// GET /api/guest/:token/wines — 게스트 와인 리스트
router.get('/:token/wines', resolveGuestToken, async (req, res) => {
  try {
    const filters = {};
    if (req.query.wine_type) filters.wine_type = req.query.wine_type;
    if (req.query.country) filters.country = req.query.country;
    if (req.query.grape_variety) filters.grape_variety = req.query.grape_variety;
    if (req.query.drinking_recommendation) filters.drinking_recommendation = req.query.drinking_recommendation;
    if (req.query.search) filters.search = req.query.search;

    const wines = await wineQueries.getGuestWines(req.household.id, filters);
    res.json(wines);
  } catch (err) {
    console.error('[guest] wines error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/guest/:token/filters — 필터 옵션 (국가, 품종)
router.get('/:token/filters', resolveGuestToken, async (req, res) => {
  try {
    const options = await wineQueries.getGuestWineFilterOptions(req.household.id);
    res.json(options);
  } catch (err) {
    console.error('[guest] filters error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/guest/:token/request — 마시고 싶어요 (텔레그램 알림)
router.post('/:token/request', resolveGuestToken, async (req, res) => {
  try {
    const { wine_id } = req.body;
    if (!wine_id) return res.status(400).json({ error: '와인 ID가 필요합니다.' });

    const wine = await wineQueries.getWineById(parseInt(wine_id), req.household.id);
    if (!wine) return res.status(404).json({ error: '와인을 찾을 수 없습니다.' });

    const ownerId = req.household.owner_id;
    const settings = await getUserSettings(ownerId);

    if (!settings?.telegram_enabled || !settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      return res.status(400).json({ error: '텔레그램 알림이 설정되지 않았습니다.' });
    }

    const caption = `🍷 <b>마시고 싶어요!</b>\n\n` +
      `<b>${wine.name}</b>${wine.vintage ? ` ${wine.vintage}` : ''}\n` +
      `${wine.wine_type ? `종류: ${wine.wine_type}` : ''}` +
      `${wine.region ? ` · ${wine.region}` : ''}` +
      `${wine.country ? ` · ${wine.country}` : ''}\n` +
      `${wine.grape_variety ? `품종: ${wine.grape_variety}\n` : ''}` +
      `${wine.drinking_recommendation && wine.drinking_recommendation !== 'unknown' ? `추천: ${wine.drinking_recommendation}\n` : ''}` +
      `${wine.storage_location ? `보관: ${wine.storage_location}\n` : ''}` +
      `수량: ${wine.quantity}병`;

    let sent = false;
    if (wine.label_image_url) {
      sent = await sendTelegramPhoto(settings.telegram_bot_token, settings.telegram_chat_id, wine.label_image_url, caption);
      // sendPhoto가 실패하면 (이미지 URL 문제 등) 텍스트로 폴백
      if (!sent) {
        sent = await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id, caption);
      }
    } else {
      sent = await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id, caption);
    }

    if (!sent) {
      return res.status(500).json({ error: '텔레그램 전송에 실패했습니다.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[guest] request error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/guest/:token/chat — 게스트용 소믈리에 봇 (읽기 전용)
router.post('/:token/chat', resolveGuestToken, async (req, res) => {
  try {
    // bot.js에서 공유 함수/상수 로드 (lazy — bot.js가 먼저 로드되어야 함)
    const botRouter = require('./bot');
    const { getClient, gatherContext, executeTool, TOOLS, MODEL, INPUT_COST, OUTPUT_COST, MAX_TOOL_ROUNDS, MAX_INPUT_LENGTH, getCurrentMonth } = botRouter;

    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: '메시지를 입력해주세요.' });
    if (message.length > MAX_INPUT_LENGTH) {
      return res.status(400).json({ error: `메시지는 ${MAX_INPUT_LENGTH}자 이하로 입력해주세요.` });
    }

    const householdId = req.household.id;
    const ownerId = req.household.owner_id;

    // Owner 설정으로 비용 제한 확인
    const settings = await getUserSettings(ownerId);
    const month = getCurrentMonth();
    const usage = await botQueries.getMonthlyUsage(householdId, month);
    const usdToKrw = settings?.usd_to_krw || 1350;
    const maxCostKrw = settings?.bot_max_cost_krw || 10000;
    const currentCostKrw = (usage?.total_cost_usd || 0) * usdToKrw;
    if (currentCostKrw >= maxCostKrw) {
      return res.status(429).json({ error: '이번 달 AI 사용 한도에 도달했습니다.' });
    }

    // 읽기 전용 도구만 허용
    const GUEST_TOOL_NAMES = ['search_wines', 'get_drinking_recommendation', 'estimate_wine_price', 'search_wiki'];
    const guestTools = TOOLS.filter(t => GUEST_TOOL_NAMES.includes(t.name));

    // RAG 컨텍스트
    const contextText = await gatherContext(householdId, message);

    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const systemPrompt = `당신은 "Maksoon's Dining"의 전문 소믈리에 AI 비서입니다.
현재 게스트 모드로 접속한 사용자와 대화합니다.
와인 컬렉션을 조회하고, 와인에 대한 전문적인 조언을 제공합니다.

전문 분야:
- 와인 빈티지별 음용 적기 판단 (Drinking Window)
- 음식과 와인 페어링 추천
- 와인 보관 조언
- 와인 시세/가치 어림 추정

주의: 게스트 모드이므로 와인 추가/수정/삭제는 불가능합니다. 조회와 추천만 가능합니다.

현재 날짜: ${today}

한국어로 친근하지만 전문적으로 대화합니다.
필요할 때 도구를 사용하여 와인 리스트에 접근하세요.
와인 추천 시에는 구체적인 이유를 함께 설명해주세요.

${contextText ? `\n--- 참고 데이터 ---\n${contextText}` : ''}`;

    // 대화 히스토리
    const messages = [];
    for (const h of history.slice(-20)) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: message });

    // Claude API 호출 (tool loop)
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalText = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await getClient().messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        tools: guestTools,
      });

      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;

      const toolUses = [];
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
        else if (block.type === 'tool_use') toolUses.push(block);
      }

      if (response.stop_reason === 'end_turn' || toolUses.length === 0) break;

      messages.push({ role: 'assistant', content: response.content });
      const toolResults = [];
      for (const tu of toolUses) {
        try {
          if (!GUEST_TOOL_NAMES.includes(tu.name)) {
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: '게스트 모드에서는 사용할 수 없는 도구입니다.', is_error: true });
            continue;
          }
          let result;
          // search_wines는 게스트용 쿼리 사용 (소비 와인 제외)
          if (tu.name === 'search_wines') {
            const filters = {};
            if (tu.input.wine_type) filters.wine_type = tu.input.wine_type;
            if (tu.input.query) filters.search = tu.input.query;
            const wines = await wineQueries.getGuestWines(householdId, filters);
            result = wines.length
              ? wines.map(w => `[ID:${w.id}] ${w.name} ${w.vintage || ''} (${w.wine_type}) 수량:${w.quantity} 추천:${w.drinking_recommendation}`).join('\n')
              : '검색 결과가 없습니다.';
          } else {
            result = await executeTool(tu.name, tu.input, householdId, ownerId);
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
        } catch (err) {
          console.error(`[guest-bot] Tool ${tu.name} error:`, err.message);
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: `오류: ${err.message}`, is_error: true });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      finalText = '';
    }

    // 비용 추적 (owner 계정으로)
    const costUsd = totalInputTokens * INPUT_COST + totalOutputTokens * OUTPUT_COST;
    await botQueries.trackUsage(householdId, ownerId, month, totalInputTokens, totalOutputTokens, costUsd);

    const updatedUsage = await botQueries.getMonthlyUsage(householdId, month);
    const totalCostKrw = (updatedUsage?.total_cost_usd || 0) * usdToKrw;

    res.json({
      reply: finalText,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost_usd: costUsd,
        monthly_cost_krw: Math.round(totalCostKrw),
        max_cost_krw: maxCostKrw,
      },
    });
  } catch (err) {
    console.error('[guest-bot] chat error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/guest/:token/recommend — AI 소믈리에 와인 추천 (위저드)
router.post('/:token/recommend', resolveGuestToken, async (req, res) => {
  try {
    const botRouter = require('./bot');
    const { getClient, MODEL, INPUT_COST, OUTPUT_COST, getCurrentMonth } = botRouter;
    const { buildRecommendationPrompt } = require('../prompts/wineRecommendation');

    const { answers } = req.body;
    if (!answers) return res.status(400).json({ error: '추천 정보가 필요합니다.' });

    const householdId = req.household.id;
    const ownerId = req.household.owner_id;

    // 비용 제한 확인
    const settings = await getUserSettings(ownerId);
    const month = getCurrentMonth();
    const usage = await botQueries.getMonthlyUsage(householdId, month);
    const usdToKrw = settings?.usd_to_krw || 1350;
    const maxCostKrw = settings?.bot_max_cost_krw || 10000;
    const currentCostKrw = (usage?.total_cost_usd || 0) * usdToKrw;
    if (currentCostKrw >= maxCostKrw) {
      return res.status(429).json({ error: '이번 달 AI 사용 한도에 도달했습니다.' });
    }

    // 셀러 와인 전체 조회
    const wines = await wineQueries.getGuestWines(householdId, {});

    // 전용 프롬프트 생성
    const { systemPrompt, userMessage } = buildRecommendationPrompt(answers, wines);

    // Claude 단일 호출
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const totalInputTokens = response.usage?.input_tokens || 0;
    const totalOutputTokens = response.usage?.output_tokens || 0;

    let text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    // JSON 파싱
    let recommendation;
    try {
      recommendation = JSON.parse(text);
    } catch {
      console.error('[guest-recommend] JSON parse failed:', text.slice(0, 500));
      return res.status(500).json({ error: '추천 결과를 처리할 수 없습니다. 다시 시도해주세요.' });
    }

    // 외부 추천 와인에 검색 URL 추가
    const addSearchUrl = (wine) => ({
      ...wine,
      searchUrl: `https://www.wine-searcher.com/find/${encodeURIComponent(wine.name.replace(/\s+/g, '+'))}`,
    });

    if (recommendation.externalRecommendations) {
      if (recommendation.externalRecommendations.entryLevel) {
        recommendation.externalRecommendations.entryLevel = recommendation.externalRecommendations.entryLevel.map(addSearchUrl);
      }
      if (recommendation.externalRecommendations.premium) {
        recommendation.externalRecommendations.premium = recommendation.externalRecommendations.premium.map(addSearchUrl);
      }
    }

    // 비용 추적
    const costUsd = totalInputTokens * INPUT_COST + totalOutputTokens * OUTPUT_COST;
    await botQueries.trackUsage(householdId, ownerId, month, totalInputTokens, totalOutputTokens, costUsd);

    res.json({ recommendation });
  } catch (err) {
    console.error('[guest-recommend] error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
