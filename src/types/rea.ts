export interface ReaStatus {
  reaVersion: string;
  cliAvailable: boolean;
  providers: any;
  rawProvidersOutput: string;
  capabilities: {
    wabt: boolean;
    sqlite: boolean;
    python: boolean;
    objdump: boolean;
    geminiAi: boolean;
  };
}

export interface ReaCommandItem {
  name: string;
  description: string;
  category: string;
}

export interface SampleTarget {
  filename: string;
  path: string;
  size: number;
  type: 'wasm' | 'sqlite' | 'js_bundle' | 'evm' | 'binary' | string;
  description: string;
}

export interface DisassemblyInstruction {
  offset: number;
  opcode: string;
  mnemonic: string;
  arg?: string;
  note?: string;
}

export interface TargetAnalysis {
  filename: string;
  fileSize: number;
  formatInfo: {
    format: string;
    arch: string;
    bits?: number;
    endianness?: string;
    entryPoint?: string;
  };
  stringsCount: number;
  stringsSample: Array<{ offset: number; string: string }>;
  specializedAnalysis?: {
    type: string;
    // WASM
    version?: number;
    sections?: Array<{ id: number; name: string; offset: number; size: number }>;
    exports?: Array<{ name: string; kind: string; index: number }>;
    // EVM
    totalBytes?: number;
    instructionCount?: number;
    instructions?: DisassemblyInstruction[];
    detectedSelectors?: Array<{ selector: string; signature?: string; offset: number }>;
    // SQLite
    tables?: Array<{
      name: string;
      sql: string;
      columns: Array<{ cid: number; name: string; type: string; notnull: number; pk: number }>;
      rowCount: number;
    }>;
    // JS
    codePreview?: string;
    reaAnalysis?: any;
    parseError?: string;
    // APK
    appName?: string;
    package?: string;
    permissions?: string[];
    activities?: string[];
    files?: string[];
    strings?: Record<string, string>;
    manifestXml?: string;
  };
  evidenceRecord?: {
    evidence_id: string;
    created_at: string;
    authority: string;
    confidence: string;
    artifact: {
      filename: string;
      sizeBytes: number;
      format: string;
      arch: string;
      sha256: string;
    };
    normalized_result: any;
    limitations: string[];
  };
  reaCliOutput?: any;
}
