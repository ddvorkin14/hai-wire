import { useState, useEffect } from 'react';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import { IsMonitoring, StartMonitoring, StopMonitoring } from '../../../wailsjs/go/main/App';
import { MessageCard } from './MessageCard';
import type { TriageEvent } from '../../types';

export function LiveFeed() {
  const [events, setEvents] = useState<TriageEvent[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    IsMonitoring().then(setRunning);
    EventsOn('triage:event', (event: TriageEvent) => {
      setEvents((prev) => [event, ...prev]);
    });
  }, []);

  const toggle = async () => {
    if (running) {
      await StopMonitoring();
      setRunning(false);
    } else {
      await StartMonitoring();
      setRunning(true);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Live Feed</h2>
          <span className={`inline-flex items-center gap-1.5 text-xs ${running ? 'text-green-400' : 'text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${running ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            {running ? 'Monitoring' : 'Stopped'}
          </span>
        </div>
        <button onClick={toggle}
          className={`px-4 py-1.5 rounded text-sm font-medium ${
            running ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}>
          {running ? 'Stop' : 'Start'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {events.length === 0 ? (
          <div className="text-slate-500 text-sm text-center mt-12">
            {running ? 'Waiting for messages...' : 'Start monitoring to see classified messages.'}
          </div>
        ) : (
          events.map((event) => <MessageCard key={event.message_ts} event={event} />)
        )}
      </div>
    </div>
  );
}
