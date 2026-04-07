import { useState, useRef, useEffect, useCallback } from 'react';
import { SearchMentionTargets } from '../../../wailsjs/go/main/App';

interface MentionTarget {
  id: string;
  name: string;
  type: string;
  title: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function PingTargetPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<MentionTarget[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedName, setSelectedName] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  const doSearch = useCallback(async (query: string, newOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const result = await SearchMentionTargets(query, newOffset);
      if (result) {
        setResults((prev) => append ? [...prev, ...result.items] : (result.items || []));
        setTotal(result.total);
        setOffset(newOffset + (result.items?.length || 0));
      }
    } catch {}
    setLoading(false);
  }, []);

  const handleSearch = (query: string) => {
    setSearch(query);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setResults([]);
      setOffset(0);
      doSearch(query, 0, false);
    }, 200);
  };

  const handleFocus = () => {
    setOpen(true);
    if (results.length === 0) {
      doSearch(search, 0, false);
    }
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      if (offset < total) {
        doSearch(search, offset, true);
      }
    }
  };

  const handleSelect = (target: MentionTarget) => {
    setSelectedName(target.name);
    setSearch('');
    setOpen(false);
    onChange(target.id);
  };

  const handleClear = () => {
    setSelectedName('');
    onChange('');
  };

  // Show selected
  if (value) {
    return (
      <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2">
        <span className="text-sm text-amber-400 flex-1">{selectedName || value}</span>
        <button onClick={handleClear} className="text-slate-500 hover:text-red-400 text-xs">Change</button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleFocus}
        placeholder="Search users and groups..."
        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />

      {open && (
        <div ref={listRef} onScroll={handleScroll}
          className="absolute z-20 w-full mt-1 bg-slate-700 border border-slate-600 rounded shadow-lg max-h-60 overflow-y-auto">
          {results.length === 0 && !loading && (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              {search ? 'No results' : 'Type to search...'}
            </div>
          )}
          {results.map((t) => (
            <button key={`${t.type}-${t.id}`} onClick={() => handleSelect(t)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-600 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 truncate">{t.name}</div>
                {t.title && <div className="text-xs text-slate-500 truncate">{t.title}</div>}
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                t.type === 'group' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
              }`}>{t.type}</span>
            </button>
          ))}
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-500 text-center">Loading...</div>
          )}
          {!loading && results.length > 0 && offset < total && (
            <div className="px-3 py-1.5 text-xs text-slate-600 text-center border-t border-slate-600">
              Showing {results.length} of {total} — scroll for more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
