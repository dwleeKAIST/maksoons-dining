import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import GroceryForm from './GroceryForm';
import GroceryScanner from './GroceryScanner';

const CATEGORY_ICONS = {
  '채소': '🥬', '과일': '🍎', '육류': '🥩', '수산물': '🐟', '유제품': '🥛',
  '음료': '🥤', '냉동식품': '🧊', '양념/조미료': '🧂', '과자/간식': '🍪',
  '곡류': '🌾', '가공식품': '🥫', '기타': '📦',
};

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: '기한 만료', color: 'text-red-600 bg-red-50', days: diff };
  if (diff <= 3) return { label: `D-${diff}`, color: 'text-orange-600 bg-orange-50', days: diff };
  if (diff <= 7) return { label: `D-${diff}`, color: 'text-yellow-600 bg-yellow-50', days: diff };
  return { label: `D-${diff}`, color: 'text-green-600 bg-green-50', days: diff };
}

export default function Grocery() {
  const [groceries, setGroceries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  const fetchGroceries = useCallback(async () => {
    try {
      const res = await api.get('/api/groceries');
      if (res.ok) setGroceries(await res.json());
    } catch (err) {
      console.error('Failed to fetch groceries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroceries(); }, [fetchGroceries]);

  const handleSave = async (data) => {
    const res = editingItem?.id
      ? await api.patch(`/api/groceries/${editingItem.id}`, data)
      : await api.post('/api/groceries', data);
    if (res.ok) {
      setShowForm(false);
      setEditingItem(null);
      fetchGroceries();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 식재료를 삭제하시겠습니까?')) return;
    const res = await api.delete(`/api/groceries/${id}`);
    if (res.ok) fetchGroceries();
  };

  const handleScanResult = () => {
    setShowScanner(false);
    fetchGroceries();
  };

  const categories = [...new Set(groceries.map(g => g.category).filter(Boolean))];
  const filtered = filterCategory ? groceries.filter(g => g.category === filterCategory) : groceries;

  return (
    <div>
      {/* 상단 컨트롤 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">식재료 관리</h2>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm hover:bg-amber-100 transition-colors"
          >
            📸 영수증 스캔
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            + 직접 추가
          </button>
        </div>
      </div>

      {/* 카테고리 필터 */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${!filterCategory ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            전체 ({groceries.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${filterCategory === cat ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {CATEGORY_ICONS[cat] || '📦'} {cat} ({groceries.filter(g => g.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* 식재료 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🥬</div>
          <p className="text-gray-500 mb-1">
            {groceries.length === 0 ? '등록된 식재료가 없습니다.' : '해당 카테고리에 식재료가 없습니다.'}
          </p>
          {groceries.length === 0 && (
            <p className="text-sm text-gray-400">영수증 스캔 또는 직접 추가로 시작하세요.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(item => {
            const expiry = getExpiryStatus(item.expiry_date);
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <span className="text-xl">{CATEGORY_ICONS[item.category] || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 truncate">{item.name}</span>
                    {item.category && <span className="text-xs text-gray-400">{item.category}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {item.quantity && <span>{item.quantity}{item.unit || ''}</span>}
                    {item.purchase_date && <span>구매: {item.purchase_date.split('T')[0]}</span>}
                    {item.memo && <span className="truncate">{item.memo}</span>}
                  </div>
                </div>
                {expiry && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${expiry.color}`}>
                    {expiry.label}
                  </span>
                )}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditingItem(item); setShowForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                    title="수정"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 수동 추가/수정 모달 */}
      {showForm && (
        <GroceryForm
          grocery={editingItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}

      {/* 영수증 스캐너 모달 */}
      {showScanner && (
        <GroceryScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
