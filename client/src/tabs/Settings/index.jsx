import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

export default function Settings() {
  const { profile, settings, household, updateProfile, updateSettings, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [telegramToken, setTelegramToken] = useState(settings?.telegram_bot_token || '');
  const [telegramChatId, setTelegramChatId] = useState(settings?.telegram_chat_id || '');
  const [telegramEnabled, setTelegramEnabled] = useState(settings?.telegram_enabled || false);
  const [botMaxCost, setBotMaxCost] = useState(settings?.bot_max_cost_krw || 10000);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Household members
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState('');

  useEffect(() => {
    if (household) {
      api.get('/api/auth/household/members').then(async res => {
        if (res.ok) setMembers(await res.json());
      });
    }
  }, [household]);

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ name });
    setMessage('프로필이 저장되었습니다.');
    setSaving(false);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    await updateSettings({
      telegram_bot_token: telegramToken || null,
      telegram_chat_id: telegramChatId || null,
      telegram_enabled: telegramEnabled,
      bot_max_cost_krw: botMaxCost,
    });
    setMessage('설정이 저장되었습니다.');
    setSaving(false);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleTelegramTest = async () => {
    const res = await api.post('/api/auth/settings/telegram-test');
    const data = await res.json();
    setMessage(data.success ? '텔레그램 테스트 성공!' : '텔레그램 테스트 실패');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const res = await api.post('/api/auth/household/invite', { email: inviteEmail.trim() });
    if (res.ok) {
      const data = await res.json();
      setInviteResult(`초대 토큰: ${data.token}`);
      setInviteEmail('');
    } else {
      const data = await res.json();
      setInviteResult(data.error || '초대 실패');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">{message}</div>
      )}

      {/* 프로필 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-sm text-gray-700 mb-3">프로필</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">이메일</label>
            <p className="text-sm text-gray-700">{profile?.email}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>
          <button onClick={handleSaveProfile} disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
            저장
          </button>
        </div>
      </section>

      {/* 가정 관리 */}
      {household && (
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-sm text-gray-700 mb-3">🏠 가정: {household.name}</h3>

          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">멤버</p>
            <div className="space-y-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700">{m.name}</span>
                  <span className="text-xs text-gray-400">{m.email}</span>
                  {m.role === 'owner' && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">주인</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2">가족 초대</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="이메일 주소"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
              <button onClick={handleInvite} className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                초대
              </button>
            </div>
            {inviteResult && <p className="text-xs text-gray-500 mt-2 break-all">{inviteResult}</p>}
          </div>
        </section>
      )}

      {/* AI 비용 설정 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-sm text-gray-700 mb-3">🤖 AI 소믈리에 설정</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">월간 최대 비용 (원)</label>
            <input
              type="number"
              value={botMaxCost}
              onChange={e => setBotMaxCost(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>
        </div>
      </section>

      {/* 텔레그램 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-sm text-gray-700 mb-3">📱 텔레그램 알림</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={telegramEnabled}
              onChange={e => setTelegramEnabled(e.target.checked)}
            />
            텔레그램 알림 활성화
          </label>
          <div>
            <label className="text-xs text-gray-500">Bot Token</label>
            <input
              type="text"
              value={telegramToken}
              onChange={e => setTelegramToken(e.target.value)}
              placeholder="BotFather에서 받은 토큰"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Chat ID</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={e => setTelegramChatId(e.target.value)}
              placeholder="채팅 ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveSettings} disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
              설정 저장
            </button>
            {telegramEnabled && telegramToken && telegramChatId && (
              <button onClick={handleTelegramTest}
                className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm hover:bg-blue-100">
                테스트 전송
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
