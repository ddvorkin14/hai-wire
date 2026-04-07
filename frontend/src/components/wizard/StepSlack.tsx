import { useState } from 'react';
import { SaveSlackToken } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; }

export function StepSlack({ onNext }: Props) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      const team = await SaveSlackToken(token);
      setTeamName(team);
    } catch (e: any) {
      setError(e?.message || 'Invalid token. Make sure it starts with xoxb- or xoxp-.');
    } finally {
      setLoading(false);
    }
  };

  if (teamName) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Connect Slack</h2>
        <div className="bg-green-900/30 border border-green-700 rounded p-4 mb-6">
          <p className="text-green-400">Connected to <strong>{teamName}</strong></p>
        </div>
        <button onClick={onNext} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-6 py-2 rounded">
          Next
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Connect Slack</h2>
      <p className="text-slate-400 text-sm mb-4">
        Paste your Slack token below. This can be a bot token (<code className="text-amber-400/70">xoxb-</code>) or a user token (<code className="text-amber-400/70">xoxp-</code>).
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Slack Token</label>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="xoxb-... or xoxp-..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div className="bg-slate-700/50 border border-slate-600 rounded p-3">
          <p className="text-xs text-slate-400 font-medium mb-1">Where to get a token:</p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>Ask your Slack app admin for the bot or user OAuth token</li>
            <li>
              Or create your own app at{' '}
              <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-amber-400/70 underline">api.slack.com/apps</a>
              {' '}&rarr; add scopes (<code className="text-amber-400/60">channels:history</code>, <code className="text-amber-400/60">channels:read</code>, <code className="text-amber-400/60">chat:write</code>, <code className="text-amber-400/60">users:read</code>) &rarr; Install to Workspace &rarr; copy the token
            </li>
          </ul>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={handleConnect} disabled={loading || !token}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  );
}
