/**
 * 와인 카테고리별 음용 적기 가이드라인 레퍼런스 데이터
 * CellarTracker 의존 없이 AI 프롬프트에 구조화된 참고 데이터를 제공
 */

const WINE_REFERENCE = [
  // ── 프랑스: 보르도 ──
  {
    keywords: { region: ['bordeaux', 'médoc', 'medoc', 'haut-médoc', 'haut medoc', 'pauillac', 'saint-julien', 'saint julien', 'margaux', 'saint-estèphe', 'saint estephe', 'pessac-léognan', 'pessac leognan', 'graves'], grape: ['cabernet sauvignon', 'merlot', 'cabernet franc'], type: ['red'] },
    category: 'Bordeaux Left Bank (Cabernet dominant)',
    window: { peakStart: 8, peakEnd: 20, maxAge: 40 },
    tips: 'Cru Classé급은 peakEnd+10년, Cru Bourgeois는 peakEnd-5년. 우수빈티지(2005,2009,2010,2015,2016,2018,2019,2020)는 +30%.',
  },
  {
    keywords: { region: ['saint-émilion', 'saint emilion', 'pomerol', 'fronsac', 'côtes de bordeaux'], grape: ['merlot', 'cabernet franc'], type: ['red'] },
    category: 'Bordeaux Right Bank (Merlot dominant)',
    window: { peakStart: 5, peakEnd: 15, maxAge: 30 },
    tips: 'Pomerol/Saint-Émilion Grand Cru는 더 긴 숙성. Merlot 위주로 Left Bank보다 일찍 접근 가능.',
  },
  {
    keywords: { region: ['bordeaux', 'entre-deux-mers', 'graves'], grape: ['sauvignon blanc', 'sémillon', 'semillon'], type: ['white'] },
    category: 'Bordeaux White (Dry)',
    window: { peakStart: 2, peakEnd: 8, maxAge: 15 },
    tips: 'Pessac-Léognan 화이트는 더 긴 숙성 가능. 일반 Bordeaux Blanc은 3-5년 내 음용.',
  },
  {
    keywords: { region: ['sauternes', 'barsac', 'loupiac', 'cadillac'], grape: ['sémillon', 'semillon', 'sauvignon blanc'], type: ['dessert', 'white'] },
    category: 'Bordeaux Sweet (Sauternes/Barsac)',
    window: { peakStart: 5, peakEnd: 30, maxAge: 60 },
    tips: 'Premier Cru Supérieur(Yquem)는 100년 이상 숙성 가능. 산도와 당도가 장기 숙성의 핵심.',
  },

  // ── 프랑스: 부르고뉴 ──
  {
    keywords: { region: ['bourgogne', 'burgundy', 'côte de nuits', 'cote de nuits', 'gevrey-chambertin', 'chambolle-musigny', 'vosne-romanée', 'vosne romanee', 'nuits-saint-georges', 'côte de beaune', 'cote de beaune', 'pommard', 'volnay', 'corton'], grape: ['pinot noir'], type: ['red'] },
    category: 'Burgundy Red (Pinot Noir)',
    window: { peakStart: 5, peakEnd: 15, maxAge: 30 },
    tips: 'Grand Cru는 peakEnd+10년. Village급은 5-10년. 우수빈티지(2005,2009,2010,2015,2019,2020)는 더 긴 숙성.',
  },
  {
    keywords: { region: ['bourgogne', 'burgundy', 'chablis', 'meursault', 'puligny-montrachet', 'puligny montrachet', 'chassagne-montrachet', 'chassagne montrachet', 'corton-charlemagne', 'corton charlemagne'], grape: ['chardonnay'], type: ['white'] },
    category: 'Burgundy White (Chardonnay)',
    window: { peakStart: 3, peakEnd: 10, maxAge: 20 },
    tips: 'Grand Cru(Montrachet, Corton-Charlemagne)는 15-25년. Chablis Premier Cru는 5-12년. Village급 3-7년.',
  },
  {
    keywords: { region: ['beaujolais', 'morgon', 'moulin-à-vent', 'moulin a vent', 'fleurie', 'côte de brouilly'], grape: ['gamay'], type: ['red'] },
    category: 'Beaujolais (Gamay)',
    window: { peakStart: 1, peakEnd: 5, maxAge: 10 },
    tips: 'Cru Beaujolais(Morgon, Moulin-à-Vent)는 5-10년. Beaujolais Nouveau는 출시 후 빨리.',
  },

  // ── 프랑스: 론 밸리 ──
  {
    keywords: { region: ['rhône', 'rhone', 'côtes du rhône', 'cotes du rhone', 'châteauneuf-du-pape', 'chateauneuf du pape', 'hermitage', 'côte-rôtie', 'cote rotie', 'cornas', 'saint-joseph', 'crozes-hermitage', 'gigondas', 'vacqueyras'], grape: ['syrah', 'grenache', 'mourvèdre', 'mourvedre'], type: ['red'] },
    category: 'Rhône Valley Red',
    window: { peakStart: 5, peakEnd: 15, maxAge: 30 },
    tips: 'Hermitage/Côte-Rôtie는 15-30년. Châteauneuf-du-Pape는 10-20년. Côtes du Rhône Villages는 3-8년.',
  },
  {
    keywords: { region: ['rhône', 'rhone', 'condrieu', 'château-grillet'], grape: ['viognier'], type: ['white'] },
    category: 'Rhône Valley White (Viognier)',
    window: { peakStart: 1, peakEnd: 5, maxAge: 8 },
    tips: 'Viognier는 젊었을 때 향이 가장 화려. 일부 Condrieu는 5-8년 숙성 가능.',
  },

  // ── 프랑스: 루아르 ──
  {
    keywords: { region: ['loire', 'sancerre', 'pouilly-fumé', 'pouilly fume', 'vouvray', 'muscadet', 'chinon', 'bourgueil', 'savennières'], grape: ['sauvignon blanc', 'chenin blanc', 'cabernet franc'], type: ['white', 'red'] },
    category: 'Loire Valley',
    window: { peakStart: 2, peakEnd: 8, maxAge: 20 },
    tips: 'Vouvray moelleux/doux는 20-50년. Sancerre/Pouilly-Fumé 화이트는 2-5년. Chinon 레드는 5-15년.',
  },

  // ── 프랑스: 알자스 ──
  {
    keywords: { region: ['alsace', 'alsac'], grape: ['riesling', 'gewurztraminer', 'gewürztraminer', 'pinot gris', 'muscat'], type: ['white'] },
    category: 'Alsace White',
    window: { peakStart: 3, peakEnd: 10, maxAge: 25 },
    tips: 'Grand Cru Riesling은 10-25년. Vendange Tardive/SGN은 20-50년. 일반 Alsace는 3-7년.',
  },

  // ── 프랑스: 샴페인 ──
  {
    keywords: { region: ['champagne', 'champane'], grape: ['chardonnay', 'pinot noir', 'pinot meunier'], type: ['sparkling'] },
    category: 'Champagne',
    window: { peakStart: 3, peakEnd: 10, maxAge: 25 },
    tips: 'Vintage Champagne는 10-20년. Prestige Cuvée(Dom Pérignon, Krug)는 15-30년. Non-vintage는 출시 후 3-5년.',
  },

  // ── 이탈리아 ──
  {
    keywords: { region: ['barolo', 'barbaresco', 'langhe', 'piemonte', 'piedmont'], grape: ['nebbiolo'], type: ['red'] },
    category: 'Piedmont Nebbiolo (Barolo/Barbaresco)',
    window: { peakStart: 8, peakEnd: 20, maxAge: 40 },
    tips: 'Barolo는 Barbaresco보다 타닌이 강해 더 긴 숙성 필요. 현대적 양조는 더 일찍 접근 가능.',
  },
  {
    keywords: { region: ['toscana', 'tuscany', 'chianti', 'brunello', 'montalcino', 'bolgheri', 'maremma', 'vino nobile'], grape: ['sangiovese', 'cabernet sauvignon', 'merlot'], type: ['red'] },
    category: 'Tuscany Red (Sangiovese/Super Tuscan)',
    window: { peakStart: 5, peakEnd: 15, maxAge: 30 },
    tips: 'Brunello di Montalcino는 10-25년. Chianti Classico Riserva는 8-15년. Super Tuscan(Sassicaia, Ornellaia)는 10-25년.',
  },
  {
    keywords: { region: ['veneto', 'valpolicella', 'amarone'], grape: ['corvina', 'rondinella', 'corvinone'], type: ['red'] },
    category: 'Veneto (Amarone/Valpolicella)',
    window: { peakStart: 5, peakEnd: 15, maxAge: 25 },
    tips: 'Amarone는 10-25년. Ripasso는 5-10년. Valpolicella Classico는 2-5년.',
  },
  {
    keywords: { region: ['sicilia', 'sicily', 'etna', 'sardegna', 'puglia', 'campania', 'aglianico'], grape: ['nero d\'avola', 'nerello mascalese', 'aglianico', 'primitivo'], type: ['red'] },
    category: 'Southern Italy Red',
    window: { peakStart: 3, peakEnd: 10, maxAge: 20 },
    tips: 'Etna Rosso(Nerello Mascalese)는 Pinot Noir처럼 우아하게 숙성. Taurasi(Aglianico)는 10-20년.',
  },
  {
    keywords: { region: ['prosecco', 'veneto', 'trentino', 'franciacorta', 'asti'], grape: ['glera', 'chardonnay', 'pinot noir', 'moscato'], type: ['sparkling'] },
    category: 'Italian Sparkling',
    window: { peakStart: 0, peakEnd: 3, maxAge: 8 },
    tips: 'Franciacorta Riserva는 5-10년. Prosecco는 1-2년 내 음용. Asti Spumante는 바로 음용.',
  },

  // ── 스페인 ──
  {
    keywords: { region: ['rioja', 'ribera del duero', 'ribera', 'priorat', 'toro', 'castilla'], grape: ['tempranillo', 'garnacha', 'grenache', 'graciano'], type: ['red'] },
    category: 'Spain Red (Tempranillo)',
    window: { peakStart: 5, peakEnd: 15, maxAge: 30 },
    tips: 'Gran Reserva는 이미 장기 숙성 후 출시. Reserva는 5-15년. Crianza는 3-8년. Priorat는 10-25년.',
  },
  {
    keywords: { region: ['jerez', 'sherry', 'montilla'], grape: ['palomino', 'pedro ximénez', 'pedro ximenez'], type: ['fortified', 'dessert'] },
    category: 'Sherry',
    window: { peakStart: 0, peakEnd: 5, maxAge: 50 },
    tips: 'Fino/Manzanilla는 개봉 후 빨리 음용. Amontillado/Oloroso/PX는 사실상 무한 숙성.',
  },
  {
    keywords: { region: ['cava', 'penedès', 'penedes'], grape: ['macabeo', 'xarel-lo', 'parellada'], type: ['sparkling'] },
    category: 'Cava',
    window: { peakStart: 0, peakEnd: 3, maxAge: 6 },
    tips: 'Gran Reserva Cava는 3-6년. 일반 Cava는 출시 후 1-2년 내 음용.',
  },

  // ── 포르투갈 ──
  {
    keywords: { region: ['porto', 'port', 'douro'], grape: ['touriga nacional', 'touriga franca', 'tinta roriz'], type: ['fortified', 'red'] },
    category: 'Port / Douro',
    window: { peakStart: 5, peakEnd: 20, maxAge: 60 },
    tips: 'Vintage Port는 10-30년. Vintage Tawny는 즉시 음용. LBV는 5-15년. Douro 레드는 5-15년.',
  },

  // ── 독일 ──
  {
    keywords: { region: ['mosel', 'rheingau', 'pfalz', 'nahe', 'rheinhessen', 'baden', 'franken', 'germany', 'deutschland'], grape: ['riesling', 'spätburgunder', 'spatburgunder', 'silvaner'], type: ['white'] },
    category: 'German Riesling',
    window: { peakStart: 3, peakEnd: 12, maxAge: 30 },
    tips: 'Grosses Gewächs/GG는 10-25년. Spätlese/Auslese는 10-30년. TBA는 50년+. Kabinett은 3-10년.',
  },

  // ── 오스트리아 ──
  {
    keywords: { region: ['wachau', 'kamptal', 'kremstal', 'austria', 'österreich', 'burgenland'], grape: ['grüner veltliner', 'gruner veltliner', 'riesling', 'blaufränkisch'], type: ['white', 'red'] },
    category: 'Austria',
    window: { peakStart: 2, peakEnd: 10, maxAge: 20 },
    tips: 'Wachau Smaragd Riesling은 10-20년. Grüner Veltliner Reserve는 5-12년. Blaufränkisch는 5-15년.',
  },

  // ── 미국: 캘리포니아 ──
  {
    keywords: { region: ['napa', 'napa valley', 'sonoma', 'california', 'paso robles', 'santa barbara', 'central coast'], grape: ['cabernet sauvignon', 'merlot', 'cabernet franc'], type: ['red'] },
    category: 'California Cabernet Sauvignon',
    window: { peakStart: 5, peakEnd: 15, maxAge: 30 },
    tips: 'Napa Cult Cab(Screaming Eagle, Opus One 등)는 15-30년. 일반 Napa Cab은 5-12년.',
  },
  {
    keywords: { region: ['california', 'sonoma', 'russian river', 'santa barbara', 'oregon', 'willamette'], grape: ['pinot noir'], type: ['red'] },
    category: 'US Pinot Noir (California/Oregon)',
    window: { peakStart: 3, peakEnd: 10, maxAge: 18 },
    tips: 'Oregon Willamette는 부르고뉴 스타일로 10-15년. California는 좀 더 일찍 접근 가능.',
  },
  {
    keywords: { region: ['california', 'napa', 'sonoma', 'santa barbara'], grape: ['chardonnay'], type: ['white'] },
    category: 'California Chardonnay',
    window: { peakStart: 2, peakEnd: 7, maxAge: 12 },
    tips: '오크 숙성 프리미엄 Chardonnay는 5-10년. Unoaked는 2-4년.',
  },
  {
    keywords: { region: ['california', 'sonoma', 'paso robles', 'barossa', 'mclaren vale'], grape: ['zinfandel', 'petite sirah'], type: ['red'] },
    category: 'Zinfandel / Petite Sirah',
    window: { peakStart: 3, peakEnd: 10, maxAge: 15 },
    tips: '고급 Zinfandel은 8-12년. 일반급은 3-6년.',
  },

  // ── 호주 ──
  {
    keywords: { region: ['barossa', 'mclaren vale', 'hunter valley', 'coonawarra', 'margaret river', 'australia', 'yarra valley', 'adelaide hills'], grape: ['shiraz', 'syrah', 'cabernet sauvignon', 'grenache'], type: ['red'] },
    category: 'Australian Red (Shiraz/Cab)',
    window: { peakStart: 5, peakEnd: 15, maxAge: 25 },
    tips: 'Penfolds Grange급은 20-40년. Barossa Shiraz는 10-20년. Margaret River Cab은 10-20년.',
  },
  {
    keywords: { region: ['australia', 'eden valley', 'clare valley', 'tasmania'], grape: ['riesling', 'chardonnay', 'semillon'], type: ['white'] },
    category: 'Australian White',
    window: { peakStart: 2, peakEnd: 8, maxAge: 15 },
    tips: 'Clare/Eden Valley Riesling은 5-15년. Hunter Valley Semillon은 10-20년.',
  },

  // ── 뉴질랜드 ──
  {
    keywords: { region: ['new zealand', 'marlborough', 'central otago', 'hawkes bay', 'martinborough'], grape: ['sauvignon blanc', 'pinot noir'], type: ['white', 'red'] },
    category: 'New Zealand',
    window: { peakStart: 1, peakEnd: 5, maxAge: 12 },
    tips: 'Marlborough Sauv Blanc은 1-3년. Central Otago Pinot Noir는 5-12년. Hawkes Bay Syrah는 5-10년.',
  },

  // ── 칠레 ──
  {
    keywords: { region: ['chile', 'maipo', 'colchagua', 'cachapoal', 'aconcagua', 'casablanca', 'leyda'], grape: ['cabernet sauvignon', 'carmenere', 'carménère', 'merlot', 'syrah'], type: ['red'] },
    category: 'Chile Red',
    window: { peakStart: 3, peakEnd: 10, maxAge: 20 },
    tips: 'Icon급(Don Melchor, Almaviva 등)은 10-20년. Reserva급은 3-8년. Carménère는 5-12년.',
  },

  // ── 아르헨티나 ──
  {
    keywords: { region: ['argentina', 'mendoza', 'uco valley', 'salta', 'patagonia'], grape: ['malbec', 'cabernet sauvignon', 'bonarda'], type: ['red'] },
    category: 'Argentina Red (Malbec)',
    window: { peakStart: 3, peakEnd: 10, maxAge: 20 },
    tips: 'Uco Valley 고급 Malbec은 10-18년. Reserva급은 5-10년. 일반급은 2-5년.',
  },

  // ── 남아공 ──
  {
    keywords: { region: ['south africa', 'stellenbosch', 'swartland', 'franschhoek', 'paarl', 'constantia'], grape: ['pinotage', 'chenin blanc', 'cabernet sauvignon', 'syrah'], type: ['red', 'white'] },
    category: 'South Africa',
    window: { peakStart: 3, peakEnd: 10, maxAge: 18 },
    tips: 'Old Vine Chenin Blanc은 5-12년. Stellenbosch Cab은 8-15년. Swartland Syrah는 5-12년.',
  },

  // ── 일반 품종 기반 (산지 불명 시 폴백) ──
  {
    keywords: { region: [], grape: ['cabernet sauvignon'], type: ['red'] },
    category: 'Cabernet Sauvignon (General)',
    window: { peakStart: 5, peakEnd: 12, maxAge: 25 },
    tips: '산지와 가격대에 따라 편차 큼. 프리미엄급은 더 긴 숙성.',
  },
  {
    keywords: { region: [], grape: ['merlot'], type: ['red'] },
    category: 'Merlot (General)',
    window: { peakStart: 3, peakEnd: 10, maxAge: 18 },
    tips: 'Cab Sauv보다 일찍 접근 가능. 부드러운 타닌.',
  },
  {
    keywords: { region: [], grape: ['pinot noir'], type: ['red'] },
    category: 'Pinot Noir (General)',
    window: { peakStart: 3, peakEnd: 10, maxAge: 18 },
    tips: '섬세한 품종. 서늘한 기후에서 더 긴 숙성 가능.',
  },
  {
    keywords: { region: [], grape: ['syrah', 'shiraz'], type: ['red'] },
    category: 'Syrah/Shiraz (General)',
    window: { peakStart: 4, peakEnd: 12, maxAge: 20 },
    tips: '구세계(Syrah) 스타일은 더 길게, 신세계(Shiraz) 스타일은 좀 더 일찍.',
  },
  {
    keywords: { region: [], grape: ['chardonnay'], type: ['white'] },
    category: 'Chardonnay (General)',
    window: { peakStart: 2, peakEnd: 6, maxAge: 12 },
    tips: '오크 숙성 여부에 따라 큰 차이. Unoaked는 빨리 음용.',
  },
  {
    keywords: { region: [], grape: ['sauvignon blanc'], type: ['white'] },
    category: 'Sauvignon Blanc (General)',
    window: { peakStart: 1, peakEnd: 3, maxAge: 5 },
    tips: '신선함이 핵심. 대부분 1-3년 내 음용. Loire/Bordeaux 고급급 예외.',
  },
  {
    keywords: { region: [], grape: ['riesling'], type: ['white'] },
    category: 'Riesling (General)',
    window: { peakStart: 3, peakEnd: 10, maxAge: 25 },
    tips: '높은 산도 덕분에 장기 숙성 가능. 당도 높을수록 더 오래 숙성.',
  },
  {
    keywords: { region: [], grape: ['tempranillo'], type: ['red'] },
    category: 'Tempranillo (General)',
    window: { peakStart: 3, peakEnd: 12, maxAge: 25 },
    tips: 'Gran Reserva급은 이미 장기 숙성 후 출시.',
  },
  {
    keywords: { region: [], grape: ['sangiovese'], type: ['red'] },
    category: 'Sangiovese (General)',
    window: { peakStart: 4, peakEnd: 12, maxAge: 20 },
    tips: '산도가 높아 숙성 잠재력 우수.',
  },
  {
    keywords: { region: [], grape: ['nebbiolo'], type: ['red'] },
    category: 'Nebbiolo (General)',
    window: { peakStart: 6, peakEnd: 18, maxAge: 35 },
    tips: '강한 타닌과 산도. 인내심이 필요한 품종.',
  },
  {
    keywords: { region: [], grape: ['grenache', 'garnacha'], type: ['red'] },
    category: 'Grenache/Garnacha (General)',
    window: { peakStart: 3, peakEnd: 8, maxAge: 15 },
    tips: '블렌드에 많이 사용. 단독 사용 시 과실향 위주.',
  },
  {
    keywords: { region: [], grape: ['malbec'], type: ['red'] },
    category: 'Malbec (General)',
    window: { peakStart: 3, peakEnd: 8, maxAge: 15 },
    tips: '아르헨티나가 대표 산지. 프리미엄급은 더 긴 숙성.',
  },

  // ── 타입 기반 폴백 (품종/산지 불명 시) ──
  {
    keywords: { region: [], grape: [], type: ['red'] },
    category: 'Red Wine (General)',
    window: { peakStart: 3, peakEnd: 8, maxAge: 15 },
    tips: '타닌과 산도가 높을수록 숙성 잠재력 높음.',
  },
  {
    keywords: { region: [], grape: [], type: ['white'] },
    category: 'White Wine (General)',
    window: { peakStart: 1, peakEnd: 4, maxAge: 8 },
    tips: '대부분 2-4년 내 음용. 오크 숙성/고급급은 예외.',
  },
  {
    keywords: { region: [], grape: [], type: ['rosé'] },
    category: 'Rosé (General)',
    window: { peakStart: 0, peakEnd: 2, maxAge: 3 },
    tips: '거의 모든 로제는 출시 후 1-2년 내 음용.',
  },
  {
    keywords: { region: [], grape: [], type: ['sparkling'] },
    category: 'Sparkling (General)',
    window: { peakStart: 0, peakEnd: 3, maxAge: 8 },
    tips: '전통 방식(Champagne, Cava, Franciacorta)은 더 긴 숙성 가능.',
  },
  {
    keywords: { region: [], grape: [], type: ['dessert'] },
    category: 'Dessert Wine (General)',
    window: { peakStart: 3, peakEnd: 15, maxAge: 40 },
    tips: '높은 당도와 산도가 장기 숙성을 가능하게 함.',
  },
  {
    keywords: { region: [], grape: [], type: ['fortified'] },
    category: 'Fortified Wine (General)',
    window: { peakStart: 2, peakEnd: 20, maxAge: 50 },
    tips: '알코올 강화로 장기 숙성 가능. Port, Sherry, Madeira 등.',
  },
  {
    keywords: { region: [], grape: [], type: ['natural'] },
    category: 'Natural Wine',
    window: { peakStart: 0, peakEnd: 3, maxAge: 5 },
    tips: 'SO2 미첨가로 대부분 빨리 음용 권장. 일부 고급 내추럴은 예외.',
  },
  {
    keywords: { region: [], grape: [], type: ['orange'] },
    category: 'Orange Wine',
    window: { peakStart: 1, peakEnd: 5, maxAge: 10 },
    tips: '스킨 컨택으로 타닌이 있어 화이트보다 숙성 가능.',
  },
];

function normalizeStr(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchKeywords(wineValue, keywords) {
  if (!keywords || !keywords.length) return 0;
  const val = normalizeStr(wineValue);
  if (!val) return 0;
  let score = 0;
  for (const kw of keywords) {
    if (val.includes(normalizeStr(kw))) {
      score += kw.length; // longer keyword = more specific = higher score
    }
  }
  return score;
}

/**
 * 와인 정보로 가장 적합한 레퍼런스 가이드라인을 찾는다.
 * @param {Object} wine - { wine_type, region, grape_variety, name }
 * @returns {Array} 매칭된 레퍼런스 목록 (최대 3개, 점수순)
 */
export function findReferenceData(wine) {
  const wineType = normalizeStr(wine.wine_type);
  const wineRegion = normalizeStr(wine.region);
  const wineGrape = normalizeStr(wine.grape_variety);
  const wineName = normalizeStr(wine.name);

  const scored = [];

  for (const ref of WINE_REFERENCE) {
    let score = 0;

    // 타입 매칭 (필수)
    const typeMatch = ref.keywords.type.length === 0 ||
      ref.keywords.type.some(t => wineType.includes(t));
    if (!typeMatch && ref.keywords.type.length > 0) continue;

    // 산지 매칭
    const regionScore = Math.max(
      matchKeywords(wineRegion, ref.keywords.region),
      matchKeywords(wineName, ref.keywords.region)
    );
    score += regionScore * 3; // 산지는 가장 중요

    // 품종 매칭
    const grapeScore = Math.max(
      matchKeywords(wineGrape, ref.keywords.grape),
      matchKeywords(wineName, ref.keywords.grape)
    );
    score += grapeScore * 2;

    // 타입 매칭 보너스
    if (typeMatch && ref.keywords.type.length > 0) score += 1;

    // 구체적 카테고리 보너스 (region+grape 키워드가 있는 항목 우선)
    if (ref.keywords.region.length > 0) score += 0.5;
    if (ref.keywords.grape.length > 0) score += 0.3;

    if (score > 0) {
      scored.push({ ...ref, _score: score });
    }
  }

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 3);
}

export { WINE_REFERENCE };
