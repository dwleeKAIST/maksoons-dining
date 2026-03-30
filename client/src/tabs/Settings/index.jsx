import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { buildDrinkingWindowPrompt, parseDrinkingWindowResponse, formatRecommendationReason } from '../../utils/drinkingWindow';

export default function Settings() {
  const { profile, settings, household, updateProfile, updateSettings, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [telegramToken, setTelegramToken] = useState(settings?.telegram_bot_token || '');
  const [telegramChatId, setTelegramChatId] = useState(settings?.telegram_chat_id || '');
  const [telegramEnabled, setTelegramEnabled] = useState(settings?.telegram_enabled || false);
  const [botMaxCost, setBotMaxCost] = useState(settings?.bot_max_cost_krw || 10000);
  const [ctUser, setCtUser] = useState(settings?.cellartracker_user || '');
  const [ctPassword, setCtPassword] = useState(settings?.cellartracker_password || '');
  const [ctTestResult, setCtTestResult] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Re-analyze all
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState({ current: 0, total: 0 });
  const [reanalyzeResult, setReanalyzeResult] = useState(null);

  // Household members
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState('');

  // Guest link
  const [guestToken, setGuestToken] = useState(null);
  const [guestExpiresAt, setGuestExpiresAt] = useState(null);
  const [guestLinkLoading, setGuestLinkLoading] = useState(false);
  const [guestCopied, setGuestCopied] = useState(false);

  useEffect(() => {
    if (household) {
      api.get('/api/auth/household/members').then(async res => {
        if (res.ok) setMembers(await res.json());
      });
      api.get('/api/auth/household/guest-link').then(async res => {
        if (res.ok) {
          const data = await res.json();
          setGuestToken(data.token);
          setGuestExpiresAt(data.expires_at);
        }
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
      cellartracker_user: ctUser || null,
      cellartracker_password: ctPassword || null,
    });
    setMessage('설정이 저장되었습니다.');
    setSaving(false);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleCtTest = async () => {
    setCtTestResult('연결 중...');
    try {
      const res = await api.post('/api/bot/cellartracker-sync');
      if (res.ok) {
        const data = await res.json();
        setCtTestResult(`연결 성공! 음용 적기 데이터가 있는 와인 ${data.count}개 발견`);
      } else {
        const data = await res.json().catch(() => ({}));
        setCtTestResult(data.error || '연결 실패');
      }
    } catch {
      setCtTestResult('연결 중 오류가 발생했습니다.');
    }
    setTimeout(() => setCtTestResult(''), 5000);
  };

  const handleReanalyzeAll = async () => {
    const confirmed = window.confirm(
      '모든 미소비 와인의 음용 적기를 다시 분석합니다.\n' +
      'AI API 비용이 발생하며, 와인 수에 따라 시간이 걸릴 수 있습니다.\n\n계속하시겠습니까?'
    );
    if (!confirmed) return;

    setReanalyzing(true);
    setReanalyzeResult(null);

    let ctData = null;
    try {
      const ctRes = await api.post('/api/bot/cellartracker-sync');
      if (ctRes.ok) {
        const ctBody = await ctRes.json();
        ctData = ctBody.wines || [];
      }
    } catch {}

    let wines = [];
    try {
      const wineRes = await api.get('/api/wines?is_consumed=false');
      if (wineRes.ok) wines = await wineRes.json();
    } catch {
      setReanalyzing(false);
      setReanalyzeResult({ success: 0, failed: 0, total: 0, costLimitHit: false, error: '와인 목록을 불러올 수 없습니다.' });
      return;
    }

    setReanalyzeProgress({ current: 0, total: wines.length });
    let success = 0, failed = 0, costLimitHit = false;
    const sourceCounts = { ct_exact: 0, ct_similar: 0, ref_guided: 0, ai_estimate: 0 };

    for (let i = 0; i < wines.length; i++) {
      setReanalyzeProgress({ current: i + 1, total: wines.length });
      const wine = wines[i];
      try {
        const prompt = buildDrinkingWindowPrompt(wine, ctData);
        const res = await api.post('/api/bot/structured', { prompt });
        if (res.status === 429) {
          costLimitHit = true;
          break;
        }
        if (!res.ok) { failed++; continue; }
        const data = await res.json();
        const parsed = parseDrinkingWindowResponse(data.reply);
        if (!parsed) { failed++; continue; }

        const reason = formatRecommendationReason(parsed);
        await api.patch(`/api/wines/${wine.id}`, {
          drinking_window_start: parsed.drinking_window_start || null,
          drinking_window_end: parsed.drinking_window_end || null,
          drinking_recommendation: parsed.recommendation || null,
          recommendation_reason: reason || null,
          wine_description: parsed.description || null,
        });
        success++;
        if (parsed.source && sourceCounts[parsed.source] !== undefined) {
          sourceCounts[parsed.source]++;
        }
      } catch {
        failed++;
      }
    }

    setReanalyzing(false);
    setReanalyzeResult({ success, failed, total: wines.length, costLimitHit, sourceCounts });
  };

  const handleTelegramTest = async () => {
    const res = await api.post('/api/auth/settings/telegram-test');
    const data = await res.json();
    setMessage(data.success ? '텔레그램 테스트 성공!' : '텔레그램 테스트 실패');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleGenerateGuestLink = async () => {
    setGuestLinkLoading(true);
    const res = await api.post('/api/auth/household/guest-link');
    if (res.ok) {
      const data = await res.json();
      setGuestToken(data.token);
      setGuestExpiresAt(data.expires_at);
    }
    setGuestLinkLoading(false);
  };

  const handleRevokeGuestLink = async () => {
    setGuestLinkLoading(true);
    const res = await api.delete('/api/auth/household/guest-link');
    if (res.ok) {
      setGuestToken(null);
      setGuestExpiresAt(null);
    }
    setGuestLinkLoading(false);
  };

  const handleCopyGuestLink = () => {
    const url = `${window.location.origin}/guest/${guestToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setGuestCopied(true);
      setTimeout(() => setGuestCopied(false), 2000);
    });
  };

  const guestLinkExpired = guestExpiresAt && new Date(guestExpiresAt) < new Date();
  const guestDaysLeft = guestExpiresAt
    ? Math.max(0, Math.ceil((new Date(guestExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

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

          {/* 게스트 와인 리스트 공유 */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs text-gray-500 mb-2">🍷 게스트 와인 리스트 공유</p>
            {guestToken && !guestLinkExpired ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/guest/${guestToken}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-600 outline-none"
                  />
                  <button
                    onClick={handleCopyGuestLink}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 shrink-0"
                  >
                    {guestCopied ? '복사됨!' : '복사'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  만료까지 {guestDaysLeft}일 남음 ({new Date(guestExpiresAt).toLocaleDateString('ko-KR')})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateGuestLink}
                    disabled={guestLinkLoading}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    링크 재생성
                  </button>
                  <button
                    onClick={handleRevokeGuestLink}
                    disabled={guestLinkLoading}
                    className="px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    비활성화
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {guestLinkExpired && (
                  <p className="text-xs text-red-500">이전 링크가 만료되었습니다.</p>
                )}
                <p className="text-xs text-gray-400">게스트가 로그인 없이 와인 리스트를 볼 수 있는 링크를 생성합니다. (7일 유효)</p>
                <button
                  onClick={handleGenerateGuestLink}
                  disabled={guestLinkLoading}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 disabled:opacity-50"
                >
                  {guestLinkLoading ? '생성 중...' : '게스트 링크 생성'}
                </button>
              </div>
            )}
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

          {/* CellarTracker 연동 */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2">CellarTracker 연동 (선택)</p>
            <p className="text-xs text-gray-400 mb-2">CellarTracker 계정을 연결하면 음용 적기 분석 시 참고 데이터로 활용합니다.</p>
            <div className="space-y-2">
              <input
                type="text"
                value={ctUser}
                onChange={e => setCtUser(e.target.value)}
                placeholder="CellarTracker 사용자명"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
              <input
                type="password"
                value={ctPassword}
                onChange={e => setCtPassword(e.target.value)}
                placeholder="CellarTracker 비밀번호"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
              />
              {ctUser && ctPassword && (
                <button
                  type="button"
                  onClick={handleCtTest}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  연동 테스트
                </button>
              )}
              {ctTestResult && (
                <p className={`text-xs ${ctTestResult.includes('성공') ? 'text-green-600' : 'text-red-500'}`}>{ctTestResult}</p>
              )}
            </div>
          </div>

          {/* 전체 재분석 */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-1">전체 음용 적기 재분석</p>
            <p className="text-xs text-gray-400 mb-2">
              모든 미소비 와인의 음용 적기를 다시 분석합니다. 와인 가이드라인 데이터를 참고하며, CellarTracker 연동 시 추가 참고합니다.
            </p>
            <button
              type="button"
              onClick={handleReanalyzeAll}
              disabled={reanalyzing}
              className="w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 disabled:opacity-50"
            >
              {reanalyzing
                ? `분석 중... (${reanalyzeProgress.current}/${reanalyzeProgress.total})`
                : '전체 와인 음용 적기 재분석'}
            </button>
            {reanalyzeResult && (
              <div className={`mt-2 p-2 rounded-lg text-xs ${reanalyzeResult.costLimitHit ? 'bg-yellow-50 text-yellow-700' : reanalyzeResult.failed > 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                <p>
                  {reanalyzeResult.total}개 중 {reanalyzeResult.success}개 성공
                  {reanalyzeResult.failed > 0 && `, ${reanalyzeResult.failed}개 실패`}
                </p>
                {reanalyzeResult.sourceCounts && (
                  <p className="mt-1 text-gray-500">
                    CT 매칭: {reanalyzeResult.sourceCounts.ct_exact},
                    유사 참고: {reanalyzeResult.sourceCounts.ct_similar},
                    가이드라인 분석: {reanalyzeResult.sourceCounts.ref_guided},
                    AI 추정: {reanalyzeResult.sourceCounts.ai_estimate}
                  </p>
                )}
                {reanalyzeResult.costLimitHit && (
                  <p className="mt-1 font-medium">월간 AI 비용 한도에 도달하여 중단되었습니다.</p>
                )}
              </div>
            )}
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
