import React, { useState } from 'react';
import {
  Globe,
  Smartphone,
  Sparkles,
  Play,
  Copy,
  Check,
  Download,
  ExternalLink,
  Laptop,
  Tablet,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Layers,
  Upload,
  RefreshCw,
  Search,
} from 'lucide-react';
import { SampleTarget } from '../types/rea';

interface AppClonerProps {
  samples: SampleTarget[];
  onSendToAiReconstructor: (snippet: string) => void;
}

export const AppCloner: React.FC<AppClonerProps> = ({
  samples,
  onSendToAiReconstructor,
}) => {
  const [cloneMode, setCloneMode] = useState<'url' | 'apk'>('url');

  // URL state
  const [urlInput, setUrlInput] = useState('https://news.ycombinator.com');
  const [urlInstructions, setUrlInstructions] = useState('');

  // APK state
  const [selectedApkSample, setSelectedApkSample] = useState<string>('crypto_wallet.apk');
  const [customApkFile, setCustomApkFile] = useState<File | null>(null);
  const [apkInstructions, setApkInstructions] = useState('');

  // Status & Results
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // View state
  const [activeResultTab, setActiveResultTab] = useState<'preview' | 'code' | 'architecture'>('preview');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);

  // Popular URL Presets
  const urlPresets = [
    { label: 'Hacker News', url: 'https://news.ycombinator.com' },
    { label: 'Linear App', url: 'https://linear.app' },
    { label: 'Stripe', url: 'https://stripe.com' },
    { label: 'GitHub', url: 'https://github.com' },
    { label: 'Vercel', url: 'https://vercel.com' },
  ];

  // Filter APK samples
  const apkSamples = samples.filter((s) => s.filename.endsWith('.apk'));

  const handleCloneUrl = async (targetUrl?: string) => {
    const finalUrl = (targetUrl || urlInput).trim();
    if (!finalUrl) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressStep('Fetching DOM & asset hierarchy from target URL...');

    const timer1 = setTimeout(() => {
      setProgressStep('Extracting layout grid, typography, and color palette...');
    }, 2000);
    const timer2 = setTimeout(() => {
      setProgressStep('REA Evidence synthesis & generating standalone React + Tailwind clone...');
    }, 4500);

    try {
      const response = await fetch('/api/rea/clone-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: finalUrl,
          customInstructions: urlInstructions,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone website');
      }

      setResult({
        type: 'url',
        ...data,
      });
      setActiveResultTab('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
      setProgressStep('');
    }
  };

  const handleCloneApk = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressStep('Unpacking APK archive and reading AndroidManifest.xml...');

    const timer1 = setTimeout(() => {
      setProgressStep('Deconstructing Activities, intent filters, and string resources...');
    }, 2000);
    const timer2 = setTimeout(() => {
      setProgressStep('Synthesizing mobile UI layout and generating interactive React clone...');
    }, 4500);

    try {
      let body: any = { customInstructions: apkInstructions };
      if (customApkFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(customApkFile);
        const base64 = await base64Promise;
        body.contentBase64 = base64;
        body.filename = customApkFile.name;
      } else {
        body.sampleFilename = selectedApkSample;
      }

      const response = await fetch('/api/rea/clone-apk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone APK application');
      }

      setResult({
        type: 'apk',
        ...data,
      });
      setActiveResultTab('preview');
      setPreviewViewport('mobile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
      setProgressStep('');
    }
  };

  const handleCopyCode = () => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    if (!result?.code) return;
    const blob = new Blob([result.code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.type === 'url' ? 'ClonedWebsite.tsx' : 'ClonedAndroidApp.tsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950/50 via-[#0f172a] to-[#0a0f18] border border-blue-900/60 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-bold text-slate-100">
                  Universal App &amp; Website Cloner
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  Reverse Engineer &amp; Reconstruct · Gemini + Google Search Grounding
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1 leading-relaxed">
                Input any live website URL or upload an Android APK. REA deconstructs the DOM hierarchy or manifest activities, and builds a clean, standalone, responsive React + Tailwind CSS clone.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#070b12] border border-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => {
                setCloneMode('url');
                setPreviewViewport('desktop');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                cloneMode === 'url'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Clone Website (URL)</span>
            </button>
            <button
              onClick={() => {
                setCloneMode('apk');
                setPreviewViewport('mobile');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                cloneMode === 'apk'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Clone Android App (APK)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Input Configuration Card */}
      <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        {cloneMode === 'url' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <label className="text-xs font-mono font-semibold text-blue-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                Target Website URL:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-mono text-slate-500 mr-1">Presets:</span>
                {urlPresets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setUrlInput(p.url);
                      handleCloneUrl(p.url);
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#0f172a] hover:bg-blue-950/40 text-slate-300 hover:text-blue-300 border border-slate-800 hover:border-blue-800 transition-colors whitespace-nowrap"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com or any web app..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCloneUrl();
                }}
                className="flex-1 px-3 py-2 bg-[#070b12] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleCloneUrl()}
                disabled={loading || !urlInput.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Clone Website</span>
              </button>
            </div>

            <div>
              <input
                type="text"
                placeholder="Optional custom instructions (e.g., 'Make it modern dark mode with responsive navbar and interactive pricing calculator')..."
                value={urlInstructions}
                onChange={(e) => setUrlInstructions(e.target.value)}
                className="w-full px-3 py-2 bg-[#070b12] border border-slate-800/80 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold text-purple-300 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                Target Android APK:
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                Decompiles manifest, activities, resources &amp; DEX strings
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sample APK selection */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <span className="text-xs font-mono text-slate-400 font-semibold block">
                  Select Preloaded Sample APK:
                </span>
                <div className="space-y-1.5">
                  {apkSamples.map((s) => (
                    <label
                      key={s.filename}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedApkSample === s.filename && !customApkFile
                          ? 'bg-purple-950/40 border-purple-600 text-purple-200'
                          : 'bg-[#070b12] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="apkSample"
                          checked={selectedApkSample === s.filename && !customApkFile}
                          onChange={() => {
                            setSelectedApkSample(s.filename);
                            setCustomApkFile(null);
                          }}
                          className="text-purple-600 focus:ring-0"
                        />
                        <span className="text-xs font-mono font-medium">{s.filename}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {((s.size || 0) / 1024).toFixed(1)} KB
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom APK upload */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-xs font-mono text-slate-400 font-semibold block mb-2">
                  Or Upload Custom .APK File:
                </span>
                <label className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-lg p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 bg-[#070b12]">
                  <Upload className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-mono text-slate-300">
                    {customApkFile ? customApkFile.name : 'Click to select or drag .apk here'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Supports Android Package (.apk)
                  </span>
                  <input
                    type="file"
                    accept=".apk"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCustomApkFile(f);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Optional instructions (e.g. 'Build an interactive bottom navigation with Send and Receive modals')..."
                value={apkInstructions}
                onChange={(e) => setApkInstructions(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#070b12] border border-slate-800/80 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleCloneApk}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Deconstruct &amp; Clone APK</span>
              </button>
            </div>
          </div>
        )}

        {/* Progress status notification */}
        {loading && (
          <div className="p-3 bg-blue-950/30 border border-blue-900/40 rounded-lg flex items-center gap-2.5 text-xs font-mono text-blue-300">
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            <span>{progressStep || 'Processing target...'}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg flex items-center gap-2 text-xs font-mono text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Cloned Result Card */}
      {result && (
        <div className="bg-[#0b101b] border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-0">
          {/* Result Subheader */}
          <div className="px-5 py-3 bg-[#080d16] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
                {result.type === 'url' ? <Globe className="w-4 h-4 text-blue-400" /> : <Smartphone className="w-4 h-4 text-purple-400" />}
                {result.title || result.appName || 'Cloned Target'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Clone Complete
              </span>
            </div>

            {/* View switcher tabs & Viewport controls */}
            <div className="flex items-center gap-3">
              {activeResultTab === 'preview' && result.type === 'url' && (
                <div className="flex items-center gap-1 bg-[#0f172a] border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewViewport('desktop')}
                    className={`p-1 rounded text-xs transition-colors ${previewViewport === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Desktop (100%)"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewViewport('tablet')}
                    className={`p-1 rounded text-xs transition-colors ${previewViewport === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Tablet (768px)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewViewport('mobile')}
                    className={`p-1 rounded text-xs transition-colors ${previewViewport === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Mobile (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex gap-1 border-l border-slate-800 pl-3">
                <button
                  onClick={() => setActiveResultTab('preview')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeResultTab === 'preview'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Live Preview
                </button>
                <button
                  onClick={() => setActiveResultTab('code')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeResultTab === 'code'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  React Code (.tsx)
                </button>
                <button
                  onClick={() => setActiveResultTab('architecture')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeResultTab === 'architecture'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reverse Architecture
                </button>
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadCode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                  title="Download React Component"
                >
                  <Download className="w-3 h-3" />
                  <span>.tsx</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Tab 1: Live Interactive Preview */}
          {activeResultTab === 'preview' && (
            <div className="p-4 bg-[#05080f] flex justify-center items-center min-h-[550px] overflow-x-auto">
              {result.type === 'apk' || previewViewport === 'mobile' ? (
                // Smartphone Mockup Frame
                <div className="w-[375px] h-[680px] bg-slate-900 border-4 border-slate-800 rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-slate-700">
                  {/* Speaker Notch */}
                  <div className="h-6 bg-slate-950 flex items-center justify-center z-10">
                    <div className="w-20 h-3.5 bg-slate-800 rounded-full"></div>
                  </div>
                  {/* Screen iframe */}
                  <iframe
                    title="Mobile App Clone Preview"
                    srcDoc={result.livePreviewHtml}
                    className="w-full flex-1 border-0 bg-slate-950"
                    sandbox="allow-scripts"
                  />
                  {/* Home indicator */}
                  <div className="h-4 bg-slate-950 flex items-center justify-center">
                    <div className="w-24 h-1 bg-slate-700 rounded-full"></div>
                  </div>
                </div>
              ) : (
                // Responsive Desktop / Tablet Frame
                <div
                  className={`bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 ${
                    previewViewport === 'tablet' ? 'w-[768px] h-[620px]' : 'w-full h-[620px]'
                  }`}
                >
                  {/* Browser Window Chrome */}
                  <div className="h-8 bg-[#0a0f18] border-b border-slate-800 px-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                    </div>
                    <div className="flex-1 max-w-sm mx-auto text-center text-[10px] font-mono text-slate-400 bg-slate-900/80 py-0.5 px-3 rounded truncate border border-slate-800">
                      {result.url || 'http://localhost:3000/cloned-app'}
                    </div>
                  </div>
                  <iframe
                    title="Website Clone Preview"
                    srcDoc={result.livePreviewHtml}
                    className="w-full h-[588px] border-0 bg-slate-900"
                    sandbox="allow-scripts"
                  />
                </div>
              )}
            </div>
          )}

          {/* Results Tab 2: React Component Code */}
          {activeResultTab === 'code' && (
            <div className="p-4 bg-[#05080f] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-300">
                  Pristine Standalone React Component (TypeScript + Tailwind CSS)
                </span>
                <button
                  onClick={() => onSendToAiReconstructor(result.code)}
                  className="px-3 py-1 rounded bg-purple-900/70 hover:bg-purple-800 text-purple-200 text-xs font-mono border border-purple-700 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Iterate in AI Reconstructor</span>
                </button>
              </div>
              <pre className="p-4 bg-[#070b12] border border-slate-800 rounded-lg font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
                {result.code}
              </pre>
            </div>
          )}

          {/* Results Tab 3: Reverse-Engineered Architecture & Evidence */}
          {activeResultTab === 'architecture' && (
            <div className="p-6 bg-[#070b12] space-y-4 font-mono text-xs leading-relaxed text-slate-200 overflow-y-auto max-h-[550px]">
              <div className="whitespace-pre-wrap">{result.fullResponse}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
