import { useState } from 'react';
import { WINE_TYPES, RECOMMENDATIONS, TYPE_COLORS, REC_BADGES } from '../../constants/wine';

function DiaryBadge({ entries }) {
  if (!entries || entries.length === 0) return null;
  const latest = entries[0];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
      {'★'.repeat(latest.rating)}{'☆'.repeat(5 - latest.rating)}
      {latest.tasting_notes && <span className="text-gray-400 truncate max-w-[100px]">"{latest.tasting_notes}"</span>}
    </span>
  );
}

export default function WineList({ wines, loading, filters, onFilterChange, onEdit, onDelete, onConsume, onRefresh }) {
  const [consumeModal, setConsumeModal] = useState(null);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [occasion, setOccasion] = useState('');
  const [foodPairing, setFoodPairing] = useState('');
  const [search, setSearch] = useState('');
  const [showLabels, setShowLabels] = useState(true);

  const handleSearch = (e) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: search || undefined });
  };

  const handleConsumeSubmit = async () => {
    await onConsume(consumeModal.id, {
      rating,
      tasting_notes: notes || undefined,
      occasion: occasion || undefined,
      food_pairing: foodPairing || undefined,
    });
    setConsumeModal(null);
    setRating(3);
    setNotes('');
    setOccasion('');
    setFoodPairing('');
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400">로딩 중...</div>;
  }

  return (
    <div>
      {/* 라벨 사진 토글 */}
      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={e => setShowLabels(e.target.checked)}
            className="accent-purple-600"
          />
          라벨 사진 보기
        </label>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-1">
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 focus:ring-1 focus:ring-purple-400 outline-none"
          />
          <button type="submit" className="px-2 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">🔍</button>
        </form>
        <select
          value={filters.wine_type || ''}
          onChange={e => onFilterChange({ ...filters, wine_type: e.target.value || undefined })}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        >
          {WINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={filters.drinking_recommendation || ''}
          onChange={e => onFilterChange({ ...filters, drinking_recommendation: e.target.value || undefined })}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        >
          {RECOMMENDATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm text-gray-500">
          <input
            type="checkbox"
            checked={filters.is_consumed === 'true'}
            onChange={e => onFilterChange({ ...filters, is_consumed: e.target.checked ? 'true' : undefined })}
          />
          소비 완료 포함
        </label>
      </div>

      {/* 와인 카드 그리드 */}
      {wines.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">🍷</div>
          <p>등록된 와인이 없습니다.</p>
          <p className="text-sm mt-1">와인을 추가하거나 라벨을 스캔해보세요!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wines.map(wine => (
            <div
              key={wine.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
                wine.is_consumed ? 'opacity-60 border-gray-200' : 'border-gray-200'
              }`}
            >
              {showLabels && wine.label_image_url && (
                <img
                  src={wine.label_image_url}
                  alt={`${wine.name} 라벨`}
                  className="w-full h-40 object-contain rounded-lg bg-gray-50 mb-2"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{wine.name}</h3>
                  <p className="text-sm text-gray-500">
                    {wine.vintage && <span>{wine.vintage} · </span>}
                    {wine.region && <span>{wine.region}</span>}
                    {wine.grape_variety && <span> · {wine.grape_variety}</span>}
                  </p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[wine.wine_type] || 'bg-gray-100 text-gray-600'}`}>
                  {wine.wine_type}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {wine.drinking_recommendation && REC_BADGES[wine.drinking_recommendation] && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${REC_BADGES[wine.drinking_recommendation].cls}`}>
                    {REC_BADGES[wine.drinking_recommendation].label}
                  </span>
                )}
                <span className="text-xs text-gray-400">수량: {wine.quantity}</span>
                {wine.purchase_price && <span className="text-xs text-gray-400">구입가: {Number(wine.purchase_price).toLocaleString()}원</span>}
                {wine.estimated_price && <span className="text-xs text-blue-400">시세: ~{Number(wine.estimated_price).toLocaleString()}원{wine.price_source && <span className="text-gray-400"> ({wine.price_source})</span>}</span>}
              </div>

              {wine.memo && <p className="text-xs text-gray-400 mb-2 truncate">📝 {wine.memo}</p>}

              <DiaryBadge entries={wine.diary_entries} />

              <div className="flex gap-1.5 mt-3 pt-2 border-t border-gray-100">
                <button onClick={() => onEdit(wine)} className="text-xs text-gray-500 hover:text-purple-600">수정</button>
                <button onClick={() => onDelete(wine.id)} className="text-xs text-gray-500 hover:text-red-600">삭제</button>
                {!wine.is_consumed && (
                  <button onClick={() => setConsumeModal(wine)} className="text-xs text-purple-600 hover:text-purple-800 ml-auto">
                    🍷 마셨어요
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 소비 + 다이어리 모달 */}
      {consumeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-1">🍷 와인 다이어리</h3>
            <p className="text-sm text-gray-500 mb-4">{consumeModal.name} {consumeModal.vintage || ''}</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">별점</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRating(n)} className="text-2xl">
                      {n <= rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">테이스팅 노트</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="맛, 향, 느낌..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:ring-1 focus:ring-purple-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">자리/상황</label>
                <input
                  type="text"
                  value={occasion}
                  onChange={e => setOccasion(e.target.value)}
                  placeholder="기념일, 일상, 모임..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">함께 먹은 음식</label>
                <input
                  type="text"
                  value={foodPairing}
                  onChange={e => setFoodPairing(e.target.value)}
                  placeholder="스테이크, 치즈, 파스타..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setConsumeModal(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleConsumeSubmit}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                기록 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
