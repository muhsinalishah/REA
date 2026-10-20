import React, { useState, useMemo } from 'react';
import {
  FileCode2,
  Binary,
  Layers,
  Search,
  Database,
  Code2,
  Table,
  Upload,
  Play,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  Cpu,
  Hash,
  Filter,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { TargetAnalysis, SampleTarget, DisassemblyInstruction } from '../types/rea';

interface TargetWorkbenchProps {
  analysis: TargetAnalysis | null;
  loading: boolean;
  samples: SampleTarget[];
  onSelectSample: (sample: SampleTarget) => void;
  onUploadCustom: (file: File) => void;
  onSendToAiReconstructor: (snippet: string) => void;
  onRunSqliteQuery: (query: string) => Promise<{ columns: string[]; rows: any[]; error?: string }>;
}

export type FilterCategory = 'all' | 'functions' | 'sections' | 'instructions' | 'strings';

export const TargetWorkbench: React.FC<TargetWorkbenchProps> = ({
  analysis,
  loading,
  samples,
  onSelectSample,
  onUploadCustom,
  onSendToAiReconstructor,
  onRunSqliteQuery,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'structure' | 'disassembly' | 'strings' | 'sqlite' | 'evidence'>('structure');
  const [stringFilter, setStringFilter] = useState('');
  const [copied, setCopied] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

  // SQLite query state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM access_tokens LIMIT 10;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[]; error?: string } | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const handleCopyEvidence = () => {
    if (!analysis?.evidenceRecord) return;
    navigator.clipboard.writeText(JSON.stringify(analysis.evidenceRecord, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunQuery = async () => {
    setQueryLoading(true);
    try {
      const res = await onRunSqliteQuery(sqlQuery);
      setQueryResult(res);
    } finally {
      setQueryLoading(false);
    }
  };

  // Helper: Extract discovered functions from all analysis formats
  const discoveredFunctions = useMemo(() => {
    const list: Array<{ name: string; kind: string; detail?: string; subTab: 'structure' | 'disassembly' | 'sqlite' }> = [];
    if (!analysis?.specializedAnalysis) return list;

    // WASM exports
    if (analysis.specializedAnalysis.exports) {
      for (const exp of analysis.specializedAnalysis.exports) {
        list.push({
          name: exp.name,
          kind: `WASM ${exp.kind}`,
          detail: `Index: ${exp.index}`,
          subTab: 'structure',
        });
      }
    }

    // EVM selectors
    if (analysis.specializedAnalysis.detectedSelectors) {
      for (const sel of analysis.specializedAnalysis.detectedSelectors) {
        list.push({
          name: sel.signature || sel.selector,
          kind: 'EVM Method',
          detail: `Selector: ${sel.selector} at 0x${sel.offset.toString(16)}`,
          subTab: 'structure',
        });
      }
    }

    // JS Code functions
    if (analysis.specializedAnalysis.codePreview) {
      const code = analysis.specializedAnalysis.codePreview;
      const fnRegex = /(?:function\s+([a-zA-Z0-9_$]+)|exports\.([a-zA-Z0-9_$]+)\s*=|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\())/g;
      let match;
      const seen = new Set<string>();
      while ((match = fnRegex.exec(code)) !== null) {
        const fnName = match[1] || match[2] || match[3];
        if (fnName && !seen.has(fnName)) {
          seen.add(fnName);
          list.push({
            name: fnName,
            kind: 'JS Function',
            detail: 'Recovered JS Bundle definition',
            subTab: 'structure',
          });
        }
      }
    }

    // SQLite Tables
    if (analysis.specializedAnalysis.tables) {
      for (const t of analysis.specializedAnalysis.tables) {
        list.push({
          name: t.name,
          kind: 'SQLite Table',
          detail: `${t.rowCount} rows, ${t.columns?.length || 0} columns`,
          subTab: 'sqlite',
        });
      }
    }

    return list;
  }, [analysis]);

  // Compute matches across all categories
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        hasQuery: false,
        functions: [],
        sections: [],
        instructions: [],
        strings: [],
        totalMatches: 0,
      };
    }

    // 1. Matching Functions
    const matchingFns = (filterCategory === 'all' || filterCategory === 'functions')
      ? discoveredFunctions.filter((f) => f.name.toLowerCase().includes(q) || f.kind.toLowerCase().includes(q))
      : [];

    // 2. Matching Sections & Tables
    let matchingSections: Array<{ name: string; type: string; subTab: 'structure' | 'sqlite' }> = [];
    if (filterCategory === 'all' || filterCategory === 'sections') {
      // WASM sections
      if (analysis?.specializedAnalysis?.sections) {
        for (const sec of analysis.specializedAnalysis.sections) {
          if (sec.name.toLowerCase().includes(q) || `0x${sec.id.toString(16)}`.includes(q)) {
            matchingSections.push({ name: sec.name, type: 'WASM Section', subTab: 'structure' });
          }
        }
      }
      // SQLite tables
      if (analysis?.specializedAnalysis?.tables) {
        for (const tbl of analysis.specializedAnalysis.tables) {
          if (tbl.name.toLowerCase().includes(q) || tbl.columns?.some((c: any) => c.name.toLowerCase().includes(q))) {
            matchingSections.push({ name: tbl.name, type: 'SQLite Table', subTab: 'sqlite' });
          }
        }
      }
    }

    // 3. Matching Instructions
    let matchingInstructions: DisassemblyInstruction[] = [];
    if ((filterCategory === 'all' || filterCategory === 'instructions') && analysis?.specializedAnalysis?.instructions) {
      matchingInstructions = analysis.specializedAnalysis.instructions.filter(
        (ins) =>
          ins.mnemonic.toLowerCase().includes(q) ||
          ins.opcode.toLowerCase().includes(q) ||
          (ins.arg && ins.arg.toLowerCase().includes(q)) ||
          `0x${ins.offset.toString(16)}`.includes(q)
      );
    }

    // 4. Matching Strings
    let matchingStrings: Array<{ offset: number; string: string }> = [];
    if ((filterCategory === 'all' || filterCategory === 'strings') && analysis?.stringsSample) {
      matchingStrings = analysis.stringsSample.filter((s) => s.string.toLowerCase().includes(q));
    }

    const totalMatches =
      matchingFns.length + matchingSections.length + matchingInstructions.length + matchingStrings.length;

    return {
      hasQuery: true,
      functions: matchingFns,
      sections: matchingSections,
      instructions: matchingInstructions,
      strings: matchingStrings,
      totalMatches,
    };
  }, [searchQuery, filterCategory, discoveredFunctions, analysis]);

  // Jump to specific item from search
  const handleQuickJump = (item: { name: string; subTab: 'structure' | 'disassembly' | 'sqlite' | 'strings' }) => {
    setActiveSubTab(item.subTab);
    setHighlightedItem(item.name);
    setTimeout(() => {
      setHighlightedItem(null);
    }, 4000);
  };

  const displayedStrings = useMemo(() => {
    const raw = analysis?.stringsSample || [];
    const term = (searchQuery || stringFilter).trim().toLowerCase();
    if (!term) return raw;
    return raw.filter((s) => s.string.toLowerCase().includes(term));
  }, [analysis, searchQuery, stringFilter]);

  return (
    <div className="space-y-6">
      {/* Target Selector Banner */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                Loaded Target
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {analysis?.formatInfo?.format || 'Analyzing...'}
              </span>
              {analysis?.formatInfo?.arch && (
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                  {analysis.formatInfo.arch}
                </span>
              )}
            </div>
            <h2 className="text-lg font-mono font-bold text-slate-100 mt-1 flex items-center gap-2">
              <Binary className="w-5 h-5 text-cyan-400" />
              {analysis?.filename || 'No target selected'}
              <span className="text-xs font-normal text-slate-400 font-mono">
                ({((analysis?.fileSize || 0) / 1024).toFixed(2)} KB)
              </span>
            </h2>
          </div>

          {/* Quick Sample Target Chips & Upload */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 mr-1">Load sample:</span>
            {samples.map((s) => (
              <button
                key={s.filename}
                onClick={() => onSelectSample(s)}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
                  analysis?.filename === s.filename
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {s.type.toUpperCase()}: {s.filename.split('.')[0]}
              </button>
            ))}

            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md shadow-cyan-600/20 transition-all">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadCustom(f);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      {analysis && (
        <div className="bg-[#0b101b] border border-cyan-950/80 rounded-xl p-3.5 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search code sections, functions, tables, or opcodes (e.g. transfer, computeHash, CRC16)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-[#060a12] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#060a12] border border-slate-800 rounded-lg px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <select
                  aria-label="Filter Analysis by Category"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
                  className="bg-transparent text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    All Items ({discoveredFunctions.length + (analysis.stringsCount || 0)})
                  </option>
                  <option value="functions" className="bg-slate-900 text-slate-200">
                    Functions &amp; Methods ({discoveredFunctions.filter(f => f.kind.includes('Method') || f.kind.includes('Function') || f.kind.includes('func')).length})
                  </option>
                  <option value="sections" className="bg-slate-900 text-slate-200">
                    Sections &amp; Tables ({((analysis.specializedAnalysis?.sections?.length || 0) + (analysis.specializedAnalysis?.tables?.length || 0))})
                  </option>
                  <option value="instructions" className="bg-slate-900 text-slate-200">
                    Disassembly &amp; Opcodes ({analysis.specializedAnalysis?.instructions?.length || 0})
                  </option>
                  <option value="strings" className="bg-slate-900 text-slate-200">
                    Extracted Strings ({analysis.stringsCount || 0})
                  </option>
                </select>
              </div>

              {searchQuery && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800 shrink-0">
                  {searchResults.totalMatches} match{searchResults.totalMatches === 1 ? '' : 'es'}
                </span>
              )}
            </div>
          </div>

          {/* Quick Jump Badges / Matching preview */}
          {searchResults.hasQuery && (
            <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px] mr-1">Quick Jump:</span>
              {searchResults.functions.slice(0, 6).map((fn, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickJump({ name: fn.name, subTab: fn.subTab })}
                  className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 hover:bg-purple-900 border border-purple-800/80 flex items-center gap-1 text-[11px] transition-all"
                >
                  <Code2 className="w-3 h-3 text-purple-400" />
                  <span>{fn.name}</span>
                  <span className="text-[9px] text-purple-400">({fn.kind})</span>
                </button>
              ))}
              {searchResults.sections.slice(0, 4).map((sec, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickJump({ name: sec.name, subTab: sec.subTab })}
                  className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 hover:bg-cyan-900 border border-cyan-800/80 flex items-center gap-1 text-[11px] transition-all"
                >
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>{sec.name}</span>
                  <span className="text-[9px] text-cyan-400">({sec.type})</span>
                </button>
              ))}
              {searchResults.instructions.length > 0 && (
                <button
                  onClick={() => setActiveSubTab('disassembly')}
                  className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/80 flex items-center gap-1 text-[11px] transition-all"
                >
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  <span>{searchResults.instructions.length} Opcodes</span>
                </button>
              )}
              {searchResults.strings.length > 0 && (
                <button
                  onClick={() => setActiveSubTab('strings')}
                  className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-800/80 flex items-center gap-1 text-[11px] transition-all"
                >
                  <Hash className="w-3 h-3 text-amber-400" />
                  <span>{searchResults.strings.length} Strings</span>
                </button>
              )}
              {searchResults.totalMatches === 0 && (
                <span className="text-slate-500 text-[11px]">No items matched query "{searchQuery}"</span>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-[#0d131f] border border-cyan-950/60 rounded-xl">
          <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-mono text-cyan-300">Running REA Inspection Pipeline...</p>
          <p className="text-xs font-mono text-slate-500 mt-1">Extracting sections, strings, opcodes, and Evidence ledger</p>
        </div>
      ) : analysis ? (
        <div className="bg-[#0b101b] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-800 bg-[#080d16] px-3 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveSubTab('structure')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono border-b-2 transition-all ${
                activeSubTab === 'structure'
                  ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Structure & Sections</span>
            </button>

            <button
              onClick={() => setActiveSubTab('disassembly')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono border-b-2 transition-all ${
                activeSubTab === 'disassembly'
                  ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Disassembly / Code</span>
              {analysis.specializedAnalysis?.instructions && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {analysis.specializedAnalysis.instructions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('strings')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono border-b-2 transition-all ${
                activeSubTab === 'strings'
                  ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Extracted Strings</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {analysis.stringsCount}
              </span>
            </button>

            {analysis.specializedAnalysis?.type === 'sqlite' && (
              <button
                onClick={() => setActiveSubTab('sqlite')}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono border-b-2 transition-all ${
                  activeSubTab === 'sqlite'
                    ? 'border-emerald-400 text-emerald-300 font-semibold bg-emerald-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>SQLite Query Explorer</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('evidence')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono border-b-2 transition-all ${
                activeSubTab === 'evidence'
                  ? 'border-amber-400 text-amber-300 font-semibold bg-amber-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>REA Evidence Record</span>
            </button>
          </div>

          {/* Sub Tab Content */}
          <div className="p-5">
            {/* 1. Structure & Sections */}
            {activeSubTab === 'structure' && (
              <div className="space-y-6">
                {/* Format summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#0f172a] border border-slate-800 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Binary Format</span>
                    <p className="text-sm font-mono font-bold text-slate-100 mt-0.5">{analysis.formatInfo.format}</p>
                  </div>
                  <div className="p-3 bg-[#0f172a] border border-slate-800 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Architecture / Bits</span>
                    <p className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                      {analysis.formatInfo.arch} {analysis.formatInfo.bits ? `(${analysis.formatInfo.bits}-bit)` : ''}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0f172a] border border-slate-800 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Endianness</span>
                    <p className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                      {analysis.formatInfo.endianness || 'Little Endian'}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0f172a] border border-slate-800 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Authority Level</span>
                    <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                      {analysis.evidenceRecord?.authority || 'shipped-artifact'}
                    </p>
                  </div>
                </div>

                {/* WASM Sections & Exports */}
                {analysis.specializedAnalysis?.type === 'wasm' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-mono font-semibold text-cyan-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        WebAssembly Section Inventory
                      </h3>
                      {searchQuery && (
                        <span className="text-[10px] font-mono text-cyan-400">
                          Filtered by "{searchQuery}"
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#090e17] text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Section ID</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Offset</th>
                            <th className="py-2.5 px-3">Size (bytes)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-[#0f172a]/60">
                          {analysis.specializedAnalysis.sections
                            ?.filter((sec) => {
                              if (!searchQuery) return true;
                              if (filterCategory !== 'all' && filterCategory !== 'sections') return true;
                              const q = searchQuery.toLowerCase();
                              return sec.name.toLowerCase().includes(q) || `0x${sec.id.toString(16)}`.includes(q);
                            })
                            .map((sec, i) => {
                              const isHighlighted = highlightedItem && sec.name.toLowerCase().includes(highlightedItem.toLowerCase());
                              return (
                                <tr
                                  key={i}
                                  className={`transition-colors ${
                                    isHighlighted
                                      ? 'bg-cyan-500/20 border-l-2 border-cyan-400'
                                      : 'hover:bg-cyan-950/20'
                                  }`}
                                >
                                  <td className="py-2 px-3 text-cyan-400">0x{sec.id.toString(16).padStart(2, '0')}</td>
                                  <td className="py-2 px-3 text-slate-200 font-semibold">{sec.name}</td>
                                  <td className="py-2 px-3 text-slate-400">0x{sec.offset.toString(16)}</td>
                                  <td className="py-2 px-3 text-slate-300">{sec.size} B</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {analysis.specializedAnalysis.exports && analysis.specializedAnalysis.exports.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-mono font-semibold text-slate-300 mb-2">Exported Functions & Memory</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.specializedAnalysis.exports
                            ?.filter((exp) => {
                              if (!searchQuery) return true;
                              if (filterCategory !== 'all' && filterCategory !== 'functions') return true;
                              const q = searchQuery.toLowerCase();
                              return exp.name.toLowerCase().includes(q) || exp.kind.toLowerCase().includes(q);
                            })
                            .map((exp, i) => {
                              const isHighlighted = highlightedItem && exp.name.toLowerCase().includes(highlightedItem.toLowerCase());
                              return (
                                <div
                                  key={i}
                                  className={`px-3 py-1.5 rounded border transition-all flex items-center gap-2 ${
                                    isHighlighted
                                      ? 'bg-cyan-950 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                                      : 'bg-slate-900 border-cyan-900/60'
                                  }`}
                                >
                                  <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300">
                                    {exp.kind}
                                  </span>
                                  <span className="text-xs font-mono text-cyan-200 font-semibold">{exp.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">idx: {exp.index}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* EVM Function Selector Table */}
                {analysis.specializedAnalysis?.type === 'evm' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-mono font-semibold text-purple-300 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-purple-400" />
                        EVM Dispatch Table & Identified Function Selectors
                      </h3>
                      {searchQuery && (
                        <span className="text-[10px] font-mono text-purple-400">
                          Filtered by "{searchQuery}"
                        </span>
                      )}
                    </div>
                    {analysis.specializedAnalysis.detectedSelectors && analysis.specializedAnalysis.detectedSelectors.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#090e17] text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-3">Selector (4-byte)</th>
                              <th className="py-2 px-3">Resolved ABI Signature</th>
                              <th className="py-2 px-3">Bytecode Offset</th>
                              <th className="py-2 px-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-[#0f172a]/60">
                            {analysis.specializedAnalysis.detectedSelectors
                              ?.filter((sel) => {
                                if (!searchQuery) return true;
                                if (filterCategory !== 'all' && filterCategory !== 'functions') return true;
                                const q = searchQuery.toLowerCase();
                                return sel.selector.toLowerCase().includes(q) || (sel.signature && sel.signature.toLowerCase().includes(q));
                              })
                              .map((sel, i) => {
                                const isHighlighted = highlightedItem && (sel.signature?.toLowerCase().includes(highlightedItem.toLowerCase()) || sel.selector.toLowerCase().includes(highlightedItem.toLowerCase()));
                                return (
                                  <tr
                                    key={i}
                                    className={`transition-colors ${
                                      isHighlighted
                                        ? 'bg-purple-950/50 border-l-2 border-purple-400'
                                        : 'hover:bg-purple-950/20'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 text-purple-400 font-bold">{sel.selector}</td>
                                    <td className="py-2.5 px-3 text-slate-100 font-medium">
                                      {sel.signature || 'Unresolved method'}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-400">0x{sel.offset.toString(16)}</td>
                                    <td className="py-2.5 px-3">
                                      <button
                                        onClick={() =>
                                          onSendToAiReconstructor(
                                            `Reverse engineer EVM method with selector ${sel.selector} (${sel.signature}) at bytecode offset 0x${sel.offset.toString(16)}`
                                          )
                                        }
                                        className="px-2 py-1 text-[11px] rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/50"
                                      >
                                        Reconstruct in AI
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs font-mono text-slate-400">No public ERC function selectors detected in dispatch preamble.</p>
                    )}
                  </div>
                )}

                {/* SQLite Table Schema */}
                {analysis.specializedAnalysis?.type === 'sqlite' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-mono font-semibold text-emerald-300 flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        Discovered Database Tables & Schema
                      </h3>
                      {searchQuery && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          Filtered by "{searchQuery}"
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.specializedAnalysis.tables
                        ?.filter((table) => {
                          if (!searchQuery) return true;
                          if (filterCategory !== 'all' && filterCategory !== 'sections' && filterCategory !== 'functions') return true;
                          const q = searchQuery.toLowerCase();
                          return table.name.toLowerCase().includes(q) || table.columns.some((c: any) => c.name.toLowerCase().includes(q));
                        })
                        .map((table, i) => {
                          const isHighlighted = highlightedItem && table.name.toLowerCase().includes(highlightedItem.toLowerCase());
                          return (
                            <div
                              key={i}
                              className={`border rounded-lg p-3.5 space-y-2 transition-all ${
                                isHighlighted
                                  ? 'bg-[#102220] border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                                  : 'bg-[#0f172a] border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono font-bold text-emerald-400">{table.name}</span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {table.rowCount} rows
                                </span>
                              </div>
                              <div className="text-xs font-mono space-y-1">
                                {table.columns.map((c: any) => (
                                  <div key={c.cid} className="flex items-center justify-between text-slate-300 py-0.5 border-b border-slate-800/40">
                                    <span>
                                      {c.name} {c.pk ? <span className="text-amber-400 font-bold">[PK]</span> : ''}
                                    </span>
                                    <span className="text-slate-400 uppercase text-[10px]">{c.type}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* JS Bundle Overview */}
                {analysis.specializedAnalysis?.type === 'javascript' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-mono font-semibold text-cyan-300 flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-cyan-400" />
                        Recovered JavaScript Bundle Code
                      </h3>
                      <button
                        onClick={() =>
                          onSendToAiReconstructor(
                            `Reverse engineer this JavaScript bundle feature: explain the license verification and security CRC16 algorithm.`
                          )
                        }
                        className="px-3 py-1 text-xs font-mono rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700"
                      >
                        Send to AI Reconstructor
                      </button>
                    </div>

                    {/* Quick Discovered Function Tags */}
                    {discoveredFunctions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#090e17] border border-slate-800 rounded-lg">
                        <span className="text-[11px] font-mono text-slate-400 mr-1">Discovered Functions:</span>
                        {discoveredFunctions.map((fn, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchQuery(fn.name);
                              setHighlightedItem(fn.name);
                            }}
                            className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-950/60 text-purple-300 hover:bg-purple-900 border border-purple-800/60 transition-colors flex items-center gap-1"
                          >
                            <Code2 className="w-3 h-3 text-purple-400" />
                            <span>{fn.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <pre className="p-4 bg-[#070b12] border border-slate-800 rounded-lg font-mono text-xs text-slate-200 overflow-x-auto max-h-[350px]">
                      {analysis.specializedAnalysis.codePreview}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 2. Disassembly / Instruction Viewer */}
            {activeSubTab === 'disassembly' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-mono font-semibold text-cyan-300 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Instruction Stream Disassembly
                    </h3>
                    {searchQuery && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {searchResults.instructions.length} matching opcodes
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      onSendToAiReconstructor(
                        `Reconstruct the algorithm and logic from the disassembled instruction sequence of ${analysis.filename}.`
                      )
                    }
                    className="px-3 py-1 text-xs font-mono rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700"
                  >
                    Reconstruct in AI
                  </button>
                </div>

                {analysis.specializedAnalysis?.instructions && analysis.specializedAnalysis.instructions.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[500px]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#090e17] text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Offset (PC)</th>
                          <th className="py-2 px-3">Opcode</th>
                          <th className="py-2 px-3">Mnemonic</th>
                          <th className="py-2 px-3">Operands / Arguments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 bg-[#070b12]">
                        {(searchQuery ? searchResults.instructions : analysis.specializedAnalysis.instructions).map((ins, i) => (
                          <tr key={i} className="hover:bg-cyan-950/30">
                            <td className="py-1 px-3 text-slate-500">0x{ins.offset.toString(16).padStart(4, '0')}</td>
                            <td className="py-1 px-3 text-cyan-500 font-bold">{ins.opcode}</td>
                            <td className="py-1 px-3 text-emerald-400 font-semibold">{ins.mnemonic}</td>
                            <td className="py-1 px-3 text-amber-300 font-mono">{ins.arg || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#090e17] border border-slate-800 rounded-lg">
                    <p className="text-xs font-mono text-slate-400">
                      Disassembly view for {analysis.formatInfo.format} is available through the REA CLI in the Terminal tab using <code className="text-cyan-400">rea instructions</code> or <code className="text-cyan-400">rea inspect-with-objdump</code>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Extracted Strings */}
            {activeSubTab === 'strings' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter strings / URLs / tokens..."
                      value={searchQuery || stringFilter}
                      onChange={(e) => {
                        setStringFilter(e.target.value);
                        setSearchQuery(e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-[#080d16] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Showing {displayedStrings.length} of {analysis.stringsCount} extracted ASCII/UTF-8 strings
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[450px]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#090e17] text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">File Offset</th>
                        <th className="py-2 px-3">Length</th>
                        <th className="py-2 px-3">String Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 bg-[#070b12]">
                      {displayedStrings.map((str, i) => (
                        <tr key={i} className="hover:bg-cyan-950/20">
                          <td className="py-1 px-3 text-cyan-400">0x{str.offset.toString(16)}</td>
                          <td className="py-1 px-3 text-slate-500">{str.string.length}</td>
                          <td className="py-1 px-3 text-slate-200 select-all font-mono break-all">
                            {str.string}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. SQLite Query Explorer */}
            {activeSubTab === 'sqlite' && (
              <div className="space-y-4">
                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800 space-y-3">
                  <label className="text-xs font-mono text-emerald-400 font-semibold block">
                    Interactive SQL Query Runner (Read-only SELECT / PRAGMA)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="SELECT * FROM access_tokens LIMIT 10;"
                      className="flex-1 px-3 py-2 bg-[#080d16] border border-slate-700 rounded-lg text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleRunQuery}
                      disabled={queryLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{queryLoading ? 'Executing...' : 'Run Query'}</span>
                    </button>
                  </div>
                </div>

                {queryResult && (
                  <div className="space-y-2">
                    {queryResult.error ? (
                      <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs font-mono text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>{queryResult.error}</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[350px]">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#090e17] text-emerald-400 border-b border-slate-800">
                            <tr>
                              {queryResult.columns?.map((col, idx) => (
                                <th key={idx} className="py-2 px-3 font-semibold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 bg-[#070b12]">
                            {queryResult.rows?.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-emerald-950/20">
                                {row.map((val: any, cIdx: number) => (
                                  <td key={cIdx} className="py-1.5 px-3 text-slate-300">{String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. REA Evidence Record */}
            {activeSubTab === 'evidence' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-400 font-semibold">
                      Evidence ID: {analysis.evidenceRecord?.evidence_id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Authority: {analysis.evidenceRecord?.authority}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyEvidence}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-lg">
                  <span className="text-[11px] font-mono font-semibold text-amber-300 uppercase block mb-1">
                    Analysis Limitations (REA Verified):
                  </span>
                  <ul className="list-disc list-inside text-xs font-mono text-slate-300 space-y-0.5">
                    {analysis.evidenceRecord?.limitations?.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>

                <pre className="p-4 bg-[#070b12] border border-slate-800 rounded-lg font-mono text-xs text-amber-200/90 overflow-x-auto max-h-[400px]">
                  {JSON.stringify(analysis.evidenceRecord, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#0d131f] border border-slate-800 rounded-xl">
          <Binary className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-mono text-slate-300 font-semibold">No target loaded</p>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Select one of the sample targets above or upload a binary, WASM, SQLite, or JS bundle.
          </p>
        </div>
      )}
    </div>
  );
};
