import { useState, useEffect } from 'react';
import { GetSlackStatus, ReconnectSlack } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; }

export function StepSlack({ onNext }: Props) {
  const [connected, setConnected] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const checkStatus = async () => {
    const status = await GetSlackStatus();
    setConnected(status.connected === 'true');
    if (status.team) setTeamName(status.team);
    if (status.message && status.connected !== 'true') setError(status.message);
    setLoading(false);
  };

  useEffect(() => { checkStatus(); }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setError('');
    try {
      const team = await ReconnectSlack();
      setConnected(true);
      setTeamName(team);
    } catch (e: any) {
      setError(e?.message || 'Failed to connect');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500 text-sm">Checking Slack connection...</div>;
  }

  if (connected) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Slack</h2>
        <div className="bg-green-900/30 border border-green-700 rounded p-4 mb-6">
          <p className="text-green-400">Connected to <strong>{teamName}</strong></p>
          <p className="text-green-400/60 text-xs mt-1">Using token from Claude Code</p>
        </div>
        <button onClick={onNext} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-6 py-2 rounded">
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Slack</h2>
      <div className="bg-slate-700/50 border border-slate-600 rounded p-4 mb-4">
        <p className="text-slate-300 text-sm mb-3">
          HAI-Wire uses your Claude Code Slack connection. To set it up:
        </p>
        <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
          <li>Open Claude Code in your terminal</li>
          <li>Type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">/mcp</code> and connect Slack</li>
          <li>Come back here and click Retry</li>
        </ol>
      </div>
      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}
      <button onClick={handleRetry} disabled={retrying}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
        {retrying ? 'Checking...' : 'Retry Connection'}
      </button>
    </div>
  );
}
