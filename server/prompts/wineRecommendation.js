/**
 * AI 소믈리에 와인 추천 전용 프롬프트
 * 게스트 위저드에서 수집한 취향 정보를 기반으로 와인을 추천합니다.
 */

function buildRecommendationPrompt(answers, cellarWines) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const systemPrompt = `당신은 "Maksoon's Dining"의 전문 소믈리에 AI입니다.
게스트가 간단한 질문에 답한 취향 정보를 바탕으로, 최적의 와인을 추천해주세요.

현재 날짜: ${today}

## 추천 규칙

### 1. 셀러 와인 매칭
- 제공된 와인 셀러 목록에서 게스트 취향에 맞는 와인을 찾으세요.
- 각 매칭 와인에 0~100점의 매칭도를 부여하세요.
- 매칭도 60점 이상인 와인만 포함하세요 (최대 5개).
- 매칭 이유를 와인 초보자도 이해할 수 있는 쉬운 한국어로 설명하세요.
- 매칭도 기준:
  - 90~100: 취향에 완벽히 부합
  - 70~89: 높은 확률로 만족
  - 60~69: 시도해볼 만한 선택

### 2. 외부 와인 추천
- 셀러에 적합한 와인이 부족하거나, 게스트의 취향 폭을 넓혀줄 와인을 추천하세요.
- **엔트리 레벨** (약 1~5만원대): 부담 없이 시도할 수 있는 와인 1~2개
- **프리미엄 레벨** (약 5만원 이상): 특별한 경험을 위한 와인 1~2개
- 각 와인에 대해:
  - 왜 이 취향에 맞는지 쉬운 말로 설명
  - 한국 시장 기준 대략적인 가격
  - 어디서 구할 수 있는지 (예: 와인앤모어, 이마트 와인, 데일리샷 등)

### 3. 소믈리에 노트
- 추천을 마무리하는 친근하고 따뜻한 한마디를 작성하세요.
- 게스트의 경험 수준에 맞춰 톤을 조절하세요.

## 주의사항
- 와인을 잘 모르는 사람도 이해할 수 있도록 전문 용어를 피하고 쉬운 표현을 사용하세요.
- 게스트가 평가한 와인이 있다면, 그 취향을 적극 반영하세요.
- 음식 페어링이 있다면 음식과의 궁합을 우선 고려하세요.
- 예산 정보가 있다면 그에 맞춰 추천하세요.

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. JSON 외의 텍스트, 설명, 마크다운 코드블록을 절대 포함하지 마세요.

{
  "cellarMatches": [
    {
      "wineId": number,
      "wineName": "와인 이름",
      "matchScore": number,
      "reason": "이 와인을 추천하는 이유 (쉬운 한국어)"
    }
  ],
  "externalRecommendations": {
    "entryLevel": [
      {
        "name": "와인 이름 (빈티지 포함 가능)",
        "whyRecommended": "추천 이유 (쉬운 한국어)",
        "approximatePrice": "약 X만원대",
        "whereToBuy": "구매처 설명 (예: 이마트 와인코너, 와인앤모어 등)"
      }
    ],
    "premium": [
      {
        "name": "와인 이름",
        "whyRecommended": "추천 이유 (쉬운 한국어)",
        "approximatePrice": "약 X만원대",
        "whereToBuy": "구매처 설명"
      }
    ]
  },
  "sommelierNote": "친근한 마무리 멘트"
}`;

  // 사용자 메시지 구성
  const parts = [];

  parts.push('## 게스트 취향 정보\n');

  if (answers.occasion) {
    parts.push(`**상황**: ${answers.occasion}`);
  }
  if (answers.food && answers.food.length > 0) {
    parts.push(`**함께 먹을 음식**: ${answers.food.join(', ')}${answers.foodExtra ? ` (추가: ${answers.foodExtra})` : ''}`);
  }
  if (answers.taste && answers.taste.length > 0) {
    parts.push(`**선호하는 맛**: ${answers.taste.join(', ')}`);
  }
  if (answers.experience) {
    parts.push(`**와인 경험**: ${answers.experience}`);
  }
  if (answers.memorableWine) {
    parts.push(`**기억에 남는 와인**: ${answers.memorableWine}`);
  }
  if (answers.ratedWines && answers.ratedWines.length > 0) {
    const ratedList = answers.ratedWines
      .filter(w => w.name && w.rating)
      .map(w => `- ${w.name}: ${w.rating}/5점`)
      .join('\n');
    if (ratedList) {
      parts.push(`**마셔본 와인 평가**:\n${ratedList}`);
    }
  }
  if (answers.budget && answers.budget.length > 0) {
    parts.push(`**예산**: ${answers.budget.join(', ')}`);
  }
  if (answers.additionalNotes) {
    parts.push(`**추가 요청**: ${answers.additionalNotes}`);
  }

  // 셀러 와인 목록
  if (cellarWines && cellarWines.length > 0) {
    parts.push('\n## 우리집 와인 셀러 목록\n');
    parts.push(cellarWines.map(w =>
      `[ID:${w.id}] ${w.name}${w.vintage ? ` ${w.vintage}` : ''} (${w.wine_type || '미분류'}) ` +
      `수량:${w.quantity}${w.region ? ` 산지:${w.region}` : ''}${w.country ? ` 국가:${w.country}` : ''}` +
      `${w.grape_variety ? ` 품종:${w.grape_variety}` : ''}` +
      `${w.drinking_recommendation && w.drinking_recommendation !== 'unknown' ? ` 음용추천:${w.drinking_recommendation}` : ''}` +
      `${w.wine_description ? ` 설명:${w.wine_description}` : ''}`
    ).join('\n'));
  } else {
    parts.push('\n## 우리집 와인 셀러\n셀러에 등록된 와인이 없습니다.');
  }

  parts.push('\n위 취향 정보와 셀러 목록을 바탕으로 와인을 추천해주세요.');

  return {
    systemPrompt,
    userMessage: parts.join('\n'),
  };
}

module.exports = { buildRecommendationPrompt };
