import { useState, useEffect } from 'react';
import { ListSlackChannels, SaveWatchChannel, GetAllConfig } from '../../../wailsjs/go/main/App';
import type { ChannelInfo } from '../../types';

interface Props { onNext: () => void; onBack: () => void; }

export function StepChannel({ onNext, onBack }: Props) {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ListSlackChannels().catch(() => null),
      GetAllConfig(),
    ]).then(([chs, config]) => {
      if (chs && chs.length > 0) setChannels(chs);
      if (config.watch_channel_id) {
        setSelected(config.watch_channel_id);
        setManualId(config.watch_channel_id);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const channelId = channels.length > 0 ? selected : manualId.trim();
    if (!channelId) return;
    await SaveWatchChannel(channelId);
    onNext();
  };

  const hasValue = channels.length > 0 ? !!selected : !!manualId.trim();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Watch Channel</h2>
      <p className="text-slate-400 text-sm mb-4">Which Slack channel should HAI-Wire monitor for support requests?</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : channels.length > 0 ? (
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
          <option value="">Select a channel...</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>#{ch.name}</option>
          ))}
        </select>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Channel ID</label>
            <input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="e.g., C08MXC8URS8"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div className="bg-slate-700/50 border border-slate-600 rounded p-3">
            <p className="text-xs text-slate-400 font-medium mb-1">How to find a channel ID:</p>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Open the channel in Slack</li>
              <li>Click the channel name at the top</li>
              <li>Scroll to the bottom of the panel</li>
              <li>Copy the Channel ID (starts with C)</li>
            </ol>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
        <button onClick={handleSave} disabled={!hasValue}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
          Save
        </button>
      </div>
    </div>
  );
}
