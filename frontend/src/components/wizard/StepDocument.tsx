import { useState, useEffect } from 'react';
import { AnalyzeDocument, SaveCustomCategories, GetAllCategories, HasCustomCategories, ResetToDefaultCategories } from '../../../wailsjs/go/main/App';
import type { Category } from '../../types';

interface Props { onNext: () => void; onBack: () => void; }

interface ExtractedCat {
  key: string;
  name: string;
  description: string;
}

export function StepDocument({ onNext, onBack }: Props) {
  const [docText, setDocText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedCat[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [currentCats, setCurrentCats] = useState<Category[]>([]);
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    GetAllCategories().then((cats) => setCurrentCats(cats || []));
    HasCustomCategories().then(setHasCustom);
  }, []);

  const handleAnalyze = async () => {
    if (!docText.trim()) return;
    setAnalyzing(true);
    setError('');
    setExtracted([]);
    try {
      const cats = await AnalyzeDocument(docText);
      setExtracted(cats || []);
      setSelected(new Set((cats || []).map((_: ExtractedCat, i: number) => i)));
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze document');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCat = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    const cats = extracted
      .filter((_, i) => selected.has(i))
      .map(c => ({ key: c.key, name: c.name, description: c.description }));
    await SaveCustomCategories(cats);
    onNext();
  };

  const handleReset = async () => {
    await ResetToDefaultCategories();
    const cats = await GetAllCategories();
    setCurrentCats(cats || []);
    setHasCustom(false);
    setExtracted([]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDocText(reader.result as string);
    reader.readAsText(file);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Categories</h2>
      <p className="text-slate-400 text-sm mb-4">
        Upload a runbook or paste documentation. Claude will extract support categories from it.
      </p>

      {/* Current categories info */}
      <div className="bg-slate-700/50 border border-slate-600 rounded p-3 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Currently using <strong className="text-slate-300">{currentCats.length} categories</strong>
            {hasCustom ? ' (custom)' : ' (built-in defaults)'}
          </p>
          {hasCustom && (
            <button onClick={handleReset} className="text-xs text-red-400 hover:text-red-300 underline">
              Reset to defaults
            </button>
          )}
        </div>
      </div>

      {/* Document input */}
      {extracted.length === 0 && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Upload a file</label>
            <input type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={handleFile}
              className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600" />
          </div>
          <div className="text-center text-xs text-slate-600">or paste text below</div>
          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            placeholder="Paste your runbook, support documentation, or category descriptions here..."
            rows={8}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400 placeholder-slate-600 resize-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
            <button onClick={handleAnalyze} disabled={analyzing || !docText.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
              {analyzing ? 'Analyzing with Claude...' : 'Extract Categories'}
            </button>
          </div>
        </div>
      )}

      {/* Extracted categories review */}
      {extracted.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Claude extracted <strong>{extracted.length}</strong> categories. Uncheck any you don't want.
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
            {extracted.map((cat, i) => (
              <label key={i}
                className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${
                  selected.has(i) ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-slate-700/30 opacity-50'
                }`}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggleCat(i)} className="mt-1 accent-amber-400" />
                <div>
                  <div className="text-sm font-medium">{cat.name}</div>
                  <div className="text-xs text-slate-500">{cat.description}</div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">{cat.key}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setExtracted([])} className="text-slate-400 hover:text-white px-4 py-2 text-sm">
              Re-analyze
            </button>
            <button onClick={handleSave} disabled={selected.size === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded">
              Save {selected.size} Categories
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
