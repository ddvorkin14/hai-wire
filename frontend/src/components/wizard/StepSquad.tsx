import { useState, useEffect } from 'react';
import { SaveSquadConfig, GetAllConfig } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; onBack: () => void; }

export function StepSquad({ onNext, onBack }: Props) {
  const [squadName, setSquadName] = useState('');
  const [pingGroup, setPingGroup] = useState('');
  const [triageChannel, setTriageChannel] = useState('');

  useEffect(() => {
    GetAllConfig().then((config) => {
      if (config.squad_name) setSquadName(config.squad_name);
      if (config.ping_group) setPingGroup(config.ping_group);
      if (config.triage_channel_id) setTriageChannel(config.triage_channel_id);
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
          <p className="text-xs text-slate-500 mb-1.5">The Slack user group handle that gets pinged when a request is routed.</p>
          <input value={pingGroup} onChange={(e) => setPingGroup(e.target.value)} placeholder="e.g., @hai-conversion-on-call"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Triage Channel ID</label>
          <p className="text-xs text-slate-500 mb-1.5">Where routed support requests get posted for your squad to review.</p>
          <input value={triageChannel} onChange={(e) => setTriageChannel(e.target.value)} placeholder="e.g., C0XXXXXXXXX"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          <div className="bg-slate-700/50 border border-slate-600 rounded p-2.5 mt-1.5">
            <p className="text-xs text-slate-500">Click the channel name in Slack &rarr; scroll to the bottom &rarr; copy the Channel ID.</p>
          </div>
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
