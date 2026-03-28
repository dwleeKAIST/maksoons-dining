import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function HouseholdSetup() {
  const { refreshProfile, logout } = useAuth();
  const [name, setName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [mode, setMode] = useState('create'); // create or join
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/household', { name: name.trim() });
      if (res.ok) {
        await refreshProfile();
      } else {
        const data = await res.json();
        setError(data.error || '생성 실패');
      }
    } catch {
      setError('서버 오류');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/invite/accept', { token: inviteToken.trim() });
      if (res.ok) {
        await refreshProfile();
      } else {
        const data = await res.json();
        setError(data.error || '참여 실패');
      }
    } catch {
      setError('서버 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <span className="text-4xl">🏠</span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">가정 설정</h1>
          <p className="text-sm text-gray-500 mt-1">와인 컬렉션을 공유할 가정을 만들거나 참여하세요.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'create' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            새로 만들기
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'join' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            초대 코드로 참여
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              placeholder="가정 이름 (예: Maksoon's Home)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '생성 중...' : '가정 만들기'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              placeholder="초대 토큰 입력"
              value={inviteToken}
              onChange={e => setInviteToken(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '참여 중...' : '가정 참여'}
            </button>
          </form>
        )}

        <button
          onClick={logout}
          className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
