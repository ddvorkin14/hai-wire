import { useState, useEffect } from 'react';
import { SaveAnthropicKey, GetAllConfig } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; onBack: () => void; }

export function StepClaude({ onNext, onBack }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    GetAllConfig().then((config) => {
      if (config.anthropic_key) {
        setApiKey(config.anthropic_key);
        setHasSaved(true);
      }
    });
  }, []);

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      await SaveAnthropicKey(apiKey.trim());
      onNext();
    } catch (e: any) {
      setError(e?.message || 'Failed to save key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Claude API Key</h2>
      <p className="text-slate-400 text-sm mb-4">Used to classify support requests. Get one at{' '}
        <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300">console.anthropic.com</a>.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">API Key</label>
          <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setHasSaved(false); }} placeholder="sk-ant-..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          {hasSaved && <p className="text-xs text-green-400 mt-1">Key saved.</p>}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
          <button onClick={handleSave} disabled={loading || !apiKey.trim()}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
