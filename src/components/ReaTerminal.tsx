import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  Clock,
  Code,
  FileText,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface ReaTerminalProps {
  initialCommand?: string;
}

interface CommandHistoryEntry {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  parsedJson?: any;
  timestamp: string;
}

export const ReaTerminal: React.FC<ReaTerminalProps> = ({ initialCommand = '' }) => {
  const [commandInput, setCommandInput] = useState(initialCommand || 'providers --format json');
  const [formatOption, setFormatOption] = useState<'default' | 'json' | 'toon' | 'yaml'>('json');
  const [includeTokenCount, setIncludeTokenCount] = useState(false);
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Quick command presets
  const presets = [
    { label: 'providers', cmd: 'providers --format json' },
    { label: 'version', cmd: '--version' },
    { label: 'token count of help', cmd: '--help --token-count' },
    { label: 'inspect sqlite help', cmd: 'inspect-sqlite-database --help' },
    { label: 'inspect wasm help', cmd: 'inspect-wasm-artifact --help' },
    { label: 'analyze js app help', cmd: 'analyze-javascript-application --help' },
    { label: 'trace feature help', cmd: 'trace-application-feature --help' },
  ];

  const handleRunCommand = async (customCmd?: string) => {
    const rawCmd = customCmd !== undefined ? customCmd : commandInput;
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    setLoading(true);

    const parts = trimmed.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    // Global flags
    const globalFlags: string[] = [];
    if (formatOption !== 'default' && !args.includes('--format')) {
      globalFlags.push('--format', formatOption);
    }
    if (includeTokenCount && !args.includes('--token-count')) {
      globalFlags.push('--token-count');
    }

    try {
      const response = await fetch('/api/rea/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          args,
          globalFlags,
        }),
      });

      const data = await response.json();
      const entry: CommandHistoryEntry = {
        command: `rea ${command} ${[...args, ...globalFlags].join(' ')}`.trim(),
        exitCode: data.exitCode,
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        durationMs: data.durationMs || 0,
        parsedJson: data.parsedJson,
        timestamp: new Date().toLocaleTimeString(),
      };

      setHistory((prev) => [...prev, entry]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          command: `rea ${trimmed}`,
          exitCode: 1,
          stdout: '',
          stderr: err.message,
          durationMs: 0,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Controller */}
      <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-mono font-bold text-slate-100">
              REA Interactive Terminal Runner
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              153 CLI Commands
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <span>Format:</span>
              <select
                aria-label="REA Output Format"
                value={formatOption}
                onChange={(e: any) => setFormatOption(e.target.value)}
                className="bg-[#070b12] text-cyan-300 text-xs font-mono px-2 py-1 rounded border border-slate-700 focus:outline-none"
              >
                <option value="default">Default / Raw</option>
                <option value="json">JSON</option>
                <option value="toon">TOON</option>
                <option value="yaml">YAML</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTokenCount}
                onChange={(e) => setIncludeTokenCount(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <span>--token-count</span>
            </label>

            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs font-mono text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Command Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
          <span className="text-[11px] font-mono text-slate-500 mr-1">Quick presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCommandInput(p.cmd);
                handleRunCommand(p.cmd);
              }}
              className="text-[11px] font-mono px-2 py-1 rounded bg-[#070b12] hover:bg-emerald-950/40 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-800 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* CLI Input Prompt */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs focus-within:border-emerald-500 transition-colors">
            <span className="text-emerald-400 font-bold mr-2 select-none">$ rea</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunCommand();
              }}
              placeholder="e.g. providers --format json or inspect-sqlite-database --help"
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleRunCommand()}
            disabled={loading || !commandInput.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-medium shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Execute</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Viewport */}
      <div className="bg-[#05080f] border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-2xl min-h-[400px] max-h-[600px] overflow-y-auto space-y-6">
        {history.length === 0 ? (
          <div className="text-center py-16 text-slate-600 space-y-2">
            <TerminalIcon className="w-8 h-8 mx-auto text-slate-700" />
            <p>REA CLI is initialized and ready on Linux host.</p>
            <p className="text-[11px] text-slate-600">
              Type any command above or pick a preset (e.g. <span className="text-emerald-500">providers --format json</span>).
            </p>
          </div>
        ) : (
          history.map((entry, idx) => (
            <div key={idx} className="space-y-2 border-b border-slate-800/60 pb-5 last:border-b-0">
              {/* Command Header */}
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">$ {entry.command}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      entry.exitCode === 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : 'bg-red-950 text-red-400 border border-red-800/40'
                    }`}
                  >
                    exit: {entry.exitCode}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {entry.durationMs}ms
                  </span>
                  <span>{entry.timestamp}</span>
                  <button
                    onClick={() => handleCopy(entry.stdout || entry.stderr, idx)}
                    className="hover:text-slate-200 transition-colors"
                    title="Copy Output"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Stdout Output */}
              {entry.stdout && (
                <pre className="p-3 bg-[#080d16] border border-slate-800/80 rounded-lg text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[350px]">
                  {entry.stdout}
                </pre>
              )}

              {/* Stderr Output */}
              {entry.stderr && (
                <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-300 overflow-x-auto whitespace-pre-wrap">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold text-[10px] uppercase mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    STDERR Diagnostics:
                  </div>
                  {entry.stderr}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
