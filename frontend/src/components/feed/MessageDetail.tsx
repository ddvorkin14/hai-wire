import { useState, useEffect } from 'react';
import { GetMessageDetail, QueueMessage, ApproveMessage, UnrouteMessage } from '../../../wailsjs/go/main/App';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import type { TriageEvent } from '../../types';

interface ThreadReply {
  author: string;
  text: string;
  ts: string;
}

interface Props {
  event: TriageEvent;
  onClose: () => void;
  onUpdate: () => void;
}

export function MessageDetail({ event, onClose, onUpdate }: Props) {
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [permalink, setPermalink] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    setLoading(true);
    GetMessageDetail(event.message_ts).then((detail) => {
      setReplies(detail?.replies || []);
      setPermalink(detail?.permalink || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, [event.message_ts]);

  const handleAction = async (action: 'queue' | 'approve' | 'unroute') => {
    setActing(true);
    try {
      if (action === 'queue') await QueueMessage(event.message_ts);
      if (action === 'approve') await ApproveMessage(event.message_ts);
      if (action === 'unroute') await UnrouteMessage(event.message_ts);
      onUpdate();
    } catch {}
    setActing(false);
  };

  const pct = Math.round(event.confidence * 100);
  const categoryLabel = event.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const statusLabel = event.status || (event.routed ? 'approved' : 'classified');

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="w-[520px] bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-800">
          <h3 className="text-sm font-semibold">Message Detail</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Summary card */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">{event.author}</span>
              <ConfidenceBadge confidence={event.confidence} />
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                statusLabel === 'approved' ? 'bg-green-500/20 text-green-400' :
                statusLabel === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                statusLabel === 'rejected' ? 'bg-red-500/20 text-red-400' :
                'bg-slate-700 text-slate-400'
              }`}>{statusLabel}</span>
            </div>
            <div className="text-xs text-slate-500 mb-3">{categoryLabel}</div>
            <p className="text-sm text-slate-300 mb-3">{event.summary}</p>

            {/* Reasoning */}
            {event.reasoning && (
              <div className={`rounded px-3 py-2 text-xs mb-3 ${
                pct >= 80 ? 'bg-green-900/20 border border-green-800/30 text-green-400/80' :
                pct >= 50 ? 'bg-yellow-900/20 border border-yellow-800/30 text-yellow-400/80' :
                'bg-red-900/20 border border-red-800/30 text-red-400/80'
              }`}>
                <span className="font-medium">Why {pct}%:</span> {event.reasoning}
              </div>
            )}

            {/* Links */}
            {permalink && (
              <a href={permalink} target="_blank" rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 underline">
                View in Slack
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="p-5 border-b border-slate-800">
            <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Actions</h4>
            <div className="flex gap-2">
              {!event.routed && statusLabel !== 'pending' && (
                <button onClick={() => handleAction('queue')} disabled={acting}
                  className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-medium px-3 py-1.5 rounded">
                  Send to Queue
                </button>
              )}
              {statusLabel === 'pending' && (
                <button onClick={() => handleAction('approve')} disabled={acting}
                  className="bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-medium px-3 py-1.5 rounded">
                  Approve & Route
                </button>
              )}
              {event.routed && (
                <button onClick={() => handleAction('unroute')} disabled={acting}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium px-3 py-1.5 rounded">
                  Undo Route
                </button>
              )}
            </div>
          </div>

          {/* Thread */}
          <div className="p-5 border-b border-slate-800">
            <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">
              Thread ({loading ? '...' : replies.length} {replies.length === 1 ? 'reply' : 'replies'})
            </h4>
            {loading ? (
              <p className="text-xs text-slate-600">Loading thread...</p>
            ) : replies.length === 0 ? (
              <p className="text-xs text-slate-600">No replies yet.</p>
            ) : (
              <div className="space-y-3">
                {replies.map((r, i) => (
                  <div key={r.ts || i} className="bg-slate-800 rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-300">{r.author}</span>
                    </div>
                    <p className="text-xs text-slate-400 whitespace-pre-wrap">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="p-5 border-b border-slate-800">
            <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Analytics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 rounded p-3">
                <div className="text-lg font-bold">{pct}%</div>
                <div className="text-xs text-slate-500">Confidence</div>
              </div>
              <div className="bg-slate-800 rounded p-3">
                <div className="text-lg font-bold">{replies.length}</div>
                <div className="text-xs text-slate-500">Thread Replies</div>
              </div>
              <div className="bg-slate-800 rounded p-3">
                <div className="text-sm font-medium text-slate-300 truncate">{categoryLabel}</div>
                <div className="text-xs text-slate-500">Category</div>
              </div>
              <div className="bg-slate-800 rounded p-3">
                <div className="text-sm font-medium text-slate-300 capitalize">{statusLabel}</div>
                <div className="text-xs text-slate-500">Status</div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-5">
            <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Suggested Next Steps</h4>
            <div className="space-y-2">
              {statusLabel === 'classified' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">1.</span>
                    <span>Review the classification and confidence reasoning above</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">2.</span>
                    <span>If this belongs to your squad, click "Send to Queue"</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">3.</span>
                    <span>If not, no action needed -- it will stay in the feed for reference</span>
                  </div>
                </>
              )}
              {statusLabel === 'pending' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">1.</span>
                    <span>Review the thread for additional context</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">2.</span>
                    <span>Click "Approve & Route" to post to your triage channel with @mention</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">3.</span>
                    <span>Or head to the Review Queue tab to batch-approve pending items</span>
                  </div>
                </>
              )}
              {statusLabel === 'approved' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-green-400 mt-0.5">&#10003;</span>
                    <span>This request has been routed to your triage channel</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">1.</span>
                    <span>Check the thread for updates from your team</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-amber-400 mt-0.5">2.</span>
                    <span>If routed incorrectly, click "Undo Route"</span>
                  </div>
                </>
              )}
              {statusLabel === 'rejected' && (
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-slate-500 mt-0.5">--</span>
                  <span>This request was skipped. No action needed.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
