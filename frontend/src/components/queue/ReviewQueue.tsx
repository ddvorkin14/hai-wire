import { useState, useEffect } from 'react';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import {
  GetPendingMessages, ApproveMessage, RejectMessage,
  GetAutoApprovalRules, SaveAutoApprovalRule, DeleteAutoApprovalRule,
  GetAllCategories,
} from '../../../wailsjs/go/main/App';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import type { ProcessedMessage, AutoApprovalRule, Category, TriageEvent } from '../../types';

export function ReviewQueue() {
  const [pending, setPending] = useState<ProcessedMessage[]>([]);
  const [rules, setRules] = useState<AutoApprovalRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [newRuleCat, setNewRuleCat] = useState('');
  const [newRuleConf, setNewRuleConf] = useState(80);
  const [approving, setApproving] = useState<Record<string, boolean>>({});

  const refresh = () => {
    GetPendingMessages().then((msgs) => setPending(msgs || []));
    GetAutoApprovalRules().then((r) => setRules(r || []));
  };

  useEffect(() => {
    refresh();
    GetAllCategories().then((cats) => setCategories(cats || []));
    EventsOn('triage:event', (event: TriageEvent) => {
      if (event.status === 'pending') refresh();
    });
  }, []);

  const handleApprove = async (ts: string) => {
    setApproving((prev) => ({ ...prev, [ts]: true }));
    await ApproveMessage(ts);
    refresh();
  };

  const handleReject = async (ts: string) => {
    await RejectMessage(ts);
    refresh();
  };

  const handleApproveAll = async () => {
    for (const msg of pending) {
      await ApproveMessage(msg.MessageTS);
    }
    refresh();
  };

  const handleAddRule = async () => {
    await SaveAutoApprovalRule(newRuleCat, newRuleConf / 100, true);
    setShowRuleForm(false);
    setNewRuleCat('');
    setNewRuleConf(80);
    refresh();
  };

  const handleDeleteRule = async (id: number) => {
    await DeleteAutoApprovalRule(id);
    refresh();
  };

  const getCategoryName = (key: string) => {
    if (!key) return 'All categories';
    const cat = categories.find(c => c.Key === key);
    return cat ? cat.Name : key.replace(/_/g, ' ');
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Review Queue</h2>
          {pending.length > 0 && (
            <span className="bg-amber-400/20 text-amber-400 text-xs font-medium px-2 py-0.5 rounded">
              {pending.length} pending
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {pending.length > 1 && (
            <button onClick={handleApproveAll}
              className="bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-medium px-3 py-1.5 rounded">
              Approve All ({pending.length})
            </button>
          )}
          <button onClick={() => setShowRuleForm(!showRuleForm)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium px-3 py-1.5 rounded">
            {showRuleForm ? 'Cancel' : 'Auto-Approval Rules'}
          </button>
        </div>
      </div>

      {/* Auto-approval rules panel */}
      {showRuleForm && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Auto-Approval Rules</h3>
          <p className="text-xs text-slate-500 mb-3">
            Messages matching these rules will be auto-queued for review.
          </p>

          {/* Existing rules */}
          {rules.length > 0 && (
            <div className="space-y-2 mb-3">
              {rules.map((rule) => (
                <div key={rule.ID} className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2">
                  <span className="text-sm text-slate-300">
                    {getCategoryName(rule.CategoryKey)} at {Math.round(rule.MinConfidence * 100)}%+
                  </span>
                  <button onClick={() => handleDeleteRule(rule.ID)}
                    className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}

          {/* Add new rule */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Category</label>
              <select value={newRuleCat} onChange={(e) => setNewRuleCat(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400 text-slate-300">
                <option value="">All categories</option>
                {categories.map(c => (
                  <option key={c.Key} value={c.Key}>{c.Name}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-slate-500 mb-1">Min confidence</label>
              <div className="flex items-center gap-2">
                <input type="range" min={10} max={100} value={newRuleConf}
                  onChange={(e) => setNewRuleConf(Number(e.target.value))}
                  className="flex-1 accent-amber-400" />
                <span className="text-xs text-slate-400 w-8">{newRuleConf}%</span>
              </div>
            </div>
            <button onClick={handleAddRule}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-medium px-3 py-1.5 rounded">
              Add Rule
            </button>
          </div>
        </div>
      )}

      {/* Pending messages */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {pending.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-slate-500 text-sm">No messages awaiting review.</p>
            <p className="text-slate-600 text-xs mt-1">Messages that match your categories will appear here for approval before being routed.</p>
          </div>
        ) : (
          pending.map((msg) => {
            const pct = Math.round(msg.Confidence * 100);
            const categoryLabel = msg.Category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return (
              <div key={msg.MessageTS} className="bg-slate-800 rounded-lg border border-amber-400/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{msg.Author}</span>
                    <ConfidenceBadge confidence={msg.Confidence} />
                    <span className="text-xs text-slate-500">{categoryLabel}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(msg.MessageTS)}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium px-3 py-1 rounded">
                      Skip
                    </button>
                    <button onClick={() => handleApprove(msg.MessageTS)}
                      disabled={approving[msg.MessageTS]}
                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 text-xs font-medium px-3 py-1 rounded">
                      {approving[msg.MessageTS] ? 'Routing...' : 'Approve & Route'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-2">{msg.Summary}</p>
                {msg.Reasoning && (
                  <div className={`rounded px-3 py-2 text-xs ${
                    pct >= 80 ? 'bg-green-900/20 border border-green-800/30 text-green-400/80' :
                    pct >= 50 ? 'bg-yellow-900/20 border border-yellow-800/30 text-yellow-400/80' :
                    'bg-red-900/20 border border-red-800/30 text-red-400/80'
                  }`}>
                    <span className="font-medium">Why {pct}%:</span> {msg.Reasoning}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
