import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import type { TriageEvent } from '../../types';

interface Props { event: TriageEvent; }

export function MessageCard({ event }: Props) {
  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      event.routed ? 'bg-slate-800 border-amber-400/30' : 'bg-slate-800/50 border-slate-700'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{event.author}</span>
            <ConfidenceBadge confidence={event.confidence} />
            {event.routed && (
              <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded">Routed</span>
            )}
          </div>
          <div className="text-xs text-slate-400 mb-2">{event.category}</div>
          <p className="text-sm text-slate-300">{event.summary}</p>
        </div>
      </div>
    </div>
  );
}
