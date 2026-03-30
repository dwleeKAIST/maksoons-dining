import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { WINE_TYPES, RECOMMENDATIONS, TYPE_COLORS, REC_BADGES } from '../constants/wine';
import WineRecommendationWizard from '../components/WineRecommendationWizard';

const GUEST_EXAMPLE_CHIPS = [
  '지금 마시기 좋은 와인 추천해줘',
  '스테이크에 어울리는 와인은?',
  '와인 리스트 보여줘',
];

function GuestSommelierChat({ token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = text?.trim() || input.trim();
    if (!trimmed || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`/api/guest/${token}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || '오류가 발생했습니다.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '서버 연결 실패' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[500px]">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <span className="font-medium text-sm text-gray-800">소믈리에</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm mb-4">소믈리에에게 와인에 대해 물어보세요!</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {GUEST_EXAMPLE_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(chip)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs hover:bg-purple-100 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="소믈리에에게 물어보세요..."
            rows={1}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-1 focus:ring-purple-400 outline-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuestWineList() {
  const { token } = useParams();
  const [householdName, setHouseholdName] = useState('');
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({ countries: [], grape_varieties: [] });
  const [search, setSearch] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [requestState, setRequestState] = useState({}); // { [wineId]: 'loading' | 'done' | 'error' }
  const [expandedWineId, setExpandedWineId] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const handleRequest = async (wineId) => {
    setRequestState(prev => ({ ...prev, [wineId]: 'loading' }));
    try {
      const res = await fetch(`/api/guest/${token}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine_id: wineId }),
      });
      if (res.ok) {
        setRequestState(prev => ({ ...prev, [wineId]: 'done' }));
      } else {
        setRequestState(prev => ({ ...prev, [wineId]: 'error' }));
        setTimeout(() => setRequestState(prev => ({ ...prev, [wineId]: undefined })), 3000);
      }
    } catch {
      setRequestState(prev => ({ ...prev, [wineId]: 'error' }));
      setTimeout(() => setRequestState(prev => ({ ...prev, [wineId]: undefined })), 3000);
    }
  };

  useEffect(() => {
    fetch(`/api/guest/${token}/info`)
      .then(async res => {
        if (!res.ok) throw new Error('invalid');
        const data = await res.json();
        setHouseholdName(data.name);
        document.title = `${data.name} - Wine List`;
      })
      .catch(() => setError('유효하지 않거나 만료된 링크입니다.'));

    fetch(`/api/guest/${token}/filters`)
      .then(async res => {
        if (res.ok) setFilterOptions(await res.json());
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (error) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.wine_type) params.set('wine_type', filters.wine_type);
    if (filters.country) params.set('country', filters.country);
    if (filters.grape_variety) params.set('grape_variety', filters.grape_variety);
    if (filters.drinking_recommendation) params.set('drinking_recommendation', filters.drinking_recommendation);
    if (filters.search) params.set('search', filters.search);

    fetch(`/api/guest/${token}/wines?${params}`)
      .then(async res => {
        if (!res.ok) throw new Error('fetch failed');
        setWines(await res.json());
      })
      .catch(() => setError('와인 목록을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [token, filters, error]);

  const stats = useMemo(() => {
    const byType = {}, byCountry = {}, byGrape = {}, byRec = {};
    wines.forEach(w => {
      if (w.wine_type) byType[w.wine_type] = (byType[w.wine_type] || 0) + 1;
      if (w.country) byCountry[w.country] = (byCountry[w.country] || 0) + 1;
      if (w.grape_variety) byGrape[w.grape_variety] = (byGrape[w.grape_variety] || 0) + 1;
      if (w.drinking_recommendation) byRec[w.drinking_recommendation] = (byRec[w.drinking_recommendation] || 0) + 1;
    });
    return { byType, byCountry, byGrape, byRec };
  }, [wines]);

  const typeLabelMap = Object.fromEntries(WINE_TYPES.filter(t => t.value).map(t => [t.value, t.label]));

  const toggleFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: f[key] === value ? undefined : value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(f => ({ ...f, search: search || undefined }));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🍷</div>
          <p className="text-gray-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
        <span className="text-purple-700 font-bold text-lg">{householdName || "Maksoon's Dining"}</span>
        <span className="text-sm text-gray-400">Wine List</span>
        <button
          onClick={() => setShowChat(c => !c)}
          className="ml-auto px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm hover:bg-purple-100 transition-colors"
        >
          🤖 {showChat ? '소믈리에 닫기' : '소믈리에'}
        </button>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* 환영 안내 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <p className="text-gray-700 text-sm leading-relaxed">
            안녕하세요, <b>은미&amp;막순이네</b>에 오신 것을 환영합니다.
            <br />저희 셀러에서 잠들어 있는 와인들이 좋은 자리에서 열리길 기다리고 있어요.
            <br />부어라 마셔라, 여기선 눌러라 마셔라! 마음에 드는 와인이 있다면 망설이지 마세요 🍷
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-3 w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md"
          >
            🍷 AI 소믈리에에게 나에게 맞는 와인 추천받기
          </button>
        </div>

        <div className={showChat ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : ''}>
          <div className={showChat ? 'lg:col-span-2' : ''}>
            {/* 라벨 토글 */}
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
              <span className="ml-auto text-xs text-gray-400">{wines.length}개의 와인</span>
            </div>

            {/* 필터 바 */}
            <div className="flex flex-wrap gap-2 mb-4">
              <form onSubmit={handleSearch} className="flex gap-1">
                <input
                  type="text"
                  placeholder="검색..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-36 focus:ring-1 focus:ring-purple-400 outline-none"
                />
                <button type="submit" className="px-2 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">🔍</button>
              </form>
              <select
                value={filters.wine_type || ''}
                onChange={e => setFilters(f => ({ ...f, wine_type: e.target.value || undefined }))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              >
                {WINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {filterOptions.countries.length > 0 && (
                <select
                  value={filters.country || ''}
                  onChange={e => setFilters(f => ({ ...f, country: e.target.value || undefined }))}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">국가 전체</option>
                  {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {filterOptions.grape_varieties.length > 0 && (
                <select
                  value={filters.grape_variety || ''}
                  onChange={e => setFilters(f => ({ ...f, grape_variety: e.target.value || undefined }))}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">품종 전체</option>
                  {filterOptions.grape_varieties.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              <select
                value={filters.drinking_recommendation || ''}
                onChange={e => setFilters(f => ({ ...f, drinking_recommendation: e.target.value || undefined }))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              >
                {RECOMMENDATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button
                onClick={() => setShowStats(s => !s)}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
              >
                📊 {showStats ? '닫기' : '통계'}
              </button>
            </div>

            {/* 통계 패널 */}
            {showStats && wines.length > 0 && (
              <div className="bg-white rounded-xl border border-purple-200 p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 종류별 */}
                  {Object.keys(stats.byType).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1.5">종류별</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                          <button
                            key={type}
                            onClick={() => toggleFilter('wine_type', type)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              filters.wine_type === type
                                ? 'ring-2 ring-purple-400 ' + (TYPE_COLORS[type] || 'bg-gray-100 text-gray-600')
                                : TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {typeLabelMap[type] || type} ({count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 국가별 */}
                  {Object.keys(stats.byCountry).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1.5">국가별</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).map(([country, count]) => (
                          <button
                            key={country}
                            onClick={() => toggleFilter('country', country)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              filters.country === country
                                ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {country} ({count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 품종별 */}
                  {Object.keys(stats.byGrape).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1.5">품종별</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stats.byGrape).sort((a, b) => b[1] - a[1]).map(([grape, count]) => (
                          <button
                            key={grape}
                            onClick={() => toggleFilter('grape_variety', grape)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              filters.grape_variety === grape
                                ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {grape} ({count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 음용 추천별 */}
                  {Object.keys(stats.byRec).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1.5">음용 추천별</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stats.byRec).sort((a, b) => b[1] - a[1]).map(([rec, count]) => (
                          <button
                            key={rec}
                            onClick={() => toggleFilter('drinking_recommendation', rec)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              filters.drinking_recommendation === rec
                                ? 'ring-2 ring-purple-400 ' + (REC_BADGES[rec]?.cls || 'bg-gray-100 text-gray-500')
                                : REC_BADGES[rec]?.cls || 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {REC_BADGES[rec]?.label || rec} ({count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 와인 카드 그리드 */}
            {loading ? (
              <div className="text-center py-10 text-gray-400">로딩 중...</div>
            ) : wines.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">🍷</div>
                <p>등록된 와인이 없습니다.</p>
              </div>
            ) : (
              <div className={`grid gap-3 ${showChat ? '' : 'sm:grid-cols-2'}`}>
                {wines.map(wine => (
                  <div key={wine.id} className={`bg-white rounded-xl border p-3 hover:shadow-md transition-shadow cursor-pointer ${expandedWineId === wine.id ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'}`} onClick={() => setExpandedWineId(prev => prev === wine.id ? null : wine.id)}>
                    <div className="flex gap-3">
                      {showLabels && wine.label_image_url && (
                        <img
                          src={wine.label_image_url}
                          alt={`${wine.name} 라벨`}
                          className="w-24 h-32 shrink-0 object-cover rounded-lg bg-gray-50"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <h3 className="font-medium text-gray-900 text-sm leading-tight">{wine.name}</h3>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${TYPE_COLORS[wine.wine_type] || 'bg-gray-100 text-gray-600'}`}>
                            {wine.wine_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1.5">
                          {wine.vintage && <span>{wine.vintage} · </span>}
                          {wine.region && <span>{wine.region}</span>}
                          {wine.country && <span> · {wine.country}</span>}
                          {wine.grape_variety && <span> · {wine.grape_variety}</span>}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {wine.drinking_recommendation && REC_BADGES[wine.drinking_recommendation] && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${REC_BADGES[wine.drinking_recommendation].cls}`}>
                              {REC_BADGES[wine.drinking_recommendation].label}
                            </span>
                          )}
                          {(wine.drinking_window_start || wine.drinking_window_end) && (
                            <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
                              {wine.drinking_window_start || '?'}~{wine.drinking_window_end || '?'}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">수량: {wine.quantity}</span>
                        </div>
                        {wine.wine_description && (
                          <p className={`text-[10px] text-gray-500 italic ${expandedWineId === wine.id ? '' : 'line-clamp-2'}`}>{wine.wine_description}</p>
                        )}
                        {wine.recommendation_reason && (
                          <p className={`text-[10px] text-gray-400 ${expandedWineId === wine.id ? '' : 'line-clamp-2'}`}>💡 {wine.recommendation_reason}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRequest(wine.id); }}
                        disabled={requestState[wine.id] === 'loading' || requestState[wine.id] === 'done'}
                        className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          requestState[wine.id] === 'done'
                            ? 'bg-green-50 text-green-600'
                            : requestState[wine.id] === 'error'
                            ? 'bg-red-50 text-red-500'
                            : requestState[wine.id] === 'loading'
                            ? 'bg-purple-50 text-purple-400'
                            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        }`}
                      >
                        {requestState[wine.id] === 'loading' ? '막순이에게 요청 중...'
                          : requestState[wine.id] === 'done' ? '요청 완료!'
                          : requestState[wine.id] === 'error' ? '전송 실패'
                          : '🍷 마시고 싶어요'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showChat && (
            <div className="lg:col-span-1">
              <GuestSommelierChat token={token} />
            </div>
          )}
        </div>
      </main>

      {showWizard && (
        <WineRecommendationWizard
          token={token}
          onClose={() => setShowWizard(false)}
          onRequestWine={handleRequest}
        />
      )}
    </div>
  );
}
