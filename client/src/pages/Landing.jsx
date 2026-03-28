import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-rose-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🍷</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Maksoon's Dining</h1>
        <p className="text-gray-600 mb-8">우리집 와인 셀러 & 다이닝 관리</p>

        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            로그인
          </Link>
          <Link
            to="/signup"
            className="block w-full py-3 px-4 bg-white text-purple-700 border border-purple-200 rounded-xl font-medium hover:bg-purple-50 transition-colors"
          >
            회원가입
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">📸</div>
            <p className="text-xs text-gray-500">라벨/영수증<br/>스캔</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🤖</div>
            <p className="text-xs text-gray-500">AI 소믈리에<br/>추천</p>
          </div>
          <div>
            <div className="text-2xl mb-1">📖</div>
            <p className="text-xs text-gray-500">와인<br/>다이어리</p>
          </div>
        </div>
      </div>
    </div>
  );
}
