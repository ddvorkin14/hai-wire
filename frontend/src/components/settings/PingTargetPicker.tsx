import { useState, useRef, useEffect } from 'react';
import { SearchMentionTargets, GetMentionGroups } from '../../../wailsjs/go/main/App';

interface MentionTarget {
  id: string;
  name: string;
  type: string;
}

interface Props {
  value: string;
  onChange: (id: string, displayName: string) => void;
}

export function PingTargetPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<MentionTarget[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cachedTargets, setCachedTargets] = useState<MentionTarget[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load all mention targets once on mount
  useEffect(() => {
    GetMentionGroups().then((targets) => {
      setCachedTargets(targets || []);
    }).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve selected name on mount if value exists
  useEffect(() => {
    if (value && !selectedName) {
      const found = cachedTargets.find(t => t.id === value);
      if (found) setSelectedName(`${found.name} (${found.type})`);
    }
  }, [value, cachedTargets]);

  const handleSearch = (query: string) => {
    setSearch(query);
    setShowDropdown(true);

    // Filter cached targets immediately for fast response
    if (cachedTargets.length > 0) {
      const q = query.toLowerCase();
      const filtered = q
        ? cachedTargets.filter(t =>
            t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
          )
        : cachedTargets;
      setResults(filtered);
    }

    // Debounce the API call for additional results
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const apiResults = await SearchMentionTargets(query);
        if (apiResults && apiResults.length > 0) {
          // Merge with cached, deduplicate by ID
          const seen = new Set(cachedTargets.map(t => t.id));
          const merged = [...cachedTargets];
          for (const r of apiResults) {
            if (!seen.has(r.id)) {
              seen.add(r.id);
              merged.push(r);
            }
          }
          setCachedTargets(merged);

          // Re-filter
          const q = query.toLowerCase();
          const filtered = q
            ? merged.filter(t =>
                t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
              )
            : merged;
          setResults(filtered);
        }
      } catch {}
      setLoading(false);
    }, 300);
  };

  const handleSelect = (target: MentionTarget) => {
    const displayName = `${target.name} (${target.type})`;
    setSelectedName(displayName);
    setSearch('');
    setShowDropdown(false);
    setResults([]);
    onChange(target.id, displayName);
  };

  const handleClear = () => {
    setSelectedName('');
    setSearch('');
    onChange('', '');
  };

  if (value && selectedName) {
    return (
      <div>
        <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2">
          <span className="text-sm text-amber-400 flex-1">{selectedName}</span>
          <button onClick={handleClear} className="text-slate-500 hover:text-red-400 text-xs">Clear</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => handleSearch(search)}
        placeholder="Type to search users and groups..."
        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-slate-500">...</span>
      )}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-slate-700 border border-slate-600 rounded shadow-lg max-h-48 overflow-y-auto">
          {results.map((t) => (
            <button key={t.id} onClick={() => handleSelect(t)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-600 flex items-center justify-between">
              <span className="text-slate-200 truncate">{t.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                t.type === 'group' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
              }`}>{t.type}</span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && results.length === 0 && !loading && search.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-slate-700 border border-slate-600 rounded shadow-lg p-3">
          <p className="text-xs text-slate-500">No results found</p>
        </div>
      )}
    </div>
  );
}
