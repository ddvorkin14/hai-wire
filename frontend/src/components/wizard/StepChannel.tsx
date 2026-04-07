import { useState, useEffect } from 'react';
import { ListSlackChannels, SaveWatchChannel, IsSlackConnected, GetAllConfig } from '../../../wailsjs/go/main/App';
import type { ChannelInfo } from '../../types';

interface Props { onNext: () => void; onBack: () => void; }

export function StepChannel({ onNext, onBack }: Props) {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(true);
  const [slackReady, setSlackReady] = useState(false);

  useEffect(() => {
    Promise.all([
      IsSlackConnected().catch(() => false),
      GetAllConfig(),
    ]).then(([connected, config]) => {
      setSlackReady(connected as boolean);
      if (config.watch_channel_id) {
        setSelected(config.watch_channel_id);
        setManualId(config.watch_channel_id);
      }
      if (connected) {
        ListSlackChannels().then((chs) => setChannels(chs || []));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const channelId = slackReady ? selected : manualId.trim();
    if (!channelId) return;
    await SaveWatchChannel(channelId);
    onNext();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Watch Channel</h2>
      <p className="text-slate-400 text-sm mb-4">Which Slack channel should HAI-Wire monitor for support requests?</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : slackReady && channels.length > 0 ? (
        <div className="space-y-4">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
            <option value="">Select a channel...</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-4">
          {!slackReady && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3 mb-2">
              <p className="text-amber-400 text-xs">Slack isn't connected yet. You can enter the channel ID manually and come back later to change it.</p>
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Channel ID</label>
            <input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="e.g., C08MXC8URS8"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
            <p className="text-xs text-slate-500 mt-1">Find this by right-clicking a channel in Slack &rarr; View channel details &rarr; scroll to the bottom.</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
        <button onClick={handleSave} disabled={slackReady ? !selected : !manualId.trim()}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
          Save
        </button>
      </div>
    </div>
  );
}
