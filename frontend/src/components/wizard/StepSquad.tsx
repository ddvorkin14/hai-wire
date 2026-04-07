import { useState, useEffect } from 'react';
import { SaveSquadConfig, ListSlackChannels } from '../../../wailsjs/go/main/App';
import type { ChannelInfo } from '../../types';

interface Props { onNext: () => void; onBack: () => void; }

export function StepSquad({ onNext, onBack }: Props) {
  const [squadName, setSquadName] = useState('');
  const [pingGroup, setPingGroup] = useState('');
  const [triageChannel, setTriageChannel] = useState('');
  const [channels, setChannels] = useState<ChannelInfo[]>([]);

  useEffect(() => {
    ListSlackChannels().then((chs) => setChannels(chs || []));
  }, []);

  const handleNext = async () => {
    await SaveSquadConfig(squadName, pingGroup, triageChannel);
    onNext();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Set Up Your Squad</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Squad Name</label>
          <input value={squadName} onChange={(e) => setSquadName(e.target.value)} placeholder="e.g., hai-conversion"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Ping Group</label>
          <input value={pingGroup} onChange={(e) => setPingGroup(e.target.value)} placeholder="e.g., @hai-conversion-on-call"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Triage Channel</label>
          <select value={triageChannel} onChange={(e) => setTriageChannel(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
            <option value="">Select a channel...</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
          <button onClick={handleNext} disabled={!squadName || !pingGroup || !triageChannel}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
