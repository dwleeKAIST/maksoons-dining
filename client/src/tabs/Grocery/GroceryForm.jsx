import { useState } from 'react';

const CATEGORIES = ['채소', '과일', '육류', '수산물', '유제품', '음료', '냉동식품', '양념/조미료', '과자/간식', '곡류', '가공식품', '기타'];

export default function GroceryForm({ grocery, onSave, onClose }) {
  const isEdit = !!grocery?.id;
  const [form, setForm] = useState({
    name: grocery?.name || '',
    category: grocery?.category || '',
    quantity: grocery?.quantity ?? '',
    unit: grocery?.unit || '',
    purchase_date: grocery?.purchase_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    expiry_date: grocery?.expiry_date?.split('T')[0] || '',
    memo: grocery?.memo || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      ...form,
      quantity: form.quantity !== '' ? Number(form.quantity) : null,
      purchase_date: form.purchase_date || null,
      expiry_date: form.expiry_date || null,
      category: form.category || null,
      unit: form.unit || null,
      memo: form.memo || null,
    };
    await onSave(data);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">{isEdit ? '식재료 수정' : '식재료 추가'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="예: 양파, 우유, 닭가슴살"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
              <select
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">선택</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수량</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="수량"
                />
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="단위"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">구매일</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유통기한</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <input
              type="text"
              value={form.memo}
              onChange={(e) => handleChange('memo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="보관 방법, 용도 등"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || saving}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
