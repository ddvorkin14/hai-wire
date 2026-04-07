import { useState } from 'react';
import { ConnectSlack, GetSlackAuthURL } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; }

export function StepSlack({ onNext }: Props) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [authURL, setAuthURL] = useState('');

  const handleConnect = async () => {
    setError('');
    setAuthURL('');
    setLoading(true);
    try {
      const team = await ConnectSlack();
      setTeamName(team);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      // Try to get the auth URL for manual copy-paste
      try {
        const url = await GetSlackAuthURL();
        if (url) setAuthURL(url);
      } catch {}
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
      <p className="text-slate-400 text-sm mb-6">
        Click the button below to connect to your Slack workspace. A browser window will open for you to authorize HAI-Wire.
      </p>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded p-3">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <p className="text-slate-500 text-xs">Something went wrong. Click below to try again.</p>
          </div>
        )}

        {authURL && (
          <div className="bg-slate-700/50 border border-slate-600 rounded p-3">
            <p className="text-slate-300 text-xs mb-2">Browser didn't open? Copy this URL and paste it in your browser:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={authURL}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-400 font-mono truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => navigator.clipboard.writeText(authURL)}
                className="bg-slate-600 hover:bg-slate-500 text-xs text-slate-200 px-3 py-1 rounded whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <button onClick={handleConnect} disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold px-6 py-3 rounded text-lg">
          {loading ? 'Waiting for authorization...' : error ? 'Try Again' : 'Connect to Slack'}
        </button>
        {loading && (
          <div className="text-center space-y-2">
            <p className="text-slate-400 text-sm">
              A browser window should have opened. Complete the authorization there.
            </p>
            <button onClick={() => setLoading(false)}
              className="text-amber-400/70 text-xs underline hover:text-amber-400">
              Cancel and try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
