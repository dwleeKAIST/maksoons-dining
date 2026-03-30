import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { api } from '../../utils/api';

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

export default function WineScanner({ onResult, onClose }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [corrections, setCorrections] = useState({}); // { idx: { corrected_name, source, details } }
  const [verifying, setVerifying] = useState(false);
  const cameraRef = useRef();
  const galleryRef = useRef();
  const imgRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setError('이미지 크기는 8MB 이하여야 합니다.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;
    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement('canvas');
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0,
      canvas.width, canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImage(croppedDataUrl);
    setPreview(croppedDataUrl);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [completedCrop]);

  const handleCropCancel = () => {
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    setCorrections({});
    try {
      const res = await api.post('/api/ocr/scan-wine', { image });
      if (res.ok) {
        const data = await res.json();
        if (data.parsed_wines?.length > 0) {
          setResults(data.parsed_wines);
          if (data.image_url) {
            setImageUrl(data.image_url);
          } else if (data.image_upload_failed) {
            setError(data.image_upload_error || '와인 정보는 인식되었지만 라벨 이미지 저장에 실패했습니다.');
          }
          // 이름 교정 확인 요청
          verifyNames(data.parsed_wines);
        } else {
          setError('와인 정보를 인식하지 못했습니다. 다른 사진을 시도해보세요.');
        }
      } else {
        const data = await res.json();
        setError(data.error || '스캔 실패');
      }
    } catch {
      setError('서버 오류');
    }
    setLoading(false);
  };

  const verifyNames = async (wines) => {
    setVerifying(true);
    try {
      const res = await api.post('/api/ocr/verify-name', { wines });
      if (res.ok) {
        const data = await res.json();
        const newCorrections = {};
        (data.results || []).forEach((r, idx) => {
          if (r.corrected_name && r.corrected_name !== r.original_name) {
            newCorrections[idx] = {
              corrected_name: r.corrected_name,
              source: r.source,
              details: r.details,
            };
          }
        });
        setCorrections(newCorrections);
      }
    } catch {}
    setVerifying(false);
  };

  const handleApplyCorrection = (idx) => {
    const correction = corrections[idx];
    if (!correction || !results) return;
    const updated = [...results];
    updated[idx] = {
      ...updated[idx],
      name: correction.corrected_name,
      _originalName: updated[idx].name,
    };
    // CT 매칭인 경우 추가 정보도 채우기
    if (correction.details) {
      if (correction.details.region && !updated[idx].region) updated[idx].region = correction.details.region;
      if (correction.details.country && !updated[idx].country) updated[idx].country = correction.details.country;
      if (correction.details.varietal && !updated[idx].grape_variety) updated[idx].grape_variety = correction.details.varietal;
    }
    setResults(updated);
    // 교정 적용 후 해당 항목의 교정 제안 제거
    const newCorrections = { ...corrections };
    delete newCorrections[idx];
    setCorrections(newCorrections);
  };

  const handleDismissCorrection = (idx) => {
    const newCorrections = { ...corrections };
    delete newCorrections[idx];
    setCorrections(newCorrections);
  };

  const handleUseResult = (wine) => {
    // _originalName 등 내부 필드 제거 후 전달
    const { _originalName, original_ocr_name, corrected, confidence, ...cleanWine } = wine;
    onResult([{ ...cleanWine, label_image_url: imageUrl || null }]);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">📸 와인 스캔</h3>
        <p className="text-sm text-gray-500 mb-4">와인 라벨이나 영수증을 촬영하면 AI가 와인 정보를 자동으로 인식합니다.</p>

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}

        {!results ? (
          <>
            {preview ? (
              <div className="mb-4">
                {isCropping ? (
                  <>
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                    >
                      <img
                        ref={imgRef}
                        src={preview}
                        alt="크롭 이미지"
                        className="w-full rounded-lg max-h-64 object-contain"
                      />
                    </ReactCrop>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCropCancel}
                        className="flex-1 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleCropConfirm}
                        disabled={!completedCrop?.width || !completedCrop?.height}
                        className="flex-1 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        자르기 완료
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={preview} alt="스캔 이미지" className="w-full rounded-lg border max-h-64 object-contain" />
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => { setImage(null); setPreview(null); setIsCropping(false); setCrop(undefined); setCompletedCrop(undefined); }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        다시 선택
                      </button>
                      <button
                        onClick={() => setIsCropping(true)}
                        className="text-xs text-purple-500 hover:text-purple-700"
                      >
                        라벨 영역 자르기
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex-1 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
                >
                  <span className="text-2xl block mb-1">📷</span>
                  <span className="text-sm">카메라로 촬영</span>
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="flex-1 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
                >
                  <span className="text-2xl block mb-1">🖼️</span>
                  <span className="text-sm">갤러리에서 선택</span>
                </button>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {!isCropping && (
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  취소
                </button>
                <button
                  onClick={handleScan}
                  disabled={!image || loading}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? '스캔 중...' : '스캔 시작'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {results.map((wine, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium">{wine.name || '이름 미상'}</p>

                  {/* AI OCR 교정 표시 (OCR 프롬프트에서 교정한 경우) */}
                  {wine.corrected && wine.original_ocr_name && !wine._originalName && (
                    <p className="text-xs text-blue-500 mt-0.5">
                      AI 교정: {wine.original_ocr_name} →
                      {wine.confidence === 'low' && <span className="text-yellow-600"> (확신도 낮음)</span>}
                    </p>
                  )}

                  {/* CT/AI 추가 교정 적용 후 표시 */}
                  {wine._originalName && (
                    <p className="text-xs text-green-600 mt-0.5">
                      교정 적용됨 (원본: {wine._originalName})
                    </p>
                  )}

                  {/* 교정 제안 (CT 퍼지매칭 또는 AI에서 추가 교정 가능한 경우) */}
                  {corrections[idx] && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-xs text-blue-700 mb-1">
                        {corrections[idx].source === 'cellartracker' ? 'CellarTracker' : 'AI'} 교정 제안:
                      </p>
                      <p className="text-sm font-medium text-blue-800">
                        → {corrections[idx].corrected_name}
                      </p>
                      {corrections[idx].details && (
                        <p className="text-xs text-blue-500 mt-0.5">
                          {[corrections[idx].details.region, corrections[idx].details.varietal].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApplyCorrection(idx)}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          교정 적용
                        </button>
                        <button
                          onClick={() => handleDismissCorrection(idx)}
                          className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                        >
                          원본 유지
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                    {wine.vintage && <p>빈티지: {wine.vintage}</p>}
                    {wine.region && <p>산지: {wine.region}</p>}
                    {wine.country && <p>국가: {wine.country}</p>}
                    {wine.grape_variety && <p>품종: {wine.grape_variety}</p>}
                    {wine.wine_type && <p>타입: {wine.wine_type}</p>}
                    {wine.purchase_price && <p>가격: {Number(wine.purchase_price).toLocaleString()}원</p>}
                  </div>
                  <button
                    onClick={() => handleUseResult(wine)}
                    disabled={verifying}
                    className="mt-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 disabled:opacity-50"
                  >
                    {verifying ? '이름 확인 중...' : '이 정보로 추가'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                닫기
              </button>
              <button
                onClick={() => { setResults(null); setImage(null); setPreview(null); setIsCropping(false); setCrop(undefined); setCompletedCrop(undefined); setCorrections({}); }}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                다시 스캔
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
