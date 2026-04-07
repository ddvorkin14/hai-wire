import { useState, useEffect } from 'react';
import { GetAllConfig, GetOwnedCategories, StartMonitoring } from '../../../wailsjs/go/main/App';

interface Props { onBack: () => void; onComplete: () => void; }

export function StepReview({ onBack, onComplete }: Props) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    GetAllConfig().then(setConfig);
    GetOwnedCategories().then(setCategories);
  }, []);

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      await StartMonitoring();
      onComplete();
    } catch (e: any) {
      setError(e?.message || 'Failed to start monitoring');
      setStarting(false);
    }
  };

  const threshold = Math.round(parseFloat(config.confidence_threshold || '0.5') * 100);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Review & Start</h2>
      <div className="space-y-3 text-sm mb-6">
        <div className="flex justify-between py-1 border-b border-slate-700">
          <span className="text-slate-400">Squad</span>
          <span>{config.squad_name}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-700">
          <span className="text-slate-400">Ping Group</span>
          <span>{config.ping_group}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-700">
          <span className="text-slate-400">Confidence</span>
          <span>{threshold}%</span>
        </div>
        <div className="py-1 border-b border-slate-700">
          <span className="text-slate-400">Categories ({Object.keys(categories).length})</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.values(categories).map((name) => (
              <span key={name} className="bg-slate-700 text-xs px-2 py-0.5 rounded">{name}</span>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
        <button onClick={handleStart} disabled={starting}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded">
          {starting ? 'Starting...' : 'Start Monitoring'}
        </button>
      </div>
    </div>
  );
}
