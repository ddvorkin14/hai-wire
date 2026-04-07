import { useState } from 'react';
import { SaveSlackTokens } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; }

export function StepSlack({ onNext }: Props) {
  const [botToken, setBotToken] = useState('');
  const [appToken, setAppToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      const team = await SaveSlackTokens(botToken, appToken);
      setTeamName(team);
    } catch (e: any) {
      setError(e?.message || 'Invalid tokens. Check your Slack app settings.');
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
        You need two tokens from your{' '}
        <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300">
          Slack app settings
        </a>. These are <em>not</em> the Client ID, Client Secret, or Signing Secret on the Basic Information page.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Bot User OAuth Token</label>
          <p className="text-xs text-slate-500 mb-1.5">
            Your App &rarr; <strong>OAuth & Permissions</strong> (left sidebar) &rarr; copy <strong>Bot User OAuth Token</strong>. Starts with <code className="text-amber-400/70">xoxb-</code>
          </p>
          <input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="xoxb-..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Socket Mode Token</label>
          <p className="text-xs text-slate-500 mb-1.5">
            Your App &rarr; <strong>Socket Mode</strong> (left sidebar) &rarr; enable it &rarr; generate a token with <code className="text-amber-400/70">connections:write</code> scope. Starts with <code className="text-amber-400/70">xapp-</code>
          </p>
          <div className="bg-slate-700/50 border border-slate-600 rounded p-2.5 mb-1.5">
            <p className="text-xs text-slate-400">
              Don't see Socket Mode? You may need to enable it first. Go to <strong>Socket Mode</strong> in the left sidebar and toggle it on. It will prompt you to create this token.
            </p>
          </div>
          <input type="password" value={appToken} onChange={(e) => setAppToken(e.target.value)} placeholder="xapp-..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={handleConnect} disabled={loading || !botToken || !appToken}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  );
}
