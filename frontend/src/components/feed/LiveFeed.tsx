import { useState, useEffect, useMemo } from 'react';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import { IsMonitoring, StartMonitoring, StopMonitoring, GetProcessedMessages } from '../../../wailsjs/go/main/App';
import { MessageCard } from './MessageCard';
import type { TriageEvent, ProcessedMessage } from '../../types';

type ConfidenceFilter = 'all' | 'high' | 'medium' | 'low';
type RouteFilter = 'all' | 'routed' | 'not_routed';

export function LiveFeed() {
  const [events, setEvents] = useState<TriageEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all');

  useEffect(() => {
    IsMonitoring().then(setRunning);
    GetProcessedMessages(50).then((msgs) => {
      if (msgs && msgs.length > 0) {
        setEvents(msgs.map((m: ProcessedMessage) => ({
          message_ts: m.MessageTS,
          author: m.Author,
          category: m.Category,
          confidence: m.Confidence,
          summary: m.Summary,
          reasoning: m.Reasoning,
          routed: m.Routed,
        })));
      }
    });
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

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(events.map(e => e.category));
    return Array.from(cats).sort();
  }, [events]);

  // Filter events
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch = e.author.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (confidenceFilter === 'high' && e.confidence < 0.8) return false;
      if (confidenceFilter === 'medium' && (e.confidence < 0.5 || e.confidence >= 0.8)) return false;
      if (confidenceFilter === 'low' && e.confidence >= 0.5) return false;
      if (routeFilter === 'routed' && !e.routed) return false;
      if (routeFilter === 'not_routed' && e.routed) return false;
      return true;
    });
  }, [events, search, categoryFilter, confidenceFilter, routeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = events.length;
    const routed = events.filter(e => e.routed).length;
    const high = events.filter(e => e.confidence >= 0.8).length;
    const medium = events.filter(e => e.confidence >= 0.5 && e.confidence < 0.8).length;
    const low = events.filter(e => e.confidence < 0.5).length;
    return { total, routed, high, medium, low };
  }, [events]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
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

      {/* Stats bar */}
      {events.length > 0 && (
        <div className="flex gap-3 mb-4">
          <div className="bg-slate-800 rounded px-3 py-2 border border-slate-700 flex-1 text-center">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-xs text-slate-500">Scanned</div>
          </div>
          <div className="bg-slate-800 rounded px-3 py-2 border border-amber-400/30 flex-1 text-center">
            <div className="text-lg font-bold text-amber-400">{stats.routed}</div>
            <div className="text-xs text-slate-500">Routed</div>
          </div>
          <div className="bg-slate-800 rounded px-3 py-2 border border-green-500/30 flex-1 text-center">
            <div className="text-lg font-bold text-green-400">{stats.high}</div>
            <div className="text-xs text-slate-500">High</div>
          </div>
          <div className="bg-slate-800 rounded px-3 py-2 border border-yellow-500/30 flex-1 text-center">
            <div className="text-lg font-bold text-yellow-400">{stats.medium}</div>
            <div className="text-xs text-slate-500">Medium</div>
          </div>
          <div className="bg-slate-800 rounded px-3 py-2 border border-red-500/30 flex-1 text-center">
            <div className="text-lg font-bold text-red-400">{stats.low}</div>
            <div className="text-xs text-slate-500">Low</div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      {events.length > 0 && (
        <div className="flex gap-2 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search author, summary, category..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400 placeholder-slate-600"
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400 text-slate-300">
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceFilter)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400 text-slate-300">
            <option value="all">All confidence</option>
            <option value="high">High (80%+)</option>
            <option value="medium">Medium (50-79%)</option>
            <option value="low">Low (&lt;50%)</option>
          </select>
          <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value as RouteFilter)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400 text-slate-300">
            <option value="all">All</option>
            <option value="routed">Routed</option>
            <option value="not_routed">Not routed</option>
          </select>
        </div>
      )}

      {/* Results count */}
      {events.length > 0 && filtered.length !== events.length && (
        <p className="text-xs text-slate-500 mb-2">
          Showing {filtered.length} of {events.length} messages
          {search || categoryFilter !== 'all' || confidenceFilter !== 'all' || routeFilter !== 'all' ? (
            <button onClick={() => { setSearch(''); setCategoryFilter('all'); setConfidenceFilter('all'); setRouteFilter('all'); }}
              className="text-amber-400 ml-2 underline">Clear filters</button>
          ) : null}
        </p>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {events.length === 0 ? (
          <div className="text-slate-500 text-sm text-center mt-12">
            {running ? 'Classifying messages...' : 'Start monitoring to see classified messages.'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-500 text-sm text-center mt-12">No messages match your filters.</div>
        ) : (
          filtered.map((event, i) => <MessageCard key={event.message_ts || i} event={event} />)
        )}
      </div>
    </div>
  );
}
