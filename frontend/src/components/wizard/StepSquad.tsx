import { useState, useEffect } from 'react';
import { SaveSquadConfig, GetAllConfig, ListSlackChannels, IsSlackConnected } from '../../../wailsjs/go/main/App';
import type { ChannelInfo } from '../../types';

interface Props { onNext: () => void; onBack: () => void; }

export function StepSquad({ onNext, onBack }: Props) {
  const [squadName, setSquadName] = useState('');
  const [pingGroup, setPingGroup] = useState('');
  const [triageChannel, setTriageChannel] = useState('');
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [slackReady, setSlackReady] = useState(false);

  useEffect(() => {
    Promise.all([
      GetAllConfig(),
      IsSlackConnected().catch(() => false),
    ]).then(([config, connected]) => {
      if (config.squad_name) setSquadName(config.squad_name);
      if (config.ping_group) setPingGroup(config.ping_group);
      if (config.triage_channel_id) setTriageChannel(config.triage_channel_id);
      setSlackReady(connected as boolean);
      if (connected) {
        ListSlackChannels().then((chs) => setChannels(chs || []));
      }
    });
  }, []);

  const handleSave = async () => {
    await SaveSquadConfig(squadName.trim(), pingGroup.trim(), triageChannel.trim());
    onNext();
  };

  const isValid = squadName.trim() && pingGroup.trim() && triageChannel.trim();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Squad Setup</h2>
      <p className="text-slate-400 text-sm mb-4">Configure how your squad gets notified.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Squad Name</label>
          <p className="text-xs text-slate-500 mb-1.5">Your team's name. Used in logs and messages.</p>
          <input value={squadName} onChange={(e) => setSquadName(e.target.value)} placeholder="e.g., hai-conversion"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Ping Group</label>
          <p className="text-xs text-slate-500 mb-1.5">The Slack user group handle that gets pinged when a request is routed to your squad.</p>
          <input value={pingGroup} onChange={(e) => setPingGroup(e.target.value)} placeholder="e.g., @hai-conversion-on-call"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Triage Channel</label>
          <p className="text-xs text-slate-500 mb-1.5">Where routed support requests get posted for your squad to review.</p>
          {slackReady && channels.length > 0 ? (
            <select value={triageChannel} onChange={(e) => setTriageChannel(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
              <option value="">Select a channel...</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
          ) : (
            <>
              <input value={triageChannel} onChange={(e) => setTriageChannel(e.target.value)} placeholder="e.g., C0XXXXXXXXX"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
              {!slackReady && (
                <p className="text-xs text-amber-400/70 mt-1">Slack isn't connected yet -- enter the channel ID manually for now.</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
        <button onClick={handleSave} disabled={!isValid}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded">
          Save
        </button>
      </div>
    </div>
  );
}
