import React, { useState, useEffect } from 'react';
import {
  Radio,
  Copy,
  Check,
  Terminal,
  Server,
  Cpu,
  Layers,
  ExternalLink,
  ShieldCheck,
  Bot,
} from 'lucide-react';

export const McpIntegration: React.FC = () => {
  const [activeClient, setActiveClient] = useState<'cursor' | 'claude' | 'gemini' | 'windsurf'>('cursor');
  const [copied, setCopied] = useState(false);
  const [configs, setConfigs] = useState<any>(null);

  useEffect(() => {
    fetch('/api/rea/mcp-configs')
      .then((res) => res.json())
      .then((data) => setConfigs(data.configs))
      .catch(() => {});
  }, []);

  const getActiveSnippet = () => {
    if (!configs) return '';
    if (activeClient === 'cursor') return configs.cursor?.snippet;
    if (activeClient === 'claude') return configs.claudeDesktop?.snippet;
    if (activeClient === 'gemini') return configs.geminiCli?.snippet;
    if (activeClient === 'windsurf') return configs.windsurf?.snippet;
    return '';
  };

  const getConfigFile = () => {
    if (!configs) return '';
    if (activeClient === 'cursor') return configs.cursor?.file;
    if (activeClient === 'claude') return configs.claudeDesktop?.file;
    if (activeClient === 'gemini') return configs.geminiCli?.file;
    if (activeClient === 'windsurf') return configs.windsurf?.file;
    return '';
  };

  const handleCopy = () => {
    const text = getActiveSnippet();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#0b101b] border border-blue-900/50 rounded-xl p-5 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-bold text-slate-100">
                Model Context Protocol (MCP) Server Setup
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                io.github.morluto/rea
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Connect your AI agent (Claude Code, Cursor, Gemini CLI, Windsurf, Codex) directly to REA's 207 MCP tools. The agent can then automatically inspect binaries, unpack web bundles, trace AST logic, and reverse engineer code on your behalf.
            </p>
          </div>
        </div>
      </div>

      {/* Quick 1-Liner Setup */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Recommended Automated Setup (Single Command)
          </span>
          <span className="text-[10px] font-mono text-slate-400">Node.js &gt;= 22.19</span>
        </div>
        <div className="p-3 bg-[#070b12] border border-slate-800 rounded-lg flex items-center justify-between font-mono text-xs text-emerald-400">
          <code>npx rea-agents setup</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText('npx rea-agents setup');
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] font-mono text-slate-400">
          This registers REA with detected agents on your system and installs workflow instructions.
        </p>
      </div>

      {/* Manual Client Config Selector */}
      <div className="bg-[#0b101b] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 bg-[#080d16] border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-200">
            Manual MCP Configuration by Client
          </span>
          <span className="text-xs font-mono text-cyan-400">Config: {getConfigFile()}</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Client selector tabs */}
          <div className="flex gap-2">
            {[
              { id: 'cursor', label: 'Cursor IDE' },
              { id: 'claude', label: 'Claude Desktop / Code' },
              { id: 'gemini', label: 'Gemini CLI' },
              { id: 'windsurf', label: 'Windsurf IDE' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveClient(c.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                  activeClient === c.id
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Config Snippet */}
          <div className="relative">
            <pre className="p-4 bg-[#070b12] border border-slate-800 rounded-lg font-mono text-xs text-blue-200 overflow-x-auto">
              {getActiveSnippet() || 'Loading configuration...'}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Protocol Health Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Transports Supported</span>
          <p className="text-sm font-mono font-bold text-emerald-400">stdio &amp; Streamable HTTP</p>
          <p className="text-[11px] font-mono text-slate-500">Supports standard stdin/stdout pipe and --http port binding.</p>
        </div>
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Registered Tools</span>
          <p className="text-sm font-mono font-bold text-cyan-400">207 Tools &amp; 6 Prompts</p>
          <p className="text-[11px] font-mono text-slate-500">Full schema validation and typed Evidence returns.</p>
        </div>
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Security Policy</span>
          <p className="text-sm font-mono font-bold text-purple-400">100% Local Execution</p>
          <p className="text-[11px] font-mono text-slate-500">Target binaries are never uploaded to remote servers.</p>
        </div>
      </div>
    </div>
  );
};
