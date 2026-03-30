/**
 * 와인 레퍼런스 가이드라인 + CellarTracker 매칭 + 3단계 폴백 프롬프트 구성 유틸리티
 */
import { findReferenceData } from './wineReferenceData';

const STOP_WORDS = new Set([
  'the', 'de', 'du', 'di', 'le', 'la', 'les', 'des', 'del', 'el',
  'et', 'und', 'and', 'or', 'en', 'au', 'aux', 'von', 'van',
]);

function tokenize(str) {
  return (str || '').toLowerCase()
    .split(/[\s,\-()/.]+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function wordOverlapScore(a, b) {
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  if (!wordsA.length || !wordsB.length) return 0;
  const setB = new Set(wordsB);
  const matches = wordsA.filter(w => setB.has(w)).length;
  return matches / Math.min(wordsA.length, wordsB.length);
}

function findCtMatches(wine, ctData) {
  if (!ctData || !ctData.length) return { exact: [], similar: [] };

  const wineName = (wine.name || '').toLowerCase();
  const wineVintage = wine.vintage ? parseInt(wine.vintage) : null;
  const wineVarietal = (wine.grape_variety || '').toLowerCase();
  const wineRegion = (wine.region || '').toLowerCase();

  const exact = [];
  const similar = [];

  for (const ct of ctData) {
    const ctName = (ct.wine || '').toLowerCase();
    const ctVintage = ct.vintage;
    const ctVarietal = (ct.varietal || '').toLowerCase();
    const ctRegion = (ct.region || '').toLowerCase();
    const ctProducer = (ct.producer || '').toLowerCase();

    // 정확 매칭: 빈티지 일치 + 이름/생산자 단어 겹침
    if (wineVintage && ctVintage === wineVintage) {
      const nameScore = wordOverlapScore(ctName, wineName);
      const producerScore = ctProducer ? wordOverlapScore(ctProducer, wineName) : 0;
      if (nameScore >= 0.4 || producerScore >= 0.5) {
        exact.push({ ...ct, _matchScore: Math.max(nameScore, producerScore) });
        continue;
      }
    }

    // 유사 매칭: 품종/지역/생산자/이름 단어 겹침 조합
    const varietalScore = (wineVarietal && ctVarietal) ? wordOverlapScore(wineVarietal, ctVarietal) : 0;
    const regionScore = (wineRegion && ctRegion) ? wordOverlapScore(wineRegion, ctRegion) : 0;
    const producerScore = ctProducer ? wordOverlapScore(ctProducer, wineName) : 0;
    const nameScore = wordOverlapScore(ctName, wineName);

    const strongSignal = varietalScore >= 0.5 || producerScore >= 0.5 || nameScore >= 0.3;
    const supportingSignal = regionScore >= 0.5 || varietalScore >= 0.3 || producerScore >= 0.3;

    if (strongSignal && supportingSignal) {
      similar.push({ ...ct, _matchScore: varietalScore + regionScore + producerScore + nameScore });
    }
  }

  exact.sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
  similar.sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
  return { exact: exact.slice(0, 3), similar: similar.slice(0, 5) };
}

export function buildDrinkingWindowPrompt(wine, ctData) {
  const { exact, similar } = findCtMatches(wine, ctData);

  // CellarTracker 참고 데이터 섹션
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

  // 와인 레퍼런스 가이드라인 섹션
  const refs = findReferenceData(wine);
  let refSection = '';
  if (refs.length > 0) {
    refSection = '\n--- 와인 가이드라인 참고 데이터 ---\n';
    for (const ref of refs) {
      const vintage = wine.vintage ? parseInt(wine.vintage) : null;
      const peakStartYear = vintage ? vintage + ref.window.peakStart : null;
      const peakEndYear = vintage ? vintage + ref.window.peakEnd : null;
      const maxAgeYear = vintage ? vintage + ref.window.maxAge : null;
      refSection += `[${ref.category}] 일반적 음용 적기: 빈티지+${ref.window.peakStart}~${ref.window.peakEnd}년 (최대 ${ref.window.maxAge}년)`;
      if (peakStartYear) {
        refSection += ` → ${peakStartYear}~${peakEndYear}년 (최대 ${maxAgeYear}년)`;
      }
      refSection += `\n  참고: ${ref.tips}\n`;
    }
  }

  const hasCtExact = exact.length > 0;

  return `와인: "${wine.name}${wine.vintage ? ` ${wine.vintage}` : ''}", 타입: ${wine.wine_type || '미상'}, 품종: ${wine.grape_variety || '품종 미상'}, 산지: ${wine.region || '산지 미상'}
${ctSection}${refSection}
다음 우선순위로 음용 적기를 분석하세요:
1단계: CellarTracker 데이터에 정확히 일치하는 와인이 있으면 그 데이터를 기반으로 판단 (source: "ct_exact")
2단계: CellarTracker 유사 와인이 있으면 참고하되, 와인 가이드라인도 함께 고려 (source: "ct_similar")
3단계: 와인 가이드라인 데이터를 기반으로 이 와인의 등급, 생산자 명성, 빈티지 특성을 반영하여 분석 (source: "ref_guided")
4단계: 위 데이터가 모두 없으면 일반적 와인학 지식으로 추정 (source: "ai_estimate")

${hasCtExact ? '' : '중요: CellarTracker 정확 매칭 데이터가 없으므로 와인 가이드라인을 주요 근거로 사용하세요.\n'}반드시 다음 JSON으로만 응답: {"drinking_window_start": 연도, "drinking_window_end": 연도, "recommendation": "optimal_now|age_more|drink_soon", "reason": "이유 요약", "source": "ct_exact|ct_similar|ref_guided|ai_estimate", "reasoning": "어떤 데이터/근거로 이 결론에 도달했는지 상세 설명", "description": "이 와인의 특별한 점을 2-3문장으로 소개 (생산자 특징, 떼루아, 양조 방식, 역사적 의미 등)"}`;
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
    ref_guided: '와인 가이드라인 기반 AI 분석',
    ai_estimate: 'AI 추정',
  };
  const sourceLabel = sourceLabels[parsed.source] || 'AI 추정';
  const reasoning = parsed.reasoning || parsed.reason || '';
  return `[${sourceLabel}] ${reasoning}`;
}

// 서버 사이드에서도 사용할 수 있도록 매칭 유틸리티 export
export { tokenize, wordOverlapScore };
