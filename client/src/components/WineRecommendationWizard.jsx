import { useState } from 'react';

const STEPS = [
  { title: '상황', emoji: '🎉' },
  { title: '음식', emoji: '🍽️' },
  { title: '맛 취향', emoji: '👅' },
  { title: '경험', emoji: '🍷' },
  { title: '기억에 남는 와인', emoji: '⭐' },
  { title: '예산/기타', emoji: '💰' },
];

const OCCASION_OPTIONS = [
  '편하게 집에서 혼술/반주',
  '친구/지인과 함께',
  '기념일/특별한 날',
  '선물용으로 찾고 있어요',
  '음식과 함께 (페어링)',
  '그냥 궁금해서!',
];

const FOOD_OPTIONS = [
  '고기 (스테이크, 갈비 등)',
  '해산물/생선',
  '파스타/피자',
  '한식 (찌개, 구이 등)',
  '치즈/안주',
  '디저트/과일',
  '아직 안 정했어요',
];

const TASTE_OPTIONS = [
  '가볍고 상큼한',
  '달콤한',
  '부드럽고 편안한',
  '묵직하고 진한',
  '드라이한',
  '잘 모르겠어요',
];

const EXPERIENCE_OPTIONS = [
  '거의 안 마셔봤어요 (초보)',
  '가끔 마셔요',
  '자주 마시는 편이에요',
  '와인 좀 아는 편이에요',
];

const BUDGET_OPTIONS = [
  '가성비 좋은 (3만원 이하)',
  '적당한 가격 (3~7만원)',
  '특별한 날 (7만원 이상)',
  '상관없어요',
];

function StarRating({ rating, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function OptionButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm transition-all ${
        selected
          ? 'bg-purple-600 text-white shadow-sm'
          : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-600'
      }`}
    >
      {children}
    </button>
  );
}

export default function WineRecommendationWizard({ token, onClose, onRequestWine }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    occasion: '',
    food: [],
    foodExtra: '',
    taste: [],
    experience: '',
    memorableWine: '',
    ratedWines: [{ name: '', rating: 0 }],
    budget: [],
    additionalNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const toggleArrayItem = (key, item) => {
    setAnswers(prev => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item],
    }));
  };

  const addRatedWine = () => {
    if (answers.ratedWines.length < 5) {
      setAnswers(prev => ({
        ...prev,
        ratedWines: [...prev.ratedWines, { name: '', rating: 0 }],
      }));
    }
  };

  const removeRatedWine = (idx) => {
    setAnswers(prev => ({
      ...prev,
      ratedWines: prev.ratedWines.filter((_, i) => i !== idx),
    }));
  };

  const updateRatedWine = (idx, field, value) => {
    setAnswers(prev => ({
      ...prev,
      ratedWines: prev.ratedWines.map((w, i) => i === idx ? { ...w, [field]: value } : w),
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!answers.occasion;
      case 1: return answers.food.length > 0;
      case 2: return answers.taste.length > 0;
      case 3: return !!answers.experience;
      case 4: return true; // optional
      case 5: return true; // optional
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const cleanedAnswers = {
        ...answers,
        ratedWines: answers.ratedWines.filter(w => w.name && w.rating > 0),
      };
      const res = await fetch(`/api/guest/${token}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: cleanedAnswers }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '추천 요청에 실패했습니다.');
      }
      const data = await res.json();
      setResult(data.recommendation);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">오늘은 어떤 자리인가요?</h3>
            <p className="text-xs text-gray-500 mb-4">와인을 마실 상황을 알려주시면 더 잘 추천해드릴 수 있어요.</p>
            <div className="flex flex-wrap gap-2">
              {OCCASION_OPTIONS.map(opt => (
                <OptionButton key={opt} selected={answers.occasion === opt} onClick={() => setAnswers(prev => ({ ...prev, occasion: opt }))}>
                  {opt}
                </OptionButton>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">어떤 음식과 함께 드실 예정인가요?</h3>
            <p className="text-xs text-gray-500 mb-4">여러 개를 선택할 수 있어요.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {FOOD_OPTIONS.map(opt => (
                <OptionButton key={opt} selected={answers.food.includes(opt)} onClick={() => toggleArrayItem('food', opt)}>
                  {opt}
                </OptionButton>
              ))}
            </div>
            <input
              type="text"
              value={answers.foodExtra}
              onChange={e => setAnswers(prev => ({ ...prev, foodExtra: e.target.value }))}
              placeholder="다른 음식이 있다면 적어주세요 (선택)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>
        );

      case 2:
        return (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">어떤 맛을 좋아하세요?</h3>
            <p className="text-xs text-gray-500 mb-4">여러 개를 선택할 수 있어요. 잘 모르겠으면 "잘 모르겠어요"를 선택해주세요.</p>
            <div className="flex flex-wrap gap-2">
              {TASTE_OPTIONS.map(opt => (
                <OptionButton key={opt} selected={answers.taste.includes(opt)} onClick={() => toggleArrayItem('taste', opt)}>
                  {opt}
                </OptionButton>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">와인을 얼마나 드셔보셨나요?</h3>
            <p className="text-xs text-gray-500 mb-4">경험에 맞춰 추천 난이도를 조절할게요.</p>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map(opt => (
                <OptionButton key={opt} selected={answers.experience === opt} onClick={() => setAnswers(prev => ({ ...prev, experience: opt }))}>
                  {opt}
                </OptionButton>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">맛있게 먹었던 와인이 있나요?</h3>
            <p className="text-xs text-gray-500 mb-4">처음 또는 마지막에 기억에 남는 와인이 있다면 알려주세요. 취향 파악에 큰 도움이 돼요!</p>
            <textarea
              value={answers.memorableWine}
              onChange={e => setAnswers(prev => ({ ...prev, memorableWine: e.target.value }))}
              placeholder="예: 편의점에서 먹은 달달한 모스카토가 맛있었어요"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-1 focus:ring-purple-400 outline-none mb-4"
            />
            <h4 className="text-sm font-medium text-gray-700 mb-2">마셔본 와인과 별점을 알려주세요 (선택)</h4>
            <div className="space-y-2">
              {answers.ratedWines.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={w.name}
                    onChange={e => updateRatedWine(idx, 'name', e.target.value)}
                    placeholder="와인 이름"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-purple-400 outline-none"
                  />
                  <StarRating rating={w.rating} onChange={val => updateRatedWine(idx, 'rating', val)} />
                  {answers.ratedWines.length > 1 && (
                    <button type="button" onClick={() => removeRatedWine(idx)} className="text-gray-400 hover:text-red-400 text-sm">✕</button>
                  )}
                </div>
              ))}
            </div>
            {answers.ratedWines.length < 5 && (
              <button type="button" onClick={addRatedWine} className="mt-2 text-xs text-purple-600 hover:text-purple-700">
                + 와인 추가
              </button>
            )}
          </div>
        );

      case 5:
        return (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">예산이나 추가 요청이 있나요?</h3>
            <p className="text-xs text-gray-500 mb-4">여러 개를 선택할 수 있어요.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {BUDGET_OPTIONS.map(opt => (
                <OptionButton key={opt} selected={answers.budget.includes(opt)} onClick={() => toggleArrayItem('budget', opt)}>
                  {opt}
                </OptionButton>
              ))}
            </div>
            <textarea
              value={answers.additionalNotes}
              onChange={e => setAnswers(prev => ({ ...prev, additionalNotes: e.target.value }))}
              placeholder="추가로 원하는 게 있다면 자유롭게 적어주세요 (선택)"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-1 focus:ring-purple-400 outline-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="space-y-5">
        <div className="text-center">
          <span className="text-3xl">🍷</span>
          <h3 className="text-lg font-bold text-gray-800 mt-1">AI 소믈리에 추천 결과</h3>
        </div>

        {/* 셀러 매칭 */}
        {result.cellarMatches && result.cellarMatches.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-purple-700 mb-2">우리집 셀러에서 찾은 와인</h4>
            <div className="space-y-2">
              {result.cellarMatches.map((wine, i) => (
                <div key={i} className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-800">{wine.wineName}</span>
                    <span className="shrink-0 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      {wine.matchScore}%
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-1.5 mb-2">
                    <div className="bg-purple-600 h-1.5 rounded-full transition-all" style={{ width: `${wine.matchScore}%` }} />
                  </div>
                  <p className="text-xs text-gray-600">{wine.reason}</p>
                  {onRequestWine && (
                    <button
                      onClick={() => onRequestWine(wine.wineId)}
                      className="mt-2 w-full py-1.5 bg-purple-100 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                    >
                      마시고 싶어요
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 셀러에 없는 경우 안내 */}
        {(!result.cellarMatches || result.cellarMatches.length === 0) && (
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">셀러에서 딱 맞는 와인을 찾지 못했어요.</p>
            <p className="text-xs text-gray-400 mt-1">대신 아래 추천 와인을 확인해보세요!</p>
          </div>
        )}

        {/* 외부 추천 - 엔트리 */}
        {result.externalRecommendations?.entryLevel?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-700 mb-2">부담 없이 시도해볼 와인</h4>
            <div className="space-y-2">
              {result.externalRecommendations.entryLevel.map((wine, i) => (
                <div key={i} className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-800">{wine.name}</span>
                    <span className="shrink-0 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{wine.approximatePrice}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{wine.whyRecommended}</p>
                  <p className="text-xs text-gray-500">구매: {wine.whereToBuy}</p>
                  {wine.searchUrl && (
                    <a href={wine.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-xs text-blue-600 hover:text-blue-700 underline">
                      와인 검색하기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 외부 추천 - 프리미엄 */}
        {result.externalRecommendations?.premium?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-700 mb-2">특별한 경험을 위한 와인</h4>
            <div className="space-y-2">
              {result.externalRecommendations.premium.map((wine, i) => (
                <div key={i} className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-800">{wine.name}</span>
                    <span className="shrink-0 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{wine.approximatePrice}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{wine.whyRecommended}</p>
                  <p className="text-xs text-gray-500">구매: {wine.whereToBuy}</p>
                  {wine.searchUrl && (
                    <a href={wine.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-xs text-blue-600 hover:text-blue-700 underline">
                      와인 검색하기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 소믈리에 노트 */}
        {result.sommelierNote && (
          <div className="bg-white border border-purple-200 rounded-lg p-3 text-center">
            <span className="text-sm">🤵</span>
            <p className="text-sm text-gray-700 mt-1 italic">{result.sommelierNote}</p>
          </div>
        )}

        <button
          onClick={() => { setResult(null); setStep(0); setAnswers({ occasion: '', food: [], foodExtra: '', taste: [], experience: '', memorableWine: '', ratedWines: [{ name: '', rating: 0 }], budget: [], additionalNotes: '' }); }}
          className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          다시 추천받기
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍷</span>
            <span className="font-semibold text-gray-800 text-sm">AI 소믈리에 추천</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-purple-600">
                <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">소믈리에가 취향을 분석하고 있어요...</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">잠시만 기다려주세요</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm mb-3">{error}</p>
              <button
                onClick={() => { setError(null); handleSubmit(); }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : result ? (
            renderResult()
          ) : (
            <>
              {/* 프로그레스 바 */}
              <div className="flex items-center gap-1 mb-5">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className={`w-full h-1.5 rounded-full ${i <= step ? 'bg-purple-600' : 'bg-gray-200'} transition-colors`} />
                    <span className={`text-[10px] mt-1 ${i === step ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>
                      {s.emoji}
                    </span>
                  </div>
                ))}
              </div>

              {/* 현재 단계 */}
              {renderStep()}

              {/* 네비게이션 */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setStep(s => s - 1)}
                  disabled={step === 0}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
                >
                  이전
                </button>

                <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>

                {step < STEPS.length - 1 ? (
                  <div className="flex gap-2">
                    {(step === 4 || step === 5) && (
                      <button
                        onClick={() => setStep(s => s + 1)}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        건너뛰기
                      </button>
                    )}
                    <button
                      onClick={() => setStep(s => s + 1)}
                      disabled={!canProceed()}
                      className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      다음
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm"
                  >
                    AI 소믈리에에게 추천받기
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
