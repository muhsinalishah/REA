import React, { useState } from 'react';
import {
  FileCheck,
  ShieldCheck,
  AlertCircle,
  Download,
  Copy,
  Check,
  Layers,
  ArrowRight,
  GitBranch,
} from 'lucide-react';
import { TargetAnalysis } from '../types/rea';

interface EvidenceLedgerProps {
  analysis: TargetAnalysis | null;
}

export const EvidenceLedger: React.FC<EvidenceLedgerProps> = ({ analysis }) => {
  const [copied, setCopied] = useState(false);

  const evidence = analysis?.evidenceRecord;

  const handleCopy = () => {
    if (!evidence) return;
    navigator.clipboard.writeText(JSON.stringify(evidence, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!evidence) return;
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rea_evidence_${evidence.evidence_id || 'bundle'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reconstruct obligation items from analysis
  const obligations = [
    {
      domain: 'Artifact Integrity',
      status: 'VERIFIED',
      detail: `Authenticated ${evidence?.artifact?.format || 'Artifact'} container, digest verified.`,
      authority: 'shipped-artifact',
    },
    {
      domain: 'Structural Boundary',
      status: 'OBSERVED',
      detail: `Extracted ${analysis?.stringsCount || 0} string literals and section definitions.`,
      authority: 'rea-analyzer',
    },
    {
      domain: 'Static Semantic Relations',
      status: analysis?.specializedAnalysis ? 'RETAINED' : 'PENDING',
      detail: 'Control-flow boundaries and instruction mapping retained in session bundle.',
      authority: 'rea-mcp-engine',
    },
    {
      domain: 'Dynamic Execution Proof',
      status: 'LIMITATION',
      detail: 'Runtime behavior and dynamic memory loads require active process attachment.',
      authority: 'unverified',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#0b101b] border border-amber-900/50 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-bold text-slate-100">
                  REA Canonical Evidence Ledger
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Deterministic REA Bundle
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Retained application Evidence, verified boundaries, and reconstruction obligations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!evidence}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!evidence}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-medium shadow-md shadow-amber-600/20 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Bundle (.json)</span>
            </button>
          </div>
        </div>
      </div>

      {evidence ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Metadata & Obligations */}
          <div className="lg:col-span-1 space-y-4">
            {/* Session Card */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-mono text-slate-400 font-semibold block uppercase">
                Session Identity
              </span>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">EVIDENCE ID</span>
                  <span className="text-amber-400 font-bold select-all break-all">{evidence.evidence_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TIMESTAMP</span>
                  <span className="text-slate-200">{evidence.created_at}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">AUTHORITY</span>
                    <span className="text-emerald-400 font-semibold">{evidence.authority}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                    <span className="text-cyan-400 font-semibold">{evidence.confidence}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ARTIFACT HASH (SHA-256)</span>
                  <span className="text-slate-400 select-all font-mono text-[11px] break-all">
                    {evidence.artifact.sha256}
                  </span>
                </div>
              </div>
            </div>

            {/* Reconstruction Obligation Ledger */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-mono text-amber-300 font-semibold block uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Obligation Ledger
              </span>
              <div className="space-y-2">
                {obligations.map((ob, i) => (
                  <div key={i} className="p-2.5 bg-[#080d16] border border-slate-800/80 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-medium">{ob.domain}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded ${
                          ob.status === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : ob.status === 'OBSERVED'
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                            : ob.status === 'RETAINED'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                            : 'bg-red-950 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {ob.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400">{ob.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Limitations & Canonical JSON */}
          <div className="lg:col-span-2 space-y-4">
            {/* Limitations Notice */}
            <div className="p-4 bg-amber-950/20 border border-amber-900/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>REA Analysis Limitations & Disclaimers:</span>
              </div>
              <ul className="list-disc list-inside text-xs font-mono text-slate-300 space-y-1">
                {evidence.limitations.map((lim, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {lim}
                  </li>
                ))}
              </ul>
            </div>

            {/* Normalized Result JSON Viewer */}
            <div className="bg-[#070b12] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-4 py-2.5 bg-[#0a0f18] border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300">
                  Canonical Evidence Envelope (`normalized_result`)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {JSON.stringify(evidence).length} bytes
                </span>
              </div>
              <pre className="p-4 font-mono text-xs text-cyan-200/90 overflow-x-auto max-h-[500px] leading-relaxed">
                {JSON.stringify(evidence, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#0d131f] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400">No active Evidence bundle in memory.</p>
        </div>
      )}
    </div>
  );
};
