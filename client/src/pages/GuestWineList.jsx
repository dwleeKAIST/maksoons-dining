import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { WINE_TYPES, RECOMMENDATIONS, TYPE_COLORS, REC_BADGES } from '../constants/wine';

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
            </div>

            {/* 와인 카드 그리드 */}
            {loading ? (
              <div className="text-center py-10 text-gray-400">로딩 중...</div>
            ) : wines.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">🍷</div>
                <p>등록된 와인이 없습니다.</p>
              </div>
            ) : (
              <div className={`grid gap-3 sm:grid-cols-2 ${showChat ? '' : 'lg:grid-cols-3'}`}>
                {wines.map(wine => (
                  <div key={wine.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
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
                          {wine.country && <span> · {wine.country}</span>}
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
                      {(wine.drinking_window_start || wine.drinking_window_end) && (
                        <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                          {wine.drinking_window_start || '?'}~{wine.drinking_window_end || '?'}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">수량: {wine.quantity}</span>
                    </div>

                    {wine.recommendation_reason && (
                      <p className="text-xs text-gray-400 truncate">💡 {wine.recommendation_reason}</p>
                    )}
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
    </div>
  );
}
