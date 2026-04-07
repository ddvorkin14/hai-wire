import { useState, useEffect } from 'react';
import { GetProcessedMessages } from '../../../wailsjs/go/main/App';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import type { ProcessedMessage } from '../../types';

export function ActivityLog() {
  const [messages, setMessages] = useState<ProcessedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    GetProcessedMessages(200).then((msgs) => {
      setMessages(msgs || []);
      setLoading(false);
    });
  }, []);

  const routed = messages.filter((m) => m.Routed);
  const avgConfidence = routed.length > 0
    ? routed.reduce((sum, m) => sum + m.Confidence, 0) / routed.length
    : 0;

  return (
    <div className="h-full flex flex-col p-6">
      <h2 className="text-lg font-semibold mb-4">Activity Log</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold">{messages.length}</div>
          <div className="text-xs text-slate-400">Processed</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-amber-400">{routed.length}</div>
          <div className="text-xs text-slate-400">Routed</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold">{Math.round(avgConfidence * 100)}%</div>
          <div className="text-xs text-slate-400">Avg Confidence</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-500 text-sm text-center mt-12">No messages processed yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-700">
              <tr>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Author</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Confidence</th>
                <th className="pb-2 pr-4">Summary</th>
                <th className="pb-2">Routed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {messages.map((msg) => (
                <tr key={msg.ID} className="hover:bg-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{new Date(msg.CreatedAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">{msg.Author}</td>
                  <td className="py-2 pr-4 text-slate-400">{msg.Category}</td>
                  <td className="py-2 pr-4"><ConfidenceBadge confidence={msg.Confidence} /></td>
                  <td className="py-2 pr-4 text-slate-300 max-w-xs truncate">{msg.Summary}</td>
                  <td className="py-2">{msg.Routed ? '\u2713' : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
