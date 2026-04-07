import { useState, useEffect } from 'react';
import { IsSetupComplete } from '../wailsjs/go/main/App';
import { WizardLayout } from './components/wizard/WizardLayout';
import { LiveFeed } from './components/feed/LiveFeed';
import { Settings } from './components/settings/Settings';
import { ActivityLog } from './components/log/ActivityLog';
import type { View } from './types';

function App() {
  const [view, setView] = useState<View>('wizard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    IsSetupComplete().then((complete) => {
      setView(complete ? 'feed' : 'wizard');
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading HAI-Wire...</div>
      </div>
    );
  }

  if (view === 'wizard') {
    return <WizardLayout onComplete={() => setView('feed')} />;
  }

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col">
      <nav className="flex items-center gap-1 px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-lg font-bold text-amber-400 mr-6">HAI-Wire</span>
        {(['feed', 'settings', 'log'] as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              view === v ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}>
            {v === 'feed' ? 'Live Feed' : v === 'settings' ? 'Settings' : 'Activity Log'}
          </button>
        ))}
      </nav>
      <main className="flex-1 overflow-hidden">
        {view === 'feed' && <LiveFeed />}
        {view === 'settings' && <Settings />}
        {view === 'log' && <ActivityLog />}
      </main>
    </div>
  );
}

export default App;
