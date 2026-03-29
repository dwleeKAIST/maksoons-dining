const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { authenticate, requireHousehold } = require('../middleware/auth');
const { getUserSettings } = require('../db/queries/users');
const botQueries = require('../db/queries/bot');
const wineQueries = require('../db/queries/wines');
const diaryQueries = require('../db/queries/diary');

let _client;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}
const MODEL = 'claude-haiku-4-5-20251001';

const INPUT_COST = 1.00 / 1_000_000;
const OUTPUT_COST = 5.00 / 1_000_000;
const MAX_TOOL_ROUNDS = 10;
const MAX_INPUT_LENGTH = 2000;

function getCurrentMonth() {
  const now = new Date();
  return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

router.use(authenticate);
router.use(requireHousehold);

// ── RAG 컨텍스트 수집 ──

async function gatherContext(householdId, message) {
  const sections = [];

  // 와인 리스트 — 키워드 매칭
  if (/와인|wine|추천|리스트|목록|빈티지|레드|화이트|로제|스파클링|셀러|재고|마시|페어링|음용/.test(message)) {
    const wines = await wineQueries.getWinesSummary(householdId);
    if (wines.length) {
      sections.push({
        label: '와인 컬렉션',
        text: wines.map(w =>
          `[ID:${w.id}] ${w.name}${w.vintage ? ` ${w.vintage}` : ''} (${w.wine_type}) ` +
          `수량:${w.quantity} 추천:${w.drinking_recommendation} ` +
          `${w.is_consumed ? '[소비완료]' : ''} ` +
          `${w.region ? `산지:${w.region}` : ''} ${w.grape_variety ? `품종:${w.grape_variety}` : ''} ` +
          `${w.purchase_price ? `구입가:${w.purchase_price}원` : ''} ${w.estimated_price ? `시세:${w.estimated_price}원` : ''}`
        ).join('\n'),
      });
    }
  }

  // 다이어리 — 키워드 매칭
  if (/다이어리|diary|평가|별점|리뷰|기록|느낌|테이스팅/.test(message)) {
    const diary = await diaryQueries.getRecentDiary(householdId, 10);
    if (diary.length) {
      sections.push({
        label: '최근 와인 다이어리',
        text: diary.map(d =>
          `${d.wine_name}${d.vintage ? ` ${d.vintage}` : ''}: ⭐${d.rating}/5 ${d.consumed_date} ` +
          `${d.tasting_notes ? `"${d.tasting_notes}"` : ''}`
        ).join('\n'),
      });
    }
  }

  // 위키 — 항상 포함
  const wiki = await botQueries.getRecentWiki(householdId, 20);
  if (wiki.length) {
    sections.push({
      label: '지식 위키',
      text: wiki.map(w => `[${w.category || '일반'}] ${w.title}: ${w.content}`).join('\n'),
    });
  }

  return sections.map(s => `=== ${s.label} ===\n${s.text}`).join('\n\n');
}

// ── Claude Tool 정의 ──

const TOOLS = [
  {
    name: 'search_wines',
    description: '와인 컬렉션에서 와인을 검색합니다.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어 (와인명, 품종, 산지 등)' },
        wine_type: { type: 'string', description: '와인 타입 필터 (red/white/rosé/sparkling)' },
      },
      required: [],
    },
  },
  {
    name: 'add_wine',
    description: '새 와인을 컬렉션에 추가합니다.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '와인 이름' },
        vintage: { type: 'number', description: '빈티지 연도' },
        region: { type: 'string', description: '산지' },
        country: { type: 'string', description: '국가' },
        grape_variety: { type: 'string', description: '포도 품종' },
        wine_type: { type: 'string', description: 'red/white/rosé/sparkling/dessert/fortified/natural/orange' },
        purchase_price: { type: 'number', description: '구입 가격 (원)' },
        quantity: { type: 'number', description: '수량' },
        storage_location: { type: 'string', description: '보관 위치' },
        memo: { type: 'string', description: '메모' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_wine',
    description: '와인 정보를 수정합니다.',
    input_schema: {
      type: 'object',
      properties: {
        wine_name: { type: 'string', description: '와인 이름 (검색용)' },
        wine_id: { type: 'number', description: '와인 ID (정확한 경우)' },
        name: { type: 'string', description: '변경할 이름' },
        vintage: { type: 'number', description: '빈티지' },
        region: { type: 'string', description: '산지' },
        country: { type: 'string', description: '국가' },
        grape_variety: { type: 'string', description: '품종' },
        wine_type: { type: 'string', description: '타입' },
        purchase_price: { type: 'number', description: '구입가' },
        estimated_price: { type: 'number', description: '시세' },
        quantity: { type: 'number', description: '수량' },
        storage_location: { type: 'string', description: '보관 위치' },
        memo: { type: 'string', description: '메모' },
      },
      required: [],
    },
  },
  {
    name: 'delete_wine',
    description: '와인을 컬렉션에서 삭제합니다.',
    input_schema: {
      type: 'object',
      properties: {
        wine_name: { type: 'string', description: '삭제할 와인 이름' },
        wine_id: { type: 'number', description: '와인 ID' },
      },
      required: [],
    },
  },
  {
    name: 'get_drinking_recommendation',
    description: '와인의 음용 적기를 분석합니다. 지금 마시기 좋은지, 더 숙성시켜야 하는지, 빨리 마셔야 하는지 판단합니다.',
    input_schema: {
      type: 'object',
      properties: {
        wine_name: { type: 'string', description: '와인 이름' },
        wine_id: { type: 'number', description: '와인 ID' },
      },
      required: [],
    },
  },
  {
    name: 'estimate_wine_price',
    description: '와인의 시세/가격을 추정합니다.',
    input_schema: {
      type: 'object',
      properties: {
        wine_name: { type: 'string', description: '와인 이름' },
        vintage: { type: 'number', description: '빈티지' },
      },
      required: ['wine_name'],
    },
  },
  {
    name: 'add_diary_entry',
    description: '와인 다이어리에 기록을 추가합니다.',
    input_schema: {
      type: 'object',
      properties: {
        wine_name: { type: 'string', description: '와인 이름' },
        wine_id: { type: 'number', description: '와인 ID' },
        rating: { type: 'number', description: '별점 (1~5)' },
        tasting_notes: { type: 'string', description: '테이스팅 노트/느낌' },
        occasion: { type: 'string', description: '자리/상황 (기념일, 일상 등)' },
        food_pairing: { type: 'string', description: '함께 먹은 음식' },
      },
      required: ['rating'],
    },
  },
  {
    name: 'search_diary',
    description: '와인 다이어리를 검색합니다.',
    input_schema: {
      type: 'object',
      properties: {
        wine_name: { type: 'string', description: '와인 이름으로 검색' },
      },
      required: [],
    },
  },
  {
    name: 'search_wiki',
    description: '지식 위키에서 검색합니다.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: '검색어' } },
      required: ['query'],
    },
  },
  {
    name: 'save_to_wiki',
    description: '유용한 정보를 지식 위키에 저장합니다.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '제목' },
        content: { type: 'string', description: '내용' },
        category: { type: 'string', description: '카테고리 (예: 와인상식, 페어링, 보관팁)' },
      },
      required: ['title', 'content'],
    },
  },
];

// ── Tool 실행 ──

async function executeTool(toolName, toolInput, householdId, userId) {
  switch (toolName) {
    case 'search_wines': {
      const filters = {};
      if (toolInput.wine_type) filters.wine_type = toolInput.wine_type;
      if (toolInput.query) filters.search = toolInput.query;
      const wines = await wineQueries.getAllWines(householdId, filters);
      return wines.length
        ? wines.map(w => `[ID:${w.id}] ${w.name} ${w.vintage || ''} (${w.wine_type}) 수량:${w.quantity} 추천:${w.drinking_recommendation}`).join('\n')
        : '검색 결과가 없습니다.';
    }

    case 'add_wine': {
      const wine = await wineQueries.addWine(householdId, userId, toolInput);
      return `와인 추가 완료: ${wine.name} (ID: ${wine.id})`;
    }

    case 'update_wine': {
      let wineId = toolInput.wine_id;
      if (!wineId && toolInput.wine_name) {
        const found = await wineQueries.searchWinesByName(householdId, toolInput.wine_name);
        if (found.length === 0) return `"${toolInput.wine_name}" 와인을 찾을 수 없습니다.`;
        if (found.length > 1) return `여러 와인이 검색됨: ${found.map(w => `${w.name}(ID:${w.id})`).join(', ')}. ID를 지정해주세요.`;
        wineId = found[0].id;
      }
      if (!wineId) return '와인 이름이나 ID가 필요합니다.';
      const { wine_name, wine_id, ...updates } = toolInput;
      const updated = await wineQueries.updateWine(wineId, householdId, updates);
      return updated ? `수정 완료: ${updated.name}` : '와인을 찾을 수 없습니다.';
    }

    case 'delete_wine': {
      let wineId = toolInput.wine_id;
      if (!wineId && toolInput.wine_name) {
        const found = await wineQueries.searchWinesByName(householdId, toolInput.wine_name);
        if (found.length === 0) return `"${toolInput.wine_name}" 와인을 찾을 수 없습니다.`;
        if (found.length > 1) return `여러 와인이 검색됨: ${found.map(w => `${w.name}(ID:${w.id})`).join(', ')}. ID를 지정해주세요.`;
        wineId = found[0].id;
      }
      if (!wineId) return '와인 이름이나 ID가 필요합니다.';
      const result = await wineQueries.deleteWine(wineId, householdId);
      return result ? '삭제 완료' : '와인을 찾을 수 없습니다.';
    }

    case 'get_drinking_recommendation': {
      let wine;
      if (toolInput.wine_id) {
        wine = await wineQueries.getWineById(toolInput.wine_id, householdId);
      } else if (toolInput.wine_name) {
        const found = await wineQueries.searchWinesByName(householdId, toolInput.wine_name);
        wine = found[0];
      }
      if (!wine) return '와인을 찾을 수 없습니다.';

      const currentYear = new Date().getFullYear();
      // AI에게 분석 요청을 위한 정보 반환
      return JSON.stringify({
        name: wine.name, vintage: wine.vintage, region: wine.region,
        country: wine.country, grape_variety: wine.grape_variety,
        wine_type: wine.wine_type, current_year: currentYear,
        instruction: '이 와인의 음용 적기를 분석해주세요. drinking_window_start, drinking_window_end, recommendation(optimal_now/age_more/drink_soon), reason을 JSON으로 응답해주세요.',
      });
    }

    case 'estimate_wine_price': {
      return JSON.stringify({
        wine_name: toolInput.wine_name,
        vintage: toolInput.vintage,
        instruction: '이 와인의 한국 시장 기준 추정 시세를 JSON으로 응답하세요. 형식: {"price": 숫자(KRW), "source": "출처 설명"}. 빈티지 연도를 가격 숫자로 혼동하지 마세요. 정확한 가격이 아닌 어림값입니다.',
      });
    }

    case 'add_diary_entry': {
      let wineId = toolInput.wine_id;
      if (!wineId && toolInput.wine_name) {
        const found = await wineQueries.searchWinesByName(householdId, toolInput.wine_name);
        if (found.length === 0) return `"${toolInput.wine_name}" 와인을 찾을 수 없습니다.`;
        wineId = found[0].id;
      }
      if (!wineId) return '와인 이름이나 ID가 필요합니다.';
      const entry = await diaryQueries.addDiaryEntry(householdId, userId, {
        wine_id: wineId,
        rating: toolInput.rating,
        tasting_notes: toolInput.tasting_notes,
        occasion: toolInput.occasion,
        food_pairing: toolInput.food_pairing,
      });
      return `다이어리 작성 완료 (⭐${entry.rating}/5)`;
    }

    case 'search_diary': {
      const allDiary = await diaryQueries.getAllDiaryEntries(householdId);
      let results = allDiary;
      if (toolInput.wine_name) {
        results = allDiary.filter(d => d.wine_name.toLowerCase().includes(toolInput.wine_name.toLowerCase()));
      }
      return results.length
        ? results.slice(0, 10).map(d => `${d.wine_name} ${d.vintage||''}: ⭐${d.rating}/5 (${d.consumed_date}) ${d.tasting_notes || ''}`).join('\n')
        : '다이어리 기록이 없습니다.';
    }

    case 'search_wiki': {
      const results = await botQueries.searchWiki(householdId, toolInput.query);
      return results.length
        ? results.map(w => `[${w.category || '일반'}] ${w.title}: ${w.content}`).join('\n')
        : '검색 결과가 없습니다.';
    }

    case 'save_to_wiki': {
      const entry = await botQueries.saveWiki(householdId, toolInput.title, toolInput.content, toolInput.category);
      return `위키 저장 완료: "${entry.title}"`;
    }

    default:
      return `알 수 없는 도구: ${toolName}`;
  }
}

// ── Chat 엔드포인트 ──

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: '메시지를 입력해주세요.' });
    if (message.length > MAX_INPUT_LENGTH) {
      return res.status(400).json({ error: `메시지는 ${MAX_INPUT_LENGTH}자 이하로 입력해주세요.` });
    }

    const settings = await getUserSettings(req.user.id);
    const month = getCurrentMonth();

    // 비용 제한 확인
    const usage = await botQueries.getMonthlyUsage(req.user.householdId, month);
    const usdToKrw = settings?.usd_to_krw || 1350;
    const maxCostKrw = settings?.bot_max_cost_krw || 10000;
    const currentCostKrw = (usage?.total_cost_usd || 0) * usdToKrw;
    if (currentCostKrw >= maxCostKrw) {
      return res.status(429).json({ error: '이번 달 AI 사용 한도에 도달했습니다.' });
    }

    // RAG 컨텍스트
    const contextText = await gatherContext(req.user.householdId, message);

    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const systemPrompt = `당신은 "Maksoon's Dining"의 전문 소믈리에 AI 비서입니다.
사용자의 와인 컬렉션을 관리하고, 와인에 대한 전문적인 조언을 제공합니다.

전문 분야:
- 와인 빈티지별 음용 적기 판단 (Drinking Window)
- 음식과 와인 페어링 추천
- 와인 보관 조언
- 와인 시세/가치 어림 추정
- 와인 다이어리 작성 지원

현재 날짜: ${today}

한국어로 친근하지만 전문적으로 대화합니다.
필요할 때 도구를 사용하여 와인 리스트와 다이어리에 접근하세요.
와인 추천 시에는 구체적인 이유를 함께 설명해주세요.

${contextText ? `\n--- 참고 데이터 ---\n${contextText}` : ''}`;

    // 대화 히스토리 구성
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
        tools: TOOLS,
      });

      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;

      // 응답 처리
      const toolUses = [];
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text;
        } else if (block.type === 'tool_use') {
          toolUses.push(block);
        }
      }

      if (response.stop_reason === 'end_turn' || toolUses.length === 0) {
        break;
      }

      // Tool 실행
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = [];
      for (const tu of toolUses) {
        try {
          const result = await executeTool(tu.name, tu.input, req.user.householdId, req.user.id);
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
        } catch (err) {
          console.error(`[bot] Tool ${tu.name} error:`, err.message);
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: `오류: ${err.message}`, is_error: true });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      finalText = ''; // Reset for next round
    }

    // 비용 추적
    const costUsd = totalInputTokens * INPUT_COST + totalOutputTokens * OUTPUT_COST;
    await botQueries.trackUsage(req.user.householdId, req.user.id, month, totalInputTokens, totalOutputTokens, costUsd);

    const updatedUsage = await botQueries.getMonthlyUsage(req.user.householdId, month);
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
    console.error('[bot] chat error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/bot/wiki — 위키 목록
router.get('/wiki', async (req, res) => {
  try {
    const wiki = await botQueries.getRecentWiki(req.user.householdId, 50);
    res.json(wiki);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /api/bot/wiki/:id — 위키 삭제
router.delete('/wiki/:id', async (req, res) => {
  try {
    const result = await botQueries.deleteWiki(parseInt(req.params.id), req.user.householdId);
    if (!result) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// ── 구조화된 JSON 응답 전용 ──
router.post('/structured', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: '프롬프트를 입력해주세요.' });
    if (prompt.length > MAX_INPUT_LENGTH) {
      return res.status(400).json({ error: `프롬프트는 ${MAX_INPUT_LENGTH}자 이하로 입력해주세요.` });
    }

    const settings = await getUserSettings(req.user.id);
    const month = getCurrentMonth();

    const usage = await botQueries.getMonthlyUsage(req.user.householdId, month);
    const usdToKrw = settings?.usd_to_krw || 1350;
    const maxCostKrw = settings?.bot_max_cost_krw || 10000;
    const currentCostKrw = (usage?.total_cost_usd || 0) * usdToKrw;
    if (currentCostKrw >= maxCostKrw) {
      return res.status(429).json({ error: '이번 달 AI 사용 한도에 도달했습니다.' });
    }

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: '당신은 와인 전문가입니다. 반드시 유효한 JSON으로만 응답하세요. JSON 외의 텍스트, 설명, 마크다운 코드블록을 절대 포함하지 마세요.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const costUsd = (response.usage?.input_tokens || 0) * INPUT_COST + (response.usage?.output_tokens || 0) * OUTPUT_COST;
    await botQueries.trackUsage(req.user.householdId, req.user.id, month, response.usage?.input_tokens || 0, response.usage?.output_tokens || 0, costUsd);

    res.json({ reply: text });
  } catch (err) {
    console.error('[bot] structured error:', err.message);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
