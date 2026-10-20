import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TargetWorkbench } from './components/TargetWorkbench';
import { AppCloner } from './components/AppCloner';
import { AiReconstructor } from './components/AiReconstructor';
import { ReaTerminal } from './components/ReaTerminal';
import { EvidenceLedger } from './components/EvidenceLedger';
import { McpIntegration } from './components/McpIntegration';
import { ToolCatalog } from './components/ToolCatalog';
import { ReaStatus, SampleTarget, TargetAnalysis } from './types/rea';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workbench' | 'cloner' | 'ai' | 'terminal' | 'evidence' | 'mcp' | 'catalog'>('workbench');
  const [status, setStatus] = useState<ReaStatus | null>(null);
  const [samples, setSamples] = useState<SampleTarget[]>([]);
  const [activeTarget, setActiveTarget] = useState<SampleTarget | null>(null);
  const [analysis, setAnalysis] = useState<TargetAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [terminalPreloadCmd, setTerminalPreloadCmd] = useState<string>('');
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');

  // 1. Initial Load: REA status and sample files
  useEffect(() => {
    fetch('/api/rea/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => console.error('Status fetch failed:', err));

    fetch('/api/rea/samples')
      .then((res) => res.json())
      .then((data) => {
        const sampleList = data.samples || [];
        setSamples(sampleList);
        // Default to auth_middleware.bundle.js or first sample
        const defaultSample =
          sampleList.find((s: SampleTarget) => s.filename.includes('bundle.js')) || sampleList[0];
        if (defaultSample) {
          handleSelectSample(defaultSample);
        }
      })
      .catch((err) => console.error('Samples fetch failed:', err));
  }, []);

  // 2. Analyze Target
  const analyzeTarget = async (payload: any) => {
    setAnalysisLoading(true);
    try {
      const res = await fetch('/api/rea/analyze-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze target');
      }
      setAnalysis(data);
    } catch (err: any) {
      console.error('Analysis error:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSelectSample = (sample: SampleTarget) => {
    setActiveTarget(sample);
    analyzeTarget({ sampleFilename: sample.filename, targetType: sample.type });
  };

  const handleUploadCustom = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setActiveTarget({
        filename: file.name,
        path: file.name,
        size: file.size,
        type: 'binary',
        description: 'Uploaded user artifact',
      });
      analyzeTarget({
        customFilename: file.name,
        contentBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendToAiReconstructor = (promptText: string) => {
    setAiInitialPrompt(promptText);
    setActiveTab('ai');
  };

  const handleRunInTerminal = (cmd: string) => {
    setTerminalPreloadCmd(cmd);
    setActiveTab('terminal');
  };

  const handleRunSqliteQuery = async (query: string) => {
    const res = await fetch('/api/rea/query-sqlite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleFilename: activeTarget?.filename || 'agent_vault.db',
        query,
      }),
    });
    return res.json();
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        activeTargetName={activeTarget?.filename || ''}
        samples={samples}
        onSelectSample={handleSelectSample}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'workbench' && (
          <TargetWorkbench
            analysis={analysis}
            loading={analysisLoading}
            samples={samples}
            onSelectSample={handleSelectSample}
            onUploadCustom={handleUploadCustom}
            onSendToAiReconstructor={handleSendToAiReconstructor}
            onRunSqliteQuery={handleRunSqliteQuery}
          />
        )}

        {activeTab === 'cloner' && (
          <AppCloner
            samples={samples}
            onSendToAiReconstructor={handleSendToAiReconstructor}
          />
        )}

        {activeTab === 'ai' && (
          <AiReconstructor
            analysis={analysis}
            initialPrompt={aiInitialPrompt}
          />
        )}

        {activeTab === 'terminal' && (
          <ReaTerminal initialCommand={terminalPreloadCmd} />
        )}

        {activeTab === 'evidence' && (
          <EvidenceLedger analysis={analysis} />
        )}

        {activeTab === 'mcp' && <McpIntegration />}

        {activeTab === 'catalog' && (
          <ToolCatalog onRunInTerminal={handleRunInTerminal} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#05080f] py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Powered by <a href="https://github.com/morluto/rea" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">morluto/rea</a> · Reverse Engineer Anything
          </span>
          <span>153 CLI Commands · 207 MCP Tools · Multi-Agent Context Protocol</span>
        </div>
      </footer>
    </div>
  );
}
