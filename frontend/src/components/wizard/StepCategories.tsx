import { useState, useEffect } from 'react';
import { GetAllCategories, SaveOwnedCategories, GetOwnedCategories } from '../../../wailsjs/go/main/App';
import type { Category } from '../../types';

interface Props { onNext: () => void; onBack: () => void; }

export function StepCategories({ onNext, onBack }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([GetAllCategories(), GetOwnedCategories()]).then(([cats, owned]) => {
      setCategories(cats || []);
      if (owned) setSelected(new Set(Object.keys(owned)));
    });
  }, []);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    const owned: Record<string, string> = {};
    categories.forEach((cat) => {
      if (selected.has(cat.Key)) owned[cat.Key] = cat.Name;
    });
    await SaveOwnedCategories(owned);
    onNext();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Categories</h2>
      <p className="text-slate-400 text-sm mb-4">Check the issue types your squad owns. Only these will be routed to your triage channel.</p>
      <div className="max-h-[280px] overflow-y-auto space-y-1 mb-4 pr-2">
        {categories.map((cat) => (
          <label key={cat.Key}
            className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${
              selected.has(cat.Key) ? 'bg-amber-400/10 border border-amber-400/30' : 'hover:bg-slate-700/50'
            }`}>
            <input type="checkbox" checked={selected.has(cat.Key)} onChange={() => toggle(cat.Key)} className="mt-1 accent-amber-400" />
            <div>
              <div className="text-sm font-medium">{cat.Name}</div>
              <div className="text-xs text-slate-500">{cat.Description}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
        <button onClick={handleSave} disabled={selected.size === 0}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
          Save ({selected.size} selected)
        </button>
      </div>
    </div>
  );
}
