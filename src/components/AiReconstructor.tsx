import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Code2,
  Check,
  Copy,
  Terminal,
  Send,
  ShieldAlert,
  HelpCircle,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { TargetAnalysis } from '../types/rea';

interface AiReconstructorProps {
  analysis: TargetAnalysis | null;
  initialPrompt?: string;
}

export const AiReconstructor: React.FC<AiReconstructorProps> = ({
  analysis,
  initialPrompt = '',
}) => {
  const [featureRequest, setFeatureRequest] = useState(
    initialPrompt ||
      'Reverse engineer the core mechanism of this artifact: identify the algorithm, explain state transitions, and provide clean reconstructed source code.'
  );
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Suggested feature prompts based on loaded target
  const getSuggestedPrompts = () => {
    const fn = analysis?.filename || '';
    if (fn.includes('bundle.js')) {
      return [
        'Reverse engineer the software license validation: how is CRC16 computed, what segment rules exist, and write a key generator.',
        'Extract all network telemetry endpoints and describe what payload is dispatched on security failure.',
        'Reconstruct the entire license verification module into standalone, modern TypeScript.',
      ];
    }
    if (fn.includes('.evm')) {
      return [
        'Decompile the EVM dispatch table and reconstruct the transfer and approve methods into standard Solidity.',
        'Trace the control flow for selector 0xa9059cbb (transfer) and identify required calldata validation.',
        'Analyze gas efficiency and potential reentrancy or integer overflow vulnerabilities.',
      ];
    }
    if (fn.includes('.wasm')) {
      return [
        'Decompile the exported computeHash function and explain its byte-level arithmetic and stack operations.',
        'Reconstruct the WASM module into an equivalent high-level TypeScript function.',
      ];
    }
    if (fn.includes('.db') || fn.includes('.sqlite')) {
      return [
        'Analyze the security schema of access_tokens and feature_flags, and explain the token validation lifecycle.',
        'Write an authentication middleware that queries this database securely using prepared statements.',
      ];
    }
    return [
      'Explain how the primary function in this binary works down to machine instructions.',
      'Identify any embedded cryptographic keys, hashes, or hardcoded API tokens in this artifact.',
      'Reconstruct the binary logic into clean, readable TypeScript.',
    ];
  };

  const handleReconstruct = async (customPrompt?: string) => {
    const promptToSend = customPrompt || featureRequest;
    if (!promptToSend.trim()) return;

    setLoading(true);
    setError(null);

    // Build snippet context
    let snippet = '';
    if (analysis?.specializedAnalysis?.codePreview) {
      snippet = analysis.specializedAnalysis.codePreview.slice(0, 4000);
    } else if (analysis?.specializedAnalysis?.instructions) {
      snippet = JSON.stringify(analysis.specializedAnalysis.instructions.slice(0, 100), null, 2);
    } else if (analysis?.stringsSample) {
      snippet = 'Sample Strings:\n' + analysis.stringsSample.map((s) => s.string).slice(0, 50).join('\n');
    }

    try {
      const response = await fetch('/api/rea/ai-reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureRequest: promptToSend,
          targetContext: {
            filename: analysis?.filename,
            format: analysis?.formatInfo.format,
            snippet,
          },
          evidenceRecord: analysis?.evidenceRecord,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reconstruct feature');
      }

      setResult(data.reconstruction);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-[#0f172a] to-[#0a0f18] border border-purple-900/50 rounded-xl p-5 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-bold text-slate-100">
                AI Feature Reconstructor
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                REA Agent Protocol · Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              "See a feature you like in an application. Understand how it works down to the binary level, show the Evidence, and build a clean version for your own project."
            </p>
          </div>
        </div>
      </div>

      {/* Target status & Prompt Input */}
      <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-cyan-400" />
            Analyzing Target: <strong className="text-slate-200">{analysis?.filename || 'No target selected'}</strong>
            {analysis?.formatInfo && (
              <span className="text-[10px] text-cyan-400 font-mono">({analysis.formatInfo.format})</span>
            )}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Evidence Retained: {analysis?.evidenceRecord ? 'Yes (REA Canonical)' : 'None'}
          </span>
        </div>

        {/* Suggested Prompts */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-purple-300 font-semibold block">
            Suggested Investigation Objectives:
          </span>
          <div className="flex flex-wrap gap-2">
            {getSuggestedPrompts().map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setFeatureRequest(p);
                  handleReconstruct(p);
                }}
                className="text-left text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-purple-950/40 border border-slate-800 hover:border-purple-800 text-slate-300 hover:text-purple-200 transition-all flex items-center gap-1.5"
              >
                <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="line-clamp-1">{p}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Textarea & Submit */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-300 block">
            Custom Reverse Engineering Request:
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              placeholder="Describe the exact feature, algorithm, or function you want to reverse engineer and reconstruct..."
              className="w-full px-3 py-2.5 bg-[#070b12] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => handleReconstruct()}
              disabled={loading || !featureRequest.trim()}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Reconstructing with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Investigate & Reconstruct</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-xs font-mono text-red-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-red-200">Reconstruction Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="bg-[#0b101b] border border-purple-900/60 rounded-xl overflow-hidden shadow-2xl space-y-0">
          <div className="flex items-center justify-between px-4 py-3 bg-[#080d16] border-b border-purple-900/50">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold text-purple-300">
                REA Reverse Engineering Report & Clean Reconstruction
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>
          </div>

          <div className="p-6 prose prose-invert max-w-none text-xs font-mono leading-relaxed overflow-x-auto text-slate-200">
            <div className="whitespace-pre-wrap">{result}</div>
          </div>
        </div>
      )}
    </div>
  );
};
