import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { api } from '../../utils/api';

const MAX_SIZE = 8 * 1024 * 1024;
const CATEGORIES = ['채소', '과일', '육류', '수산물', '유제품', '음료', '냉동식품', '양념/조미료', '과자/간식', '곡류', '가공식품', '기타'];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function GroceryScanner({ onResult, onClose }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const cameraRef = useRef();
  const galleryRef = useRef();
  const imgRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) { setError('이미지 크기는 8MB 이하여야 합니다.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result); setPreview(reader.result); };
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
    ctx.drawImage(img, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, canvas.width, canvas.height);
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImage(croppedDataUrl);
    setPreview(croppedDataUrl);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [completedCrop]);

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/ocr/scan-grocery', { image });
      if (res.ok) {
        const data = await res.json();
        if (data.items?.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const enriched = data.items.map((item, idx) => ({
            ...item,
            _id: idx,
            purchase_date: today,
            expiry_date: item.expiry_days ? addDays(today, item.expiry_days) : '',
          }));
          setItems(enriched);
          const sel = {};
          enriched.forEach(item => { sel[item._id] = true; });
          setSelected(sel);
        } else {
          setError('식재료 항목을 인식하지 못했습니다. 다른 사진을 시도해보세요.');
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

  const toggleSelect = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleAll = () => {
    const allSelected = items.every(i => selected[i._id]);
    const sel = {};
    items.forEach(i => { sel[i._id] = !allSelected; });
    setSelected(sel);
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => item._id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item._id !== id));
    setSelected(prev => { const s = { ...prev }; delete s[id]; return s; });
  };

  const handleRegister = async () => {
    const selectedItems = items.filter(i => selected[i._id]).map(({ _id, expiry_days, price, ...rest }) => rest);
    if (selectedItems.length === 0) return;
    setSaving(true);
    try {
      const res = await api.post('/api/groceries', { items: selectedItems });
      if (res.ok) {
        const data = await res.json();
        onResult(data);
      } else {
        const data = await res.json();
        setError(data.error || '등록 실패');
      }
    } catch {
      setError('서버 오류');
    }
    setSaving(false);
  };

  const selectedCount = items ? items.filter(i => selected[i._id]).length : 0;

  // Phase 1: Image capture
  if (!items) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="font-bold text-lg mb-2">영수증 스캔</h3>
          <p className="text-sm text-gray-500 mb-4">마트/편의점 영수증을 촬영하면 AI가 식재료를 자동으로 인식합니다.</p>

          {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}

          {preview ? (
            <div className="mb-4">
              {isCropping ? (
                <>
                  <ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop}>
                    <img ref={imgRef} src={preview} alt="크롭" className="w-full rounded-lg max-h-64 object-contain" />
                  </ReactCrop>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setIsCropping(false); setCrop(undefined); setCompletedCrop(undefined); }} className="flex-1 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">취소</button>
                    <button onClick={handleCropConfirm} disabled={!completedCrop?.width} className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">자르기 완료</button>
                  </div>
                </>
              ) : (
                <>
                  <img src={preview} alt="영수증" className="w-full rounded-lg border max-h-64 object-contain" />
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => { setImage(null); setPreview(null); }} className="text-xs text-gray-400 hover:text-gray-600">다시 선택</button>
                    <button onClick={() => setIsCropping(true)} className="text-xs text-green-600 hover:text-green-700">영역 자르기</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mb-4 flex gap-2">
              <button onClick={() => cameraRef.current?.click()} className="flex-1 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors">
                <span className="text-2xl block mb-1">📷</span>
                <span className="text-sm">카메라로 촬영</span>
              </button>
              <button onClick={() => galleryRef.current?.click()} className="flex-1 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors">
                <span className="text-2xl block mb-1">🖼️</span>
                <span className="text-sm">갤러리에서 선택</span>
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              <input ref={galleryRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
          )}

          {!isCropping && (
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={handleScan} disabled={!image || loading} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {loading ? '스캔 중...' : '스캔 시작'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase 2: Review & edit scanned items
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">스캔 결과 ({items.length}개)</h3>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={items.length > 0 && items.every(i => selected[i._id])} onChange={toggleAll} className="rounded" />
            전체 선택
          </label>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}

        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div key={item._id} className={`border rounded-lg p-3 transition-colors ${selected[item._id] ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={!!selected[item._id]} onChange={() => toggleSelect(item._id)} className="mt-1 rounded" />
                <div className="flex-1 min-w-0">
                  {/* 이름 */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item._id, 'name', e.target.value)}
                    className="w-full font-medium text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 focus:outline-none px-0 py-0.5"
                  />
                  {/* 카테고리 + 수량 + 단위 */}
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <select
                      value={item.category || ''}
                      onChange={(e) => updateItem(item._id, 'category', e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                    >
                      <option value="">카테고리</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.quantity ?? ''}
                        onChange={(e) => updateItem(item._id, 'quantity', e.target.value ? Number(e.target.value) : null)}
                        className="w-14 text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                        placeholder="수량"
                      />
                      <input
                        type="text"
                        value={item.unit || ''}
                        onChange={(e) => updateItem(item._id, 'unit', e.target.value)}
                        className="w-12 text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                        placeholder="단위"
                      />
                    </div>
                    {item.price && (
                      <span className="text-xs text-gray-400 self-center">{Number(item.price).toLocaleString()}원</span>
                    )}
                  </div>
                  {/* 유통기한 */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">유통기한:</span>
                    <input
                      type="date"
                      value={item.expiry_date || ''}
                      onChange={(e) => updateItem(item._id, 'expiry_date', e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                    />
                  </div>
                </div>
                <button onClick={() => removeItem(item._id)} className="text-gray-400 hover:text-red-500 text-lg leading-none p-1" title="제거">&times;</button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">모든 항목이 제거되었습니다.</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button
            onClick={() => { setItems(null); setImage(null); setPreview(null); setIsCropping(false); setCrop(undefined); setCompletedCrop(undefined); setError(''); }}
            className="py-2 px-3 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
          >
            다시 스캔
          </button>
          <button
            onClick={handleRegister}
            disabled={selectedCount === 0 || saving}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? '등록 중...' : `${selectedCount}개 등록`}
          </button>
        </div>
      </div>
    </div>
  );
}
