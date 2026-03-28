import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import WineList from './WineList';
import WineForm from './WineForm';
import WineDiary from './WineDiary';
import WineScanner from './WineScanner';
import SommelierChat from './SommelierChat';

export default function Wine() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingWine, setEditingWine] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [showSommelier, setShowSommelier] = useState(false);
  const [innerTab, setInnerTab] = useState('list'); // list | diary

  const fetchWines = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.wine_type) params.set('wine_type', filters.wine_type);
      if (filters.vintage_min) params.set('vintage_min', filters.vintage_min);
      if (filters.vintage_max) params.set('vintage_max', filters.vintage_max);
      if (filters.drinking_recommendation) params.set('drinking_recommendation', filters.drinking_recommendation);
      if (filters.is_consumed !== undefined) params.set('is_consumed', filters.is_consumed);
      if (filters.search) params.set('search', filters.search);

      const res = await api.get(`/api/wines?${params}`);
      if (res.ok) setWines(await res.json());
    } catch (err) {
      console.error('Failed to fetch wines:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchWines(); }, [fetchWines]);

  const handleSave = async (data) => {
    const res = editingWine?.id
      ? await api.patch(`/api/wines/${editingWine.id}`, data)
      : await api.post('/api/wines', data);
    if (res.ok) {
      setShowForm(false);
      setEditingWine(null);
      fetchWines();
    }
    return res;
  };

  const handleDelete = async (id) => {
    if (!confirm('이 와인을 삭제하시겠습니까?')) return;
    const res = await api.delete(`/api/wines/${id}`);
    if (res.ok) fetchWines();
  };

  const handleConsume = async (id, diaryData) => {
    const res = await api.post(`/api/wines/${id}/consume`, diaryData || {});
    if (res.ok) fetchWines();
    return res;
  };

  const handleScanResult = (parsedWines) => {
    setShowScanner(false);
    if (parsedWines.length > 0) {
      setEditingWine(null);
      // 첫 번째 와인 데이터를 폼에 자동 입력
      setEditingWine({ ...parsedWines[0], _isNew: true });
      setShowForm(true);
    }
  };

  return (
    <div className="relative">
      {/* 상단 컨트롤 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setInnerTab('list')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${innerTab === 'list' ? 'bg-white shadow text-purple-700 font-medium' : 'text-gray-500'}`}
          >
            와인 리스트
          </button>
          <button
            onClick={() => setInnerTab('diary')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${innerTab === 'diary' ? 'bg-white shadow text-purple-700 font-medium' : 'text-gray-500'}`}
          >
            다이어리
          </button>
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm hover:bg-amber-100 transition-colors"
          >
            📸 스캔
          </button>
          <button
            onClick={() => { setEditingWine(null); setShowForm(true); }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
          >
            + 와인 추가
          </button>
          <button
            onClick={() => setShowSommelier(!showSommelier)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showSommelier ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            🤖 소믈리에
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className={`flex gap-4 ${showSommelier ? '' : ''}`}>
        <div className={`flex-1 min-w-0 ${showSommelier ? 'max-w-[60%]' : ''}`}>
          {innerTab === 'list' ? (
            <WineList
              wines={wines}
              loading={loading}
              filters={filters}
              onFilterChange={setFilters}
              onEdit={(wine) => { setEditingWine(wine); setShowForm(true); }}
              onDelete={handleDelete}
              onConsume={handleConsume}
              onRefresh={fetchWines}
            />
          ) : (
            <WineDiary wines={wines} onRefresh={fetchWines} />
          )}
        </div>

        {/* 소믈리에 사이드 패널 */}
        {showSommelier && (
          <div className="w-[40%] min-w-[320px] flex-shrink-0">
            <SommelierChat onWineChange={fetchWines} />
          </div>
        )}
      </div>

      {/* 와인 추가/수정 모달 */}
      {showForm && (
        <WineForm
          wine={editingWine}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingWine(null); }}
        />
      )}

      {/* 스캐너 모달 */}
      {showScanner && (
        <WineScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
