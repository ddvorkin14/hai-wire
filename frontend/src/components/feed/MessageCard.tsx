import { useState } from 'react';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import { QueueMessage } from '../../../wailsjs/go/main/App';
import type { TriageEvent } from '../../types';

interface Props {
  event: TriageEvent;
  onRouted?: () => void;
}

export function MessageCard({ event, onRouted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [routing, setRouting] = useState(false);
  const [routed, setRouted] = useState(event.routed);
  const [queued, setQueued] = useState(event.status === 'pending');

  const categoryLabel = event.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const pct = Math.round(event.confidence * 100);

  const handleQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRouting(true);
    try {
      await QueueMessage(event.message_ts);
      setQueued(true);
      onRouted?.();
    } catch (err) {
      console.error('queue error:', err);
    } finally {
      setRouting(false);
    }
  };

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        routed ? 'bg-slate-800 border-amber-400/30' : 'bg-slate-800/50 border-slate-700'
      } hover:border-slate-500`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{event.author}</span>
          <ConfidenceBadge confidence={event.confidence} />
          {routed && (
            <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded shrink-0">Routed</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!routed && !queued && (
            <span
              onClick={handleQueue}
              className="text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-2 py-0.5 rounded cursor-pointer"
            >
              {routing ? 'Queuing...' : 'Send to Queue'}
            </span>
          )}
          {queued && !routed && (
            <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded">In Queue</span>
          )}
          <span className="text-xs text-slate-600">{categoryLabel}</span>
          <span className="text-xs text-slate-600">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-300 mb-2">{event.summary}</p>

      {/* Confidence reasoning */}
      {event.reasoning && (
        <div className={`rounded px-3 py-2 text-xs ${
          pct >= 80 ? 'bg-green-900/20 border border-green-800/30 text-green-400/80' :
          pct >= 50 ? 'bg-yellow-900/20 border border-yellow-800/30 text-yellow-400/80' :
          'bg-red-900/20 border border-red-800/30 text-red-400/80'
        }`}>
          <span className="font-medium">Why {pct}%:</span> {event.reasoning}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex gap-4 text-xs text-slate-500">
            <span>Category key: <span className="text-slate-400 font-mono">{event.category}</span></span>
            <span>Status: <span className="text-slate-400">{event.status || (routed ? 'approved' : 'classified')}</span></span>
            <span>TS: <span className="text-slate-400 font-mono">{event.message_ts}</span></span>
          </div>
        </div>
      )}
    </button>
  );
}
