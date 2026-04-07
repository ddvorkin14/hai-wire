import { useState, useEffect } from 'react';
import {
  GetAllConfig, GetOwnedCategories, GetAllCategories,
  SaveSquadConfig, SaveOwnedCategories, SaveConfidenceThreshold, SaveWatchChannel,
  SaveAnthropicKey, SaveAckReplyEnabled,
  IsSlackConnected, GetSlackStatus, ReconnectSlack,
  TestWatchChannel, TestTriageChannel,
} from '../../../wailsjs/go/main/App';
import { PingTargetPicker } from './PingTargetPicker';
import type { Category } from '../../types';

export function Settings() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [ownedCats, setOwnedCats] = useState<Record<string, string>>({});
  const [allCats, setAllCats] = useState<Category[]>([]);
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      GetAllConfig(),
      GetOwnedCategories(),
      GetAllCategories(),
      IsSlackConnected().catch(() => false),
      GetSlackStatus(),
    ]).then(([cfg, owned, cats, slack, slackStatus]) => {
      setConfig(cfg);
      setAllCats(cats || []);
      setSlackConnected(slack as boolean);
      if (slackStatus.team) setSlackTeam(slackStatus.team);

      // Filter owned categories to only include keys that exist in current category set
      const validKeys = new Set((cats || []).map((c: Category) => c.Key));
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(owned || {})) {
        if (validKeys.has(k)) filtered[k] = v;
      }
      setOwnedCats(filtered);
    });
  }, []);

  const update = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const toggleCat = (key: string, name: string) => {
    setOwnedCats((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = name;
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    await SaveSquadConfig(config.squad_name || '', config.ping_group || '', config.triage_channel_id || '');
    await SaveWatchChannel(config.watch_channel_id || '');
    await SaveConfidenceThreshold(config.confidence_threshold || '0.5');
    await SaveAnthropicKey(config.anthropic_key || '');
    await SaveAckReplyEnabled(config.ack_reply_enabled || 'false');
    await SaveOwnedCategories(ownedCats);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestWatch = async () => {
    if (!config.watch_channel_id) return;
    setTesting((prev) => ({ ...prev, watch: true }));
    try {
      const msg = await TestWatchChannel(config.watch_channel_id);
      setTestResult((prev) => ({ ...prev, watch: { ok: true, msg } }));
    } catch (e: any) {
      setTestResult((prev) => ({ ...prev, watch: { ok: false, msg: e?.message || 'Failed' } }));
    } finally {
      setTesting((prev) => ({ ...prev, watch: false }));
    }
  };

  const handleTestTriage = async () => {
    if (!config.triage_channel_id) return;
    setTesting((prev) => ({ ...prev, triage: true }));
    try {
      const msg = await TestTriageChannel(config.triage_channel_id);
      setTestResult((prev) => ({ ...prev, triage: { ok: true, msg } }));
    } catch (e: any) {
      setTestResult((prev) => ({ ...prev, triage: { ok: false, msg: e?.message || 'Failed' } }));
    } finally {
      setTesting((prev) => ({ ...prev, triage: false }));
    }
  };

  const handleReconnectSlack = async () => {
    try {
      const team = await ReconnectSlack();
      setSlackConnected(true);
      setSlackTeam(team);
    } catch {}
  };

  const threshold = Math.round(parseFloat(config.confidence_threshold || '0.5') * 100);
  const thresholdLabel = threshold >= 80 ? 'High' : threshold >= 50 ? 'Medium' : 'Low';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={handleSave} disabled={!dirty}
            className={`px-5 py-1.5 rounded text-sm font-medium transition-colors ${
              saved ? 'bg-green-600 text-white' :
              dirty ? 'bg-amber-500 hover:bg-amber-600 text-slate-900' :
              'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}>
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* Slack Connection */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Slack Connection</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${slackConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">
                {slackConnected ? (
                  <>Connected to <strong className="text-white">{slackTeam}</strong></>
                ) : 'Not connected'}
              </span>
              <span className="text-xs text-slate-500">(via Claude Code)</span>
            </div>
            {!slackConnected && (
              <button onClick={handleReconnectSlack}
                className="text-amber-400 text-xs underline hover:text-amber-300">Retry</button>
            )}
          </div>
        </section>

        {/* Claude API */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Claude API</h3>
          <div>
            <label className="block text-xs text-slate-500 mb-1">API Key</label>
            <input type="password" value={config.anthropic_key || ''} onChange={(e) => update('anthropic_key', e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
        </section>

        {/* Squad */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Squad</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Squad Name</label>
              <input value={config.squad_name || ''} onChange={(e) => update('squad_name', e.target.value)}
                placeholder="e.g., hai-conversion"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ping Target</label>
              <PingTargetPicker
                value={config.ping_group || ''}
                onChange={(val) => update('ping_group', val)}
              />
              <p className="text-xs text-slate-600 mt-1">
                Enter a Slack handle (e.g., <code className="text-slate-500">hai-conversion-on-call</code>) or a group/user ID (e.g., <code className="text-slate-500">S091P70JAP5</code>) for clickable mentions.
              </p>
            </div>
          </div>
        </section>

        {/* Channels */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Channels</h3>
          <div className="space-y-4">
            {/* Watch Channel */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Watch Channel (source)</label>
              <p className="text-xs text-slate-600 mb-1.5">The channel HAI-Wire monitors for support requests.</p>
              <div className="flex gap-2">
                <input value={config.watch_channel_id || ''} onChange={(e) => update('watch_channel_id', e.target.value)}
                  placeholder="Channel ID (e.g., C08MXC8URS8)"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
                <button
                  onClick={handleTestWatch}
                  disabled={!config.watch_channel_id || testing.watch || !slackConnected}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 text-xs px-3 py-2 rounded whitespace-nowrap">
                  {testing.watch ? 'Checking...' : 'Check'}
                </button>
              </div>
              {testResult.watch && (
                <p className={`text-xs mt-1 ${testResult.watch.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.watch.msg}
                </p>
              )}
              <p className="text-xs text-slate-600 mt-1">
                Find the ID: open channel in Slack &rarr; click channel name &rarr; scroll to bottom &rarr; copy Channel ID.
              </p>
            </div>

            {/* Triage Channel */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Triage Channel (destination)</label>
              <p className="text-xs text-slate-600 mb-1.5">Where classified requests get posted for your squad.</p>
              <div className="flex gap-2">
                <input value={config.triage_channel_id || ''} onChange={(e) => update('triage_channel_id', e.target.value)}
                  placeholder="Channel ID (e.g., C0XXXXXXXXX)"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
                <button
                  onClick={handleTestTriage}
                  disabled={!config.triage_channel_id || testing.triage || !slackConnected}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 text-xs px-3 py-2 rounded whitespace-nowrap">
                  {testing.triage ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              {testResult.triage && (
                <p className={`text-xs mt-1 ${testResult.triage.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.triage.msg}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Behavior */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Behavior</h3>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm text-slate-300">Reply to routed posts</div>
              <div className="text-xs text-slate-500">Post an acknowledgment reply in the original thread when a request is routed.</div>
            </div>
            <input
              type="checkbox"
              checked={config.ack_reply_enabled === 'true'}
              onChange={(e) => update('ack_reply_enabled', e.target.checked ? 'true' : 'false')}
              className="accent-amber-400 w-4 h-4"
            />
          </label>
        </section>

        {/* Confidence */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Confidence Threshold
          </h3>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-2xl font-bold text-amber-400">{threshold}%</span>
            <span className={`text-sm ${
              threshold >= 80 ? 'text-green-400' : threshold >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>{thresholdLabel}</span>
          </div>
          <input type="range" min={10} max={100} value={threshold}
            onChange={(e) => update('confidence_threshold', (Number(e.target.value) / 100).toString())}
            className="w-full accent-amber-400" />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>More results, more noise</span>
            <span>Fewer results, more accurate</span>
          </div>
        </section>

        {/* Categories */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-1">
            Owned Categories
          </h3>
          <p className="text-xs text-slate-600 mb-3">
            {Object.keys(ownedCats).length} selected -- only these categories will be routed to your triage channel.
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
            {allCats.map((cat) => (
              <label key={cat.Key}
                className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${
                  ownedCats[cat.Key] ? 'bg-amber-400/10 border border-amber-400/30' : 'hover:bg-slate-700/50'
                }`}>
                <input type="checkbox" checked={!!ownedCats[cat.Key]}
                  onChange={() => toggleCat(cat.Key, cat.Name)} className="mt-0.5 accent-amber-400" />
                <div>
                  <div className="text-sm font-medium">{cat.Name}</div>
                  <div className="text-xs text-slate-500">{cat.Description}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Spacer so content isn't hidden behind save bar */}
        {dirty && <div className="h-16" />}
      </div>
      </div>

      {/* Fixed bottom save bar */}
      {dirty && (
        <div className="border-t border-slate-700 bg-slate-800 px-6 py-3">
          <div className="max-w-2xl mx-auto">
            <button onClick={handleSave}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-6 py-2 rounded">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
