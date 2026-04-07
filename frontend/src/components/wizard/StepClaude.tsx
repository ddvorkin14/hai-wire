import { useState } from 'react';
import { SaveAnthropicKey } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; onBack: () => void; }

export function StepClaude({ onNext, onBack }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      await SaveAnthropicKey(apiKey);
      onNext();
    } catch (e: any) {
      setError(e?.message || 'Invalid API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Connect Claude</h2>
      <p className="text-slate-400 text-sm mb-4">Enter your Anthropic API key for classifying support requests.</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">API Key</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
          <button onClick={handleSave} disabled={loading || !apiKey}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
            {loading ? 'Validating...' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
