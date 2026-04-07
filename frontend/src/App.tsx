import { useState, useEffect } from 'react';
import { GetAllConfig, GetOwnedCategories, IsSlackConnected } from '../wailsjs/go/main/App';
import { WizardLayout } from './components/wizard/WizardLayout';
import { LiveFeed } from './components/feed/LiveFeed';
import { ReviewQueue } from './components/queue/ReviewQueue';
import { Settings } from './components/settings/Settings';
import { ActivityLog } from './components/log/ActivityLog';
import type { View } from './types';

function App() {
  const [view, setView] = useState<View>('feed');
  const [loading, setLoading] = useState(true);
  const [hasAnyCconfig, setHasAnyConfig] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  const refreshStatus = async () => {
    const [config, cats, slack] = await Promise.all([
      GetAllConfig(),
      GetOwnedCategories(),
      IsSlackConnected().catch(() => false),
    ]);
    const hasConfig = !!(config.anthropic_key || config.squad_name || config.watch_channel_id);
    const allDone = !!(
      slack &&
      config.anthropic_key &&
      config.watch_channel_id &&
      config.squad_name &&
      config.ping_group &&
      config.triage_channel_id &&
      config.confidence_threshold &&
      Object.keys(cats || {}).length > 0
    );
    setHasAnyConfig(hasConfig);
    setSlackConnected(slack as boolean);
    setSetupDone(allDone);

    // Only show wizard on very first launch (nothing configured)
    if (!hasConfig && !(slack as boolean)) {
      setView('wizard');
    }
    setLoading(false);
  };

  useEffect(() => { refreshStatus(); }, []);

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading HAI-Wire...</div>
      </div>
    );
  }

  // Wizard is now shown inside the main layout, not full-screen

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Nav bar */}
      <nav className="flex items-center gap-1 px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-lg font-bold text-amber-400 mr-6">HAI-Wire</span>
        {(['feed', 'queue', 'settings', 'log', 'wizard'] as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              view === v ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}>
            {v === 'feed' ? 'Live Feed' : v === 'queue' ? 'Review Queue' : v === 'settings' ? 'Settings' : v === 'log' ? 'Activity Log' : 'Setup'}
          </button>
        ))}
      </nav>

      {/* Setup banner */}
      {!setupDone && (
        <div className="px-4 py-2 bg-amber-400/10 border-b border-amber-400/20 flex items-center justify-between">
          <p className="text-amber-400 text-sm">
            {!slackConnected
              ? 'Slack is not connected. Complete setup to start monitoring.'
              : 'Setup incomplete. Some features may not work.'}
          </p>
          <button onClick={() => setView('wizard')}
            className="text-amber-400 text-sm font-medium hover:text-amber-300 underline">
            Go to Setup
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {view === 'feed' && <LiveFeed />}
        {view === 'queue' && <ReviewQueue />}
        {view === 'settings' && <Settings />}
        {view === 'log' && <ActivityLog />}
        {view === 'wizard' && <WizardLayout onComplete={() => { refreshStatus(); setView('feed'); }} />}
      </main>
    </div>
  );
}

export default App;
