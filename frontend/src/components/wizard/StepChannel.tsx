import { useState, useEffect } from 'react';
import { ListSlackChannels, SaveWatchChannel } from '../../../wailsjs/go/main/App';
import type { ChannelInfo } from '../../types';

interface Props { onNext: () => void; onBack: () => void; }

export function StepChannel({ onNext, onBack }: Props) {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ListSlackChannels().then((chs) => {
      setChannels(chs || []);
      setLoading(false);
    });
  }, []);

  const handleNext = async () => {
    await SaveWatchChannel(selected);
    onNext();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pick Watch Channel</h2>
      <p className="text-slate-400 text-sm mb-4">Select the channel to monitor for support requests.</p>
      {loading ? (
        <p className="text-slate-500">Loading channels...</p>
      ) : (
        <div className="space-y-4">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
            <option value="">Select a channel...</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
            <button onClick={handleNext} disabled={!selected}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
