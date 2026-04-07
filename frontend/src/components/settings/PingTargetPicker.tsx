import { useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function PingTargetPicker({ value, onChange }: Props) {
  const [editing, setEditing] = useState(!value);
  const [input, setInput] = useState(value || '');

  const handleSave = () => {
    const cleaned = input.trim().replace(/^@/, '');
    if (cleaned) {
      onChange(cleaned);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  if (!editing && value) {
    return (
      <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2">
        <span className="text-sm text-amber-400 flex-1">@{value}</span>
        <button onClick={() => { setEditing(true); setInput(value); }}
          className="text-slate-500 hover:text-slate-300 text-xs">Edit</button>
        <button onClick={() => { onChange(''); setInput(''); setEditing(true); }}
          className="text-slate-500 hover:text-red-400 text-xs">Clear</button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., hai-conversion-on-call"
        autoFocus
        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />
      <button onClick={handleSave} disabled={!input.trim()}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 text-xs font-medium px-3 py-2 rounded">
        Set
      </button>
    </div>
  );
}
