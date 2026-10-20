import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Terminal,
  Play,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ReaCommandItem } from '../types/rea';

interface ToolCatalogProps {
  onRunInTerminal: (cmdName: string) => void;
}

export const ToolCatalog: React.FC<ToolCatalogProps> = ({ onRunInTerminal }) => {
  const [commands, setCommands] = useState<ReaCommandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetch('/api/rea/catalog')
      .then((res) => res.json())
      .then((data) => {
        setCommands(data.commands || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = [
    'All',
    'Native Binaries',
    'Web & JavaScript',
    'Android & Mobile',
    'WebAssembly',
    'Databases & SQLite',
    'Languages (Rust/Go/.NET)',
    'Dynamic Instrumentation & Debug',
    'Network & Traffic',
    'Evidence & Reconstruct',
  ];

  const filteredCommands = commands.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#0b101b] border border-cyan-950/60 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-bold text-slate-100">
                  REA Tools &amp; Commands Encyclopedia
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  153 Commands · 207 MCP Tools
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                The comprehensive command catalog provided by <code className="text-cyan-300">morluto/rea</code> for deep reverse engineering.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search 153 commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#070b12] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-4 border-t border-slate-800/60 mt-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Commands Grid */}
      {loading ? (
        <div className="p-12 text-center bg-[#0d131f] border border-slate-800 rounded-xl">
          <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-mono text-slate-400">Loading catalog from REA runtime...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCommands.map((cmd) => (
            <div
              key={cmd.name}
              className="bg-[#0b101b] hover:bg-[#0e1524] border border-slate-800/80 hover:border-cyan-900 rounded-xl p-4 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {cmd.category}
                  </span>
                  <button
                    onClick={() => onRunInTerminal(`${cmd.name} --help`)}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-opacity"
                    title="Run help in terminal"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run</span>
                  </button>
                </div>
                <h3 className="text-sm font-mono font-bold text-cyan-300 group-hover:text-cyan-200">
                  rea {cmd.name}
                </h3>
                <p className="text-xs font-mono text-slate-400 leading-relaxed line-clamp-3">
                  {cmd.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/50 mt-3 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">CLI / MCP compatible</span>
                <button
                  onClick={() => onRunInTerminal(`${cmd.name} --help`)}
                  className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>Inspect Help</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
