import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/auth/invite/${token}`);
        if (res.ok) {
          setInfo(await res.json());
        } else {
          setError('유효하지 않거나 만료된 초대입니다.');
        }
      } catch {
        setError('서버 오류');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await api.post('/api/auth/invite/accept', { token });
      if (res.ok) {
        await refreshProfile();
        navigate('/');
      } else {
        const data = await res.json();
        setError(data.error || '초대 수락 실패');
      }
    } catch {
      setError('서버 오류');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">로딩 중...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        {error ? (
          <>
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="text-purple-600 hover:underline text-sm">홈으로 돌아가기</button>
          </>
        ) : (
          <>
            <span className="text-4xl">🏠</span>
            <h1 className="text-xl font-bold mt-2 mb-1">가정 초대</h1>
            <p className="text-gray-600 mb-6">
              <strong>{info?.household_name}</strong>에 초대되었습니다.
            </p>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {accepting ? '참여 중...' : '초대 수락'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
