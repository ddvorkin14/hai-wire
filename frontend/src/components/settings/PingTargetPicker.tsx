import { useState, useRef, useEffect, useMemo } from 'react';
import { LoadAllMentionTargets } from '../../../wailsjs/go/main/App';

interface MentionTarget {
  id: string;
  name: string;
  type: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function PingTargetPicker({ value, onChange }: Props) {
  const [allTargets, setAllTargets] = useState<MentionTarget[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load all targets once when dropdown first opens
  const loadTargets = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const targets = await LoadAllMentionTargets();
      setAllTargets(targets || []);
    } catch (e) {
      console.error('load targets:', e);
    }
    setLoading(false);
    setLoaded(true);
  };

  // Client-side filter -- instant, no API calls
  const filtered = useMemo(() => {
    if (!search) return allTargets;
    const q = search.toLowerCase();
    return allTargets.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  }, [allTargets, search]);

  const selectedTarget = useMemo(() => {
    return allTargets.find(t => t.id === value);
  }, [allTargets, value]);

  const handleFocus = () => {
    setOpen(true);
    loadTargets();
  };

  const handleSelect = (target: MentionTarget) => {
    onChange(target.id);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Show selected state
  if (value && (selectedTarget || !loaded)) {
    const displayName = selectedTarget
      ? `${selectedTarget.name} (${selectedTarget.type})`
      : value;
    return (
      <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2">
        <span className="text-sm text-amber-400 flex-1">{displayName}</span>
        <button onClick={handleClear} className="text-slate-500 hover:text-red-400 text-xs">Change</button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={handleFocus}
        placeholder={loading ? 'Loading users and groups...' : 'Search users and groups...'}
        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-slate-700 border border-slate-600 rounded shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              {search ? 'No results' : 'No users or groups found'}
            </div>
          ) : (
            filtered.slice(0, 30).map((t) => (
              <button key={`${t.type}-${t.id}`} onClick={() => handleSelect(t)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-600 flex items-center justify-between gap-2">
                <span className="text-slate-200 truncate">{t.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                  t.type === 'group' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>{t.type}</span>
              </button>
            ))
          )}
          {filtered.length > 30 && (
            <div className="px-3 py-1.5 text-xs text-slate-500 text-center border-t border-slate-600">
              {filtered.length - 30} more -- type to narrow results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
