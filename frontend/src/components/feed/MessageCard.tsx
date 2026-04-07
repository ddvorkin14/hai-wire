import { useState } from 'react';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import type { TriageEvent } from '../../types';

interface Props { event: TriageEvent; }

export function MessageCard({ event }: Props) {
  const [expanded, setExpanded] = useState(false);

  const categoryLabel = event.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        event.routed ? 'bg-slate-800 border-amber-400/30' : 'bg-slate-800/50 border-slate-700'
      } hover:border-slate-500`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{event.author}</span>
          <ConfidenceBadge confidence={event.confidence} />
          {event.routed && (
            <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded shrink-0">Routed</span>
          )}
        </div>
        <span className="text-xs text-slate-600 shrink-0">
          {expanded ? '▾' : '▸'}
        </span>
      </div>

      {/* Category */}
      <div className="text-xs text-slate-500 mb-1.5">{categoryLabel}</div>

      {/* Summary */}
      <p className="text-sm text-slate-300">{event.summary}</p>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
          {event.reasoning && (
            <div>
              <span className="text-xs text-slate-500 font-medium">Reasoning:</span>
              <p className="text-xs text-slate-400 mt-0.5">{event.reasoning}</p>
            </div>
          )}
          <div className="flex gap-4 text-xs text-slate-500">
            <span>Category: <span className="text-slate-400">{event.category}</span></span>
            <span>Confidence: <span className="text-slate-400">{Math.round(event.confidence * 100)}%</span></span>
            <span>TS: <span className="text-slate-400 font-mono">{event.message_ts}</span></span>
          </div>
        </div>
      )}
    </button>
  );
}
