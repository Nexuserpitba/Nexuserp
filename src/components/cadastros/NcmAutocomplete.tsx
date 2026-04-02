import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Database, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NcmItem {
  ncm: string;
  descricao: string;
  cest: string;
  mva: number;
  fonte: "local" | "web";
}

interface NcmAutocompleteProps {
  value: string;
  ncmTable: NcmItem[];
  onSelect: (item: NcmItem) => void;
  onChange: (value: string) => void;
  placeholder?: string;
}

// ── Local cache with TTL ──
const NCM_CACHE_KEY = "ncm_autocomplete_cache";
const NCM_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
const MAX_CACHE_ENTRIES = 200;

interface CacheEntry {
  results: NcmItem[];
  ts: number;
}
type CacheStore = Record<string, CacheEntry>;

function readCache(): CacheStore {
  try {
    const raw = localStorage.getItem(NCM_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeCache(store: CacheStore) {
  try {
    // Evict oldest entries if over limit
    const keys = Object.keys(store);
    if (keys.length > MAX_CACHE_ENTRIES) {
      keys.sort((a, b) => store[a].ts - store[b].ts);
      for (let i = 0; i < keys.length - MAX_CACHE_ENTRIES; i++) delete store[keys[i]];
    }
    localStorage.setItem(NCM_CACHE_KEY, JSON.stringify(store));
  } catch { /* quota exceeded – ignore */ }
}

function getCached(term: string): NcmItem[] | null {
  const store = readCache();
  const entry = store[term.toLowerCase()];
  if (entry && Date.now() - entry.ts < NCM_CACHE_TTL) return entry.results;
  return null;
}

function setCache(term: string, results: NcmItem[]) {
  const store = readCache();
  store[term.toLowerCase()] = { results, ts: Date.now() };
  writeCache(store);
}

export function NcmAutocomplete({ value, ncmTable, onSelect, onChange, placeholder = "Digite NCM ou descrição..." }: NcmAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [webResults, setWebResults] = useState<NcmItem[]>([]);
  const [loadingWeb, setLoadingWeb] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const localResults = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const terms = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean);
    return ncmTable.filter(n => {
      const desc = n.descricao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return terms.every(t => n.ncm.includes(t) || desc.includes(t));
    }).slice(0, 30);
  }, [query, ncmTable]);

  const searchWeb = useCallback(async (term: string) => {
    if (term.length < 3) return;

    // Check cache first
    const cached = getCached(term);
    if (cached) {
      setWebResults(cached);
      return;
    }

    setLoadingWeb(true);
    try {
      const isCode = /^\d+$/.test(term.replace(/\./g, ""));
      const body = isCode ? { codigo: term.replace(/\./g, "") } : { descricao: term };
      const { data, error } = await supabase.functions.invoke("fetch-ncm-web", { body });
      if (!error && data?.success && data.data) {
        const mapped: NcmItem[] = data.data.map((r: any) => ({
          ncm: r.codigo || r.ncm || "",
          descricao: r.descricao || "",
          cest: "",
          mva: 0,
          fonte: "web" as const,
        }));
        setWebResults(mapped);
        setCache(term, mapped);
      }
    } catch { /* ignore */ } finally {
      setLoadingWeb(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 3) {
      debounceRef.current = setTimeout(() => searchWeb(val), 600);
    }
  };

  const results = useMemo(() => {
    const map = new Map<string, NcmItem>();
    for (const r of localResults) map.set(r.ncm, r);
    for (const r of webResults) { if (!map.has(r.ncm)) map.set(r.ncm, r); }
    return Array.from(map.values()).slice(0, 40);
  }, [localResults, webResults]);

  const handleSelect = (item: NcmItem) => {
    onSelect(item);
    setQuery(item.ncm);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <Input
        value={query || value}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => { if (query.length >= 2) setOpen(true); }}
        placeholder={placeholder}
        className="pl-8 pr-8"
      />
      {loadingWeb && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {results.map((item, idx) => (
            <button
              key={`${item.ncm}-${idx}`}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent/50 flex items-center gap-2 text-sm border-b border-border/30 last:border-0 transition-colors"
              onClick={() => handleSelect(item)}
            >
              <span className="font-mono font-semibold text-xs shrink-0 w-24">{item.ncm}</span>
              <span className="truncate flex-1 text-foreground">{item.descricao}</span>
              <Badge variant={item.fonte === "local" ? "default" : "secondary"} className="text-[10px] shrink-0">
                {item.fonte === "local" ? <Database size={10} className="mr-0.5" /> : <Globe size={10} className="mr-0.5" />}
                {item.fonte === "local" ? "Local" : "Web"}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
