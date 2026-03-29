export const WINE_TYPES = [
  { value: '', label: '전체' },
  { value: 'red', label: '레드' },
  { value: 'white', label: '화이트' },
  { value: 'rosé', label: '로제' },
  { value: 'sparkling', label: '스파클링' },
  { value: 'dessert', label: '디저트' },
  { value: 'fortified', label: '주정강화' },
  { value: 'natural', label: '내추럴' },
  { value: 'orange', label: '오렌지' },
];

export const RECOMMENDATIONS = [
  { value: '', label: '전체' },
  { value: 'optimal_now', label: '🟢 지금이 적기' },
  { value: 'age_more', label: '🟡 더 숙성' },
  { value: 'drink_soon', label: '🔴 빨리 마시세요' },
  { value: 'unknown', label: '⚪ 분석 전' },
];

export const TYPE_COLORS = {
  red: 'bg-red-100 text-red-700',
  white: 'bg-yellow-50 text-yellow-700',
  'rosé': 'bg-pink-100 text-pink-700',
  sparkling: 'bg-blue-50 text-blue-700',
  dessert: 'bg-amber-100 text-amber-700',
  fortified: 'bg-orange-100 text-orange-700',
  natural: 'bg-green-50 text-green-700',
  orange: 'bg-orange-50 text-orange-700',
};

export const REC_BADGES = {
  optimal_now: { label: '지금이 적기', cls: 'bg-green-100 text-green-700' },
  age_more: { label: '더 숙성', cls: 'bg-yellow-100 text-yellow-700' },
  drink_soon: { label: '빨리 마시세요', cls: 'bg-red-100 text-red-700' },
  unknown: { label: '분석 전', cls: 'bg-gray-100 text-gray-500' },
};
