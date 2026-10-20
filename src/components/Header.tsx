import React from 'react';
import {
  Terminal,
  Cpu,
  Sparkles,
  FileCode2,
  Database,
  ExternalLink,
  BookOpen,
  Layers,
  Radio,
  Globe,
} from 'lucide-react';
import { ReaStatus, SampleTarget } from '../types/rea';

interface HeaderProps {
  activeTab: 'workbench' | 'cloner' | 'ai' | 'terminal' | 'evidence' | 'mcp' | 'catalog';
  setActiveTab: (tab: 'workbench' | 'cloner' | 'ai' | 'terminal' | 'evidence' | 'mcp' | 'catalog') => void;
  status: ReaStatus | null;
  activeTargetName: string;
  samples: SampleTarget[];
  onSelectSample: (sample: SampleTarget) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  status,
  activeTargetName,
  samples,
  onSelectSample,
}) => {
  return (
    <header className="border-b border-cyan-950/60 bg-[#0a0f18]/95 backdrop-blur-md sticky top-0 z-50">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg tracking-wider text-slate-100">
                REA <span className="text-cyan-400">STUDIO</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                v{status?.reaVersion || '6.7.0'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Engine Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-mono">
              Reverse Engineer Anything · Multi-Agent Context Protocol
            </p>
          </div>
        </div>

        {/* Target Quick Switcher & Official Link */}
        <div className="flex items-center gap-2">
          {/* Active Target Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0f172a] border border-cyan-900/50 rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">Target:</span>
            <select
              aria-label="Active Reverse Engineering Target"
              value={activeTargetName}
              onChange={(e) => {
                const sample = samples.find((s) => s.filename === e.target.value);
                if (sample) onSelectSample(sample);
              }}
              className="bg-transparent text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer max-w-[150px] md:max-w-[200px] truncate"
            >
              {samples.map((s) => (
                <option key={s.filename} value={s.filename} className="bg-slate-900 text-slate-200">
                  {s.filename} ({s.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <a
            href="https://github.com/morluto/rea"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-mono transition-colors"
          >
            <span>morluto/rea</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-none border-t border-slate-800/50">
        <button
          onClick={() => setActiveTab('workbench')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'workbench'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Target Workbench</span>
        </button>

        <button
          onClick={() => setActiveTab('cloner')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'cloner'
              ? 'border-indigo-400 text-indigo-300 bg-indigo-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>Clone Studio</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/40 font-semibold">
            URL / APK
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ai'
              ? 'border-purple-400 text-purple-300 bg-purple-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>AI Feature Reconstructor</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-700/40">
            Gemini
          </span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'terminal'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Interactive REA CLI</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'evidence'
              ? 'border-amber-400 text-amber-300 bg-amber-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Evidence Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('mcp')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'mcp'
              ? 'border-blue-400 text-blue-300 bg-blue-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-blue-400" />
          <span>MCP Agent Config</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tools Catalog (153)</span>
        </button>
      </div>
    </header>
  );
};
