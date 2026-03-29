import { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';

const WINE_TYPES = ['red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'natural', 'orange'];

const REC_BADGE_LABELS = {
  optimal_now: '지금이 적기',
  age_more: '더 숙성',
  drink_soon: '빨리 마시세요',
};

const REC_BADGE_STYLES = {
  optimal_now: 'bg-green-100 text-green-700',
  age_more: 'bg-yellow-100 text-yellow-700',
  drink_soon: 'bg-red-100 text-red-700',
};

export default function WineForm({ wine, onSave, onClose }) {
  const isEdit = wine && !wine._isNew;
  const [form, setForm] = useState({
    name: wine?.name || '',
    vintage: wine?.vintage || '',
    region: wine?.region || '',
    country: wine?.country || '',
    grape_variety: wine?.grape_variety || '',
    wine_type: wine?.wine_type || 'red',
    purchase_price: wine?.purchase_price || '',
    estimated_price: wine?.estimated_price || '',
    quantity: wine?.quantity || 1,
    storage_location: wine?.storage_location || '',
    memo: wine?.memo || '',
    purchase_date: wine?.purchase_date || '',
    drinking_window_start: wine?.drinking_window_start || '',
    drinking_window_end: wine?.drinking_window_end || '',
    drinking_recommendation: wine?.drinking_recommendation || '',
    recommendation_reason: wine?.recommendation_reason || '',
    label_image_url: wine?.label_image_url || '',
    price_source: wine?.price_source || '',
  });
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const autoAnalyzed = useRef(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('와인 이름을 입력해주세요.');
    setLoading(true);
    setError('');
    const data = {
      ...form,
      vintage: form.vintage ? parseInt(form.vintage) : null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null,
      quantity: parseInt(form.quantity) || 1,
      purchase_date: form.purchase_date || null,
      drinking_window_start: form.drinking_window_start ? parseInt(form.drinking_window_start) : null,
      drinking_window_end: form.drinking_window_end ? parseInt(form.drinking_window_end) : null,
      drinking_recommendation: form.drinking_recommendation || null,
      recommendation_reason: form.recommendation_reason || null,
      label_image_url: form.label_image_url || null,
      price_source: form.price_source || null,
    };
    const res = await onSave(data);
    setLoading(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.error || '저장 실패');
    }
  };

  const handleEstimatePrice = async () => {
    if (!form.name) return;
    setEstimating(true);
    try {
      const res = await api.post('/api/bot/chat', {
        message: `"${form.name}${form.vintage ? ` ${form.vintage}` : ''}" 와인의 한국 시장 추정 시세를 알려줘. 반드시 JSON으로만 응답해. 형식: {"price": 숫자, "source": "출처(예: 와인서처 평균가, Vivino 참고가, 일반 시세 추정 등)"}. 빈티지 연도를 가격으로 혼동하지 마. 가격은 원(KRW) 단위.`,
        history: [],
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || '';
        const jsonMatch = reply.match(/\{[\s\S]*?\}/);
        let parsed = false;
        if (jsonMatch) {
          try {
            const obj = JSON.parse(jsonMatch[0]);
            if (obj.price) {
              handleChange('estimated_price', String(obj.price));
              handleChange('price_source', obj.source || 'AI 추정');
              parsed = true;
              setError(`✓ ${obj.source || 'AI 추정'}`);
              setTimeout(() => setError(''), 3000);
            }
          } catch {}
        }
        if (!parsed) {
          const vintageYear = form.vintage ? Number(form.vintage) : null;
          const allNumbers = (reply.match(/[\d,]+/g) || [])
            .map(s => s.replace(/,/g, ''))
            .filter(s => s.length > 0)
            .map(Number)
            .filter(n => n >= 1000);
          const nonVintage = allNumbers.filter(n => n !== vintageYear);
          const price = nonVintage.length > 0 ? nonVintage[0] : allNumbers[0];
          if (price) {
            handleChange('estimated_price', String(price));
            handleChange('price_source', 'AI 추정');
            setError('✓ AI 추정');
            setTimeout(() => setError(''), 3000);
          }
        }
      }
    } catch {}
    setEstimating(false);
  };

  const handleAnalyze = async () => {
    if (!form.name) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post('/api/bot/structured', {
        prompt: `와인: "${form.name}${form.vintage ? ` ${form.vintage}` : ''}", 타입: ${form.wine_type}, 품종: ${form.grape_variety || '품종 미상'}, 산지: ${form.region || '산지 미상'}
이 와인의 음용 적기를 분석해서 다음 JSON으로 응답: {"drinking_window_start": 연도, "drinking_window_end": 연도, "recommendation": "optimal_now|age_more|drink_soon", "reason": "이유"}`,
      });
      if (res.ok) {
        const data = await res.json();
        const reply = (data.reply || '').trim();
        let parsed = null;
        try { parsed = JSON.parse(reply); } catch {}
        if (!parsed) {
          const m = reply.match(/\{[\s\S]*\}/);
          if (m) try { parsed = JSON.parse(m[0]); } catch {}
        }
        if (parsed && (parsed.drinking_window_start || parsed.drinking_window_end)) {
          if (parsed.drinking_window_start) handleChange('drinking_window_start', parsed.drinking_window_start);
          if (parsed.drinking_window_end) handleChange('drinking_window_end', parsed.drinking_window_end);
          if (parsed.recommendation) handleChange('drinking_recommendation', parsed.recommendation);
          if (parsed.reason) handleChange('recommendation_reason', parsed.reason);
        } else {
          setError('AI 응답 형식이 올바르지 않습니다.');
        }
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || 'AI 분석 요청에 실패했습니다.');
      }
    } catch {
      setError('AI 분석 중 오류가 발생했습니다.');
    }
    setAnalyzing(false);
  };

  useEffect(() => {
    if (
      isEdit &&
      form.name &&
      !autoAnalyzed.current &&
      (!form.drinking_recommendation || form.drinking_recommendation === 'unknown') &&
      !form.drinking_window_start
    ) {
      autoAnalyzed.current = true;
      handleAnalyze();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">{isEdit ? '와인 수정' : '와인 추가'}</h3>

        {error && <div className={`px-3 py-2 rounded-lg text-sm mb-3 ${error.startsWith('✓') ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{error}</div>}

        {form.label_image_url && (
          <div className="mb-3">
            <p className="text-sm text-gray-500 mb-1">라벨 사진</p>
            <img
              src={form.label_image_url}
              alt="와인 라벨"
              className="w-full h-40 object-contain rounded-lg bg-gray-50 border"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">와인 이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">빈티지</label>
              <input
                type="number"
                value={form.vintage}
                onChange={e => handleChange('vintage', e.target.value)}
                placeholder="2020"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">타입</label>
              <select
                value={form.wine_type}
                onChange={e => handleChange('wine_type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {WINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">산지</label>
              <input
                type="text"
                value={form.region}
                onChange={e => handleChange('region', e.target.value)}
                placeholder="Bordeaux, Napa..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">국가</label>
              <input
                type="text"
                value={form.country}
                onChange={e => handleChange('country', e.target.value)}
                placeholder="프랑스, 이탈리아..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">포도 품종</label>
            <input
              type="text"
              value={form.grape_variety}
              onChange={e => handleChange('grape_variety', e.target.value)}
              placeholder="Cabernet Sauvignon, Pinot Noir..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">구입 가격 (원)</label>
              <input
                type="number"
                value={form.purchase_price}
                onChange={e => handleChange('purchase_price', e.target.value)}
                placeholder="50000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">추정 시세 (원)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={form.estimated_price}
                  onChange={e => handleChange('estimated_price', e.target.value)}
                  placeholder="AI 추정"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
                />
                <button
                  type="button"
                  onClick={handleEstimatePrice}
                  disabled={estimating}
                  className="px-2 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
                >
                  {estimating ? '...' : 'AI'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">수량</label>
              <input
                type="number"
                value={form.quantity}
                onChange={e => handleChange('quantity', e.target.value)}
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">보관 위치</label>
              <input
                type="text"
                value={form.storage_location}
                onChange={e => handleChange('storage_location', e.target.value)}
                placeholder="와인셀러, 냉장고..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">구입일</label>
            <input
              type="date"
              value={form.purchase_date}
              onChange={e => handleChange('purchase_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">메모</label>
            <textarea
              value={form.memo}
              onChange={e => handleChange('memo', e.target.value)}
              placeholder="선물받은 와인, 여행 중 구매 등..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 disabled:opacity-50"
          >
            {analyzing ? '분석 중...' : '🤖 AI 음용 적기 분석'}
          </button>

          {(form.drinking_recommendation || form.drinking_window_start) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-green-800">음용 적기 분석 결과</p>
              <div className="flex flex-wrap gap-2 items-center">
                {form.drinking_recommendation && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    REC_BADGE_STYLES[form.drinking_recommendation] || 'bg-gray-100 text-gray-500'
                  }`}>
                    {REC_BADGE_LABELS[form.drinking_recommendation] || form.drinking_recommendation}
                  </span>
                )}
                {form.drinking_window_start && form.drinking_window_end && (
                  <span className="text-sm text-green-700">
                    {form.drinking_window_start}년 ~ {form.drinking_window_end}년
                  </span>
                )}
              </div>
              {form.recommendation_reason && (
                <p className="text-xs text-gray-600">{form.recommendation_reason}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? '저장 중...' : (isEdit ? '수정' : '추가')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
