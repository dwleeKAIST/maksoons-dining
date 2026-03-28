import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export default function WineDiary({ wines, onRefresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/diary');
        if (res.ok) setEntries(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, [wines]);

  const handleDelete = async (id) => {
    if (!confirm('이 다이어리 기록을 삭제하시겠습니까?')) return;
    const res = await api.delete(`/api/diary/${id}`);
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id));
      onRefresh();
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">로딩 중...</div>;

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-2">📖</div>
        <p>다이어리 기록이 없습니다.</p>
        <p className="text-sm mt-1">와인을 마시고 "마셨어요" 버튼으로 기록해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-gray-900">
                {entry.wine_name}
                {entry.vintage && <span className="text-gray-500 ml-1">{entry.vintage}</span>}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-amber-500">
                  {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  entry.wine_type === 'red' ? 'bg-red-100 text-red-700' :
                  entry.wine_type === 'white' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {entry.wine_type}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-gray-400">{entry.consumed_date}</span>
              <button
                onClick={() => handleDelete(entry.id)}
                className="block text-xs text-gray-400 hover:text-red-500 mt-1"
              >
                삭제
              </button>
            </div>
          </div>

          {entry.tasting_notes && (
            <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">"{entry.tasting_notes}"</p>
          )}

          <div className="flex gap-3 mt-2 text-xs text-gray-400">
            {entry.occasion && <span>🎉 {entry.occasion}</span>}
            {entry.food_pairing && <span>🍽️ {entry.food_pairing}</span>}
            {entry.region && <span>📍 {entry.region}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
