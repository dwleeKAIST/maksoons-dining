/**
 * CellarTracker 매칭 + 3단계 폴백 프롬프트 구성 유틸리티
 */

function findCtMatches(wine, ctData) {
  if (!ctData || !ctData.length) return { exact: [], similar: [] };

  const wineName = (wine.name || '').toLowerCase();
  const wineVintage = wine.vintage ? parseInt(wine.vintage) : null;

  const exact = [];
  const similar = [];

  for (const ct of ctData) {
    const ctName = (ct.wine || '').toLowerCase();
    const ctVintage = ct.vintage;

    // 정확 매칭: 와인명에 포함되고 빈티지 일치
    if (wineVintage && ctVintage === wineVintage && (ctName.includes(wineName) || wineName.includes(ctName))) {
      exact.push(ct);
      continue;
    }

    // 유사 매칭: 같은 생산자+품종, 또는 같은 산지+품종
    const wineVarietal = (wine.grape_variety || '').toLowerCase();
    const ctVarietal = (ct.varietal || '').toLowerCase();
    const wineRegion = (wine.region || '').toLowerCase();
    const ctRegion = (ct.region || '').toLowerCase();
    const ctProducer = (ct.producer || '').toLowerCase();

    if (wineVarietal && ctVarietal && wineVarietal.includes(ctVarietal)) {
      if ((ctProducer && wineName.includes(ctProducer)) || (wineRegion && ctRegion && wineRegion.includes(ctRegion))) {
        similar.push(ct);
      }
    }
  }

  return { exact: exact.slice(0, 3), similar: similar.slice(0, 5) };
}

export function buildDrinkingWindowPrompt(wine, ctData) {
  const { exact, similar } = findCtMatches(wine, ctData);

  let ctSection = '';
  if (exact.length || similar.length) {
    ctSection = '\n--- CellarTracker 참고 데이터 ---\n';
    for (const ct of exact) {
      ctSection += `[정확 매칭] ${ct.wine} ${ct.vintage || 'NV'}: BeginConsume=${ct.beginConsume}, EndConsume=${ct.endConsume}\n`;
    }
    for (const ct of similar) {
      ctSection += `[유사 와인] ${ct.wine} ${ct.vintage || 'NV'} (${ct.varietal}, ${ct.region}): BeginConsume=${ct.beginConsume}, EndConsume=${ct.endConsume}\n`;
    }
  }

  return `와인: "${wine.name}${wine.vintage ? ` ${wine.vintage}` : ''}", 타입: ${wine.wine_type || '미상'}, 품종: ${wine.grape_variety || '품종 미상'}, 산지: ${wine.region || '산지 미상'}
${ctSection}
다음 3단계 우선순위로 음용 적기를 분석하세요:
1단계: CellarTracker 데이터에 정확히 일치하는 와인이 있으면 그 데이터를 기반으로 판단
2단계: 유사 와인(같은 생산자, 품종, 산지)의 데이터가 있으면 이를 참고하여 추론
3단계: 위 데이터가 없으면 포도 품종, 산지, 빈티지 특성을 기반으로 일반적 와인학 지식으로 추정

반드시 다음 JSON으로만 응답: {"drinking_window_start": 연도, "drinking_window_end": 연도, "recommendation": "optimal_now|age_more|drink_soon", "reason": "이유 요약", "source": "ct_exact|ct_similar|ai_estimate", "reasoning": "어떤 데이터/근거로 이 결론에 도달했는지 상세 설명"}`;
}

export function parseDrinkingWindowResponse(reply) {
  const text = (reply || '').trim();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  if (!parsed) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) try { parsed = JSON.parse(m[0]); } catch {}
  }
  if (parsed && (parsed.drinking_window_start || parsed.drinking_window_end)) {
    return parsed;
  }
  return null;
}

export function formatRecommendationReason(parsed) {
  const sourceLabels = {
    ct_exact: 'CellarTracker 정확 매칭',
    ct_similar: 'CellarTracker 유사 와인 참고',
    ai_estimate: 'AI 추정',
  };
  const sourceLabel = sourceLabels[parsed.source] || 'AI 추정';
  const reasoning = parsed.reasoning || parsed.reason || '';
  return `[${sourceLabel}] ${reasoning}`;
}
