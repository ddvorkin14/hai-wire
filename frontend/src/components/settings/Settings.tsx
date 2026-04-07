import { useState, useEffect } from 'react';
import {
  GetAllConfig, GetOwnedCategories, GetAllCategories,
  SaveSquadConfig, SaveOwnedCategories, SaveConfidenceThreshold, SaveWatchChannel,
  ListSlackChannels,
} from '../../../wailsjs/go/main/App';
import type { Category, ChannelInfo } from '../../types';

export function Settings() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [ownedCats, setOwnedCats] = useState<Record<string, string>>({});
  const [allCats, setAllCats] = useState<Category[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    GetAllConfig().then(setConfig);
    GetOwnedCategories().then(setOwnedCats);
    GetAllCategories().then((cats) => setAllCats(cats || []));
    ListSlackChannels().then((chs) => setChannels(chs || []));
  }, []);

  const update = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCat = (key: string, name: string) => {
    setOwnedCats((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = name;
      return next;
    });
  };

  const handleSave = async () => {
    await SaveSquadConfig(config.squad_name, config.ping_group, config.triage_channel_id);
    await SaveWatchChannel(config.watch_channel_id);
    await SaveConfidenceThreshold(config.confidence_threshold);
    await SaveOwnedCategories(ownedCats);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const threshold = Math.round(parseFloat(config.confidence_threshold || '0.5') * 100);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h2 className="text-lg font-semibold">Settings</h2>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Squad</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Squad Name</label>
              <input value={config.squad_name || ''} onChange={(e) => update('squad_name', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Ping Group</label>
              <input value={config.ping_group || ''} onChange={(e) => update('ping_group', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Channels</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Watch Channel</label>
              <select value={config.watch_channel_id || ''} onChange={(e) => update('watch_channel_id', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
                <option value="">Select...</option>
                {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Triage Channel</label>
              <select value={config.triage_channel_id || ''} onChange={(e) => update('triage_channel_id', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
                <option value="">Select...</option>
                {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Confidence Threshold: {threshold}%</h3>
          <input type="range" min={10} max={100} value={threshold}
            onChange={(e) => update('confidence_threshold', (Number(e.target.value) / 100).toString())}
            className="w-full accent-amber-400" />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Owned Categories ({Object.keys(ownedCats).length})</h3>
          <div className="max-h-[250px] overflow-y-auto space-y-1 pr-2">
            {allCats.map((cat) => (
              <label key={cat.Key}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer text-sm ${
                  ownedCats[cat.Key] ? 'bg-amber-400/10' : 'hover:bg-slate-700/50'
                }`}>
                <input type="checkbox" checked={!!ownedCats[cat.Key]} onChange={() => toggleCat(cat.Key, cat.Name)} className="accent-amber-400" />
                {cat.Name}
              </label>
            ))}
          </div>
        </section>

        <button onClick={handleSave}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-6 py-2 rounded">
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
