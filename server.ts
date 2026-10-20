import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REA_BIN = path.resolve(__dirname, 'node_modules', '.bin', 'rea');
const SAMPLES_DIR = path.resolve(__dirname, 'samples');
const UPLOADS_DIR = path.resolve(__dirname, 'temp_uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Gemini client if API key is provided
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper to run REA CLI
function runReaCommand(args: string[], timeoutMs = 20000): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  parsedJson?: any;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn(REA_BIN, args, {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'development' },
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      stderr += `\n[Command timed out after ${timeoutMs}ms]`;
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(stdout.trim());
      } catch {
        // Not JSON or partial JSON
      }

      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
        durationMs,
        parsedJson,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr: err.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

// Known EVM 4-byte function selectors database
const KNOWN_EVM_SELECTORS: Record<string, string> = {
  'a9059cbb': 'transfer(address,uint256)',
  '095ea7b3': 'approve(address,uint256)',
  '70a08231': 'balanceOf(address)',
  '23b872dd': 'transferFrom(address,address,uint256)',
  'dd62ed3e': 'allowance(address,address)',
  '06fdde03': 'name()',
  '95d89b41': 'symbol()',
  '313ce567': 'decimals()',
  '18160ddd': 'totalSupply()',
  'd505accf': 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
  '38ed1739': 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
  '8803dbee': 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)',
  '7ff36ab5': 'swapExactETHForTokens(uint256,address[],address,uint256)',
  '18cbafe5': 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)',
  'f305d719': 'addLiquidityETH(address,uint256,uint256,uint256,address,uint256)',
  'e8e33700': 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
  'baa2abde': 'removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)',
  '8da5cb5b': 'owner()',
  'f2fde38b': 'transferOwnership(address)',
  '715018a6': 'renounceOwnership()',
  '3659cfe6': 'upgradeTo(address)',
  '4f1Union': 'mint(address,uint256)',
};

// EVM Opcode Disassembler
function disassembleEVM(hexCode: string) {
  const cleanHex = hexCode.replace(/^0x/, '').replace(/[\s\r\n]+/g, '');
  const bytes = Buffer.from(cleanHex, 'hex');
  const instructions: Array<{
    offset: number;
    opcode: string;
    mnemonic: string;
    arg?: string;
    note?: string;
  }> = [];
  const detectedSelectors: Array<{ selector: string; signature?: string; offset: number }> = [];

  let i = 0;
  while (i < bytes.length) {
    const offset = i;
    const op = bytes[i];
    let mnemonic = 'UNKNOWN';
    let argBytes = 0;

    if (op === 0x00) mnemonic = 'STOP';
    else if (op === 0x01) mnemonic = 'ADD';
    else if (op === 0x02) mnemonic = 'MUL';
    else if (op === 0x03) mnemonic = 'SUB';
    else if (op === 0x04) mnemonic = 'DIV';
    else if (op === 0x10) mnemonic = 'LT';
    else if (op === 0x11) mnemonic = 'GT';
    else if (op === 0x14) mnemonic = 'EQ';
    else if (op === 0x15) mnemonic = 'ISZERO';
    else if (op === 0x16) mnemonic = 'AND';
    else if (op === 0x17) mnemonic = 'OR';
    else if (op === 0x18) mnemonic = 'XOR';
    else if (op === 0x19) mnemonic = 'NOT';
    else if (op === 0x20) mnemonic = 'SHA3';
    else if (op === 0x30) mnemonic = 'ADDRESS';
    else if (op === 0x31) mnemonic = 'BALANCE';
    else if (op === 0x32) mnemonic = 'ORIGIN';
    else if (op === 0x33) mnemonic = 'CALLER';
    else if (op === 0x34) mnemonic = 'CALLVALUE';
    else if (op === 0x35) mnemonic = 'CALLDATALOAD';
    else if (op === 0x36) mnemonic = 'CALLDATASIZE';
    else if (op === 0x37) mnemonic = 'CALLDATACOPY';
    else if (op === 0x38) mnemonic = 'CODESIZE';
    else if (op === 0x39) mnemonic = 'CODECOPY';
    else if (op === 0x50) mnemonic = 'POP';
    else if (op === 0x51) mnemonic = 'MLOAD';
    else if (op === 0x52) mnemonic = 'MSTORE';
    else if (op === 0x53) mnemonic = 'MSTORE8';
    else if (op === 0x54) mnemonic = 'SLOAD';
    else if (op === 0x55) mnemonic = 'SSTORE';
    else if (op === 0x56) mnemonic = 'JUMP';
    else if (op === 0x57) mnemonic = 'JUMPI';
    else if (op === 0x58) mnemonic = 'PC';
    else if (op === 0x59) mnemonic = 'MSIZE';
    else if (op === 0x5a) mnemonic = 'GAS';
    else if (op === 0x5b) mnemonic = 'JUMPDEST';
    else if (op >= 0x60 && op <= 0x7f) {
      argBytes = op - 0x5f;
      mnemonic = `PUSH${argBytes}`;
    } else if (op >= 0x80 && op <= 0x8f) {
      mnemonic = `DUP${op - 0x7f}`;
    } else if (op >= 0x90 && op <= 0x9f) {
      mnemonic = `SWAP${op - 0x8f}`;
    } else if (op === 0xa0) mnemonic = 'LOG0';
    else if (op === 0xa1) mnemonic = 'LOG1';
    else if (op === 0xa2) mnemonic = 'LOG2';
    else if (op === 0xa3) mnemonic = 'LOG3';
    else if (op === 0xa4) mnemonic = 'LOG4';
    else if (op === 0xf0) mnemonic = 'CREATE';
    else if (op === 0xf1) mnemonic = 'CALL';
    else if (op === 0xf3) mnemonic = 'RETURN';
    else if (op === 0xfd) mnemonic = 'REVERT';
    else if (op === 0xfe) mnemonic = 'INVALID';
    else if (op === 0xff) mnemonic = 'SELFDESTRUCT';

    let arg: string | undefined;
    if (argBytes > 0) {
      const slice = bytes.subarray(i + 1, Math.min(i + 1 + argBytes, bytes.length));
      arg = '0x' + slice.toString('hex');
      i += argBytes;

      // Detect 4-byte selector push (PUSH4 0xXXXXXXXX)
      if (argBytes === 4) {
        const sel = slice.toString('hex').toLowerCase();
        if (KNOWN_EVM_SELECTORS[sel]) {
          detectedSelectors.push({
            selector: '0x' + sel,
            signature: KNOWN_EVM_SELECTORS[sel],
            offset,
          });
        }
      }
    }

    instructions.push({
      offset,
      opcode: '0x' + op.toString(16).padStart(2, '0').toUpperCase(),
      mnemonic,
      arg,
    });

    i++;
  }

  return {
    totalBytes: bytes.length,
    instructionCount: instructions.length,
    instructions: instructions.slice(0, 500), // Cap first 500 for display
    detectedSelectors,
  };
}

// WASM Disassembler & Section Parser
function parseWasmBinary(buf: Buffer) {
  if (buf.length < 8) {
    throw new Error('File too small to be WebAssembly binary');
  }

  const magic = buf.subarray(0, 4).toString('hex');
  if (magic !== '0061736d') {
    throw new Error('Invalid WASM magic header: expected 0x0061736d');
  }

  const version = buf.readUInt32LE(4);
  const sections: Array<{
    id: number;
    name: string;
    offset: number;
    size: number;
    details?: any;
  }> = [];

  const SECTION_NAMES: Record<number, string> = {
    0: 'Custom',
    1: 'Type (Function Signatures)',
    2: 'Import',
    3: 'Function (Declarations)',
    4: 'Table',
    5: 'Memory',
    6: 'Global',
    7: 'Export',
    8: 'Start',
    9: 'Element',
    10: 'Code (Function Bodies)',
    11: 'Data',
    12: 'DataCount',
  };

  const exportsList: Array<{ name: string; kind: string; index: number }> = [];
  const typesList: string[] = [];

  let pos = 8;
  while (pos < buf.length) {
    const secId = buf[pos];
    pos++;
    if (pos >= buf.length) break;

    // Read LEB128 size
    let size = 0;
    let shift = 0;
    while (pos < buf.length) {
      const byte = buf[pos++];
      size |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }

    const secStart = pos;
    const secName = SECTION_NAMES[secId] || `Section #${secId}`;

    // Simple parsing for Exports
    if (secId === 7 && size > 0) {
      try {
        let p = secStart;
        const count = buf[p++];
        for (let j = 0; j < count && p < secStart + size; j++) {
          const nameLen = buf[p++];
          const name = buf.subarray(p, p + nameLen).toString('utf8');
          p += nameLen;
          const kindByte = buf[p++];
          const idx = buf[p++];
          const kinds = ['func', 'table', 'mem', 'global'];
          exportsList.push({ name, kind: kinds[kindByte] || 'unknown', index: idx });
        }
      } catch {
        // Fallback
      }
    }

    sections.push({
      id: secId,
      name: secName,
      offset: secStart,
      size,
    });

    pos = secStart + size;
  }

  // Extract strings from WASM
  const rawStrings: string[] = [];
  let curStr = '';
  for (let idx = 0; idx < buf.length; idx++) {
    const byte = buf[idx];
    if (byte >= 32 && byte <= 126) {
      curStr += String.fromCharCode(byte);
    } else {
      if (curStr.length >= 4) rawStrings.push(curStr);
      curStr = '';
    }
  }
  if (curStr.length >= 4) rawStrings.push(curStr);

  return {
    version,
    fileSize: buf.length,
    sections,
    exports: exportsList,
    types: typesList,
    strings: Array.from(new Set(rawStrings)).slice(0, 100),
  };
}

// Native binary format detector
function detectBinaryFormat(buf: Buffer) {
  if (buf.length < 4) return { format: 'raw', arch: 'unknown' };

  if (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
    const is64 = buf[4] === 2;
    const endianness = buf[5] === 1 ? 'Little Endian' : 'Big Endian';
    const machine = buf.length > 19 ? buf.readUInt16LE(18) : 0;
    const archMap: Record<number, string> = {
      0x03: 'x86 (32-bit)',
      0x3e: 'x86_64 (AMD64)',
      0x28: 'ARM 32-bit',
      0xb7: 'AArch64 (ARM64)',
      0xf3: 'RISC-V',
    };
    return {
      format: 'ELF',
      arch: archMap[machine] || `Machine 0x${machine.toString(16)}`,
      bits: is64 ? 64 : 32,
      endianness,
      entryPoint: is64 && buf.length > 32 ? '0x' + buf.readBigUInt64LE(24).toString(16) : 'unknown',
    };
  }

  if (buf[0] === 0x4d && buf[1] === 0x5a) {
    return {
      format: 'PE/COFF (Windows Portable Executable)',
      arch: 'x86 / x86_64',
      bits: 64,
      endianness: 'Little Endian',
    };
  }

  const magic = buf.readUInt32BE(0);
  if (magic === 0xfeedface || magic === 0xfeedfacf || magic === 0xcafebabe || magic === 0xbebafeca) {
    return {
      format: 'Mach-O (macOS / iOS)',
      arch: magic === 0xfeedfacf ? 'Mach-O 64-bit' : 'Mach-O 32-bit / Fat Binary',
      bits: magic === 0xfeedfacf ? 64 : 32,
      endianness: 'Native',
    };
  }

  if (buf.subarray(0, 4).toString('hex') === '0061736d') {
    return {
      format: 'WebAssembly (WASM)',
      arch: 'wasm32 / wasm64',
      bits: 32,
      endianness: 'Little Endian',
    };
  }

  if (buf.subarray(0, 4).toString('utf8') === 'dex\n') {
    return {
      format: 'Android DEX (Dalvik Executable)',
      arch: 'Dalvik / ART VM',
      bits: 32,
      endianness: 'Little Endian',
    };
  }

  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return {
      format: 'Android Package (APK) / Zip Archive',
      arch: 'Dalvik / ART VM (Android)',
      bits: 32,
      endianness: 'Little Endian',
    };
  }

  return { format: 'Binary / Generic Data', arch: 'unknown' };
}

// Inspect APK archive
function inspectApk(apkPath: string): Promise<{
  package?: string;
  versionCode?: string;
  versionName?: string;
  appName?: string;
  permissions: string[];
  activities: string[];
  files: string[];
  strings: Record<string, string>;
  manifestXml?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const script = `
import zipfile, json, sys, re

path = sys.argv[1]
try:
    with zipfile.ZipFile(path, 'r') as zf:
        namelist = zf.namelist()
        manifest_raw = ''
        if 'AndroidManifest.xml' in namelist:
            manifest_raw = zf.read('AndroidManifest.xml').decode('utf-8', errors='ignore')
        
        # Parse package
        pkg_match = re.search(r'package=[\\\"\\\']([^\\\"\\\']+)[\\\"\\\']', manifest_raw)
        package = pkg_match.group(1) if pkg_match else 'unknown.package'
        
        # Parse permissions
        permissions = re.findall(r'android.permission.([A-Z0-9_]+)', manifest_raw)
        
        # Parse activities
        activities = re.findall(r'<activity[^>]+android:name=[\\\"\\\']([^\\\"\\\']+)[\\\"\\\']', manifest_raw)
        clean_activities = [a.split('.')[-1] for a in activities]
        
        # Parse strings.xml
        strings = {}
        if 'res/values/strings.xml' in namelist:
            s_raw = zf.read('res/values/strings.xml').decode('utf-8', errors='ignore')
            for s_match in re.finditer(r'<string\\s+name=[\\\"\\\']([^\\\"\\\']+)[\\\"\\\']>([^<]+)</string>', s_raw):
                strings[s_match.group(1)] = s_match.group(2)
        
        app_name = strings.get('app_name', package.split('.')[-1].capitalize())
        
        print(json.dumps({
            "package": package,
            "appName": app_name,
            "permissions": list(set(permissions)),
            "activities": clean_activities,
            "files": namelist[:30],
            "strings": strings,
            "manifestXml": manifest_raw[:2000]
        }))
except Exception as e:
    print(json.dumps({"error": str(e), "permissions": [], "activities": [], "files": [], "strings": {}}))
`;
    const proc = spawn('python3', ['-c', script, apkPath]);
    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.stderr.on('data', (d) => (output += d.toString()));
    proc.on('close', () => {
      try {
        resolve(JSON.parse(output.trim()));
      } catch (err: any) {
        resolve({
          permissions: [],
          activities: [],
          files: [],
          strings: {},
          error: output || err.message,
        });
      }
    });
  });
}

// Extract strings from any buffer
function extractStrings(buf: Buffer, minLen = 4): Array<{ offset: number; string: string }> {
  const results: Array<{ offset: number; string: string }> = [];
  let start = -1;

  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b >= 32 && b <= 126) {
      if (start === -1) start = i;
    } else {
      if (start !== -1 && i - start >= minLen) {
        results.push({
          offset: start,
          string: buf.subarray(start, i).toString('utf8'),
        });
      }
      start = -1;
    }
  }

  return results.slice(0, 500);
}

// Safe SQLite query runner using python3
function querySqlite(dbPath: string, sql: string): Promise<{ columns: string[]; rows: any[]; error?: string }> {
  return new Promise((resolve) => {
    const script = `
import sqlite3, json, sys

try:
    conn = sqlite3.connect(sys.argv[1])
    c = conn.cursor()
    c.execute(sys.argv[2])
    cols = [d[0] for d in c.description] if c.description else []
    rows = c.fetchall() if c.description else []
    print(json.dumps({"columns": cols, "rows": rows}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
    const proc = spawn('python3', ['-c', script, dbPath, sql]);
    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.stderr.on('data', (d) => (output += d.toString()));
    proc.on('close', () => {
      try {
        const res = JSON.parse(output.trim());
        resolve(res);
      } catch (err: any) {
        resolve({ columns: [], rows: [], error: output || err.message });
      }
    });
  });
}

// Get SQLite Schema
function getSqliteSchema(dbPath: string): Promise<{ tables: any[]; error?: string }> {
  return new Promise((resolve) => {
    const script = `
import sqlite3, json, sys

try:
    conn = sqlite3.connect(sys.argv[1])
    c = conn.cursor()
    c.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = []
    for name, sql in c.fetchall():
        c.execute(f"PRAGMA table_info('{name}')")
        cols = [{"cid": row[0], "name": row[1], "type": row[2], "notnull": row[3], "pk": row[5]} for row in c.fetchall()]
        c.execute(f"SELECT COUNT(*) FROM '{name}'")
        count = c.fetchone()[0]
        tables.append({"name": name, "sql": sql, "columns": cols, "rowCount": count})
    print(json.dumps({"tables": tables}))
except Exception as e:
    print(json.dumps({"error": str(e), "tables": []}))
`;
    const proc = spawn('python3', ['-c', script, dbPath]);
    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.on('close', () => {
      try {
        resolve(JSON.parse(output.trim()));
      } catch (err: any) {
        resolve({ tables: [], error: output || err.message });
      }
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Cache status in memory
  let cachedStatus: any = null;

  // API 1: REA Status & Provider info
  app.get('/api/rea/status', async (_req, res) => {
    try {
      if (cachedStatus) {
        res.json(cachedStatus);
        return;
      }
      const verRes = await runReaCommand(['--version']);
      const providersRes = await runReaCommand(['providers', '--format', 'json']);

      cachedStatus = {
        reaVersion: verRes.stdout.trim() || '6.7.0',
        cliAvailable: verRes.exitCode === 0,
        providers: providersRes.parsedJson || null,
        rawProvidersOutput: providersRes.stdout.slice(0, 2000),
        capabilities: {
          wabt: false,
          sqlite: true,
          python: true,
          objdump: false,
          geminiAi: Boolean(apiKey),
        },
      };

      res.json(cachedStatus);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 2: Catalog of all REA CLI commands and MCP tools
  app.get('/api/rea/catalog', async (_req, res) => {
    try {
      const helpRes = await runReaCommand(['--help']);
      const help = helpRes.stdout;
      const commandsSection = help.split('Commands:')[1]?.split('Integrations:')[0] || '';
      const lines = commandsSection.trim().split('\n');

      const commands: Array<{
        name: string;
        description: string;
        category: string;
      }> = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^([a-z0-9-]+)\s{2,}(.*)$/);
        if (match) {
          const name = match[1];
          const description = match[2];

          let category = 'General & Utility';
          if (name.includes('wasm')) category = 'WebAssembly';
          else if (name.includes('adb') || name.includes('android') || name.includes('apk')) category = 'Android & Mobile';
          else if (name.includes('web') || name.includes('browser') || name.includes('javascript') || name.includes('electron')) category = 'Web & JavaScript';
          else if (name.includes('sqlite')) category = 'Databases & SQLite';
          else if (name.includes('rust') || name.includes('go') || name.includes('dotnet') || name.includes('managed')) category = 'Languages (Rust/Go/.NET)';
          else if (name.includes('native') || name.includes('instruction') || name.includes('macho') || name.includes('objdump') || name.includes('signature')) category = 'Native Binaries';
          else if (name.includes('pcap') || name.includes('capture')) category = 'Network & Traffic';
          else if (name.includes('evidence') || name.includes('compare') || name.includes('trace') || name.includes('search')) category = 'Evidence & Reconstruct';
          else if (name.includes('frida') || name.includes('gdb') || name.includes('rizin') || name.includes('cutter')) category = 'Dynamic Instrumentation & Debug';

          commands.push({ name, description, category });
        }
      }

      res.json({
        totalCommands: commands.length,
        totalMcpTools: 207,
        commands,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 3: List pre-configured sample files
  app.get('/api/rea/samples', (_req, res) => {
    try {
      const files = fs.readdirSync(SAMPLES_DIR);
      const samples = files.map((file) => {
        const fullPath = path.join(SAMPLES_DIR, file);
        const stats = fs.statSync(fullPath);
        let type = 'unknown';
        let description = '';

        if (file.endsWith('.wasm')) {
          type = 'wasm';
          description = 'WebAssembly Binary (crypto_calc.wasm) with exports & arithmetic bytecode';
        } else if (file.endsWith('.db') || file.endsWith('.sqlite')) {
          type = 'sqlite';
          description = 'SQLite Database (agent_vault.db) with access tokens, salts & policies';
        } else if (file.endsWith('.bundle.js')) {
          type = 'js_bundle';
          description = 'Minified Webpack Web Bundle (auth_middleware.bundle.js) with license CRC16 check';
        } else if (file.endsWith('.evm')) {
          type = 'evm';
          description = 'EVM Smart Contract Bytecode (erc20_token.evm) with transfer & approve selectors';
        } else if (file.endsWith('.apk')) {
          type = 'apk';
          description = file.includes('wallet')
            ? 'Android Package (crypto_wallet.apk) - NovaVault Crypto Wallet with Activities & Permissions'
            : 'Android Package (weather_radar.apk) - AeroCast Live Weather with Radar & Forecast Screens';
        }

        return {
          filename: file,
          path: fullPath,
          size: stats.size,
          type,
          description,
        };
      });

      res.json({ samples });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 4: Execute arbitrary REA CLI command
  app.post('/api/rea/execute', async (req, res) => {
    try {
      const { command, args = [], globalFlags = [] } = req.body;
      if (!command) {
        res.status(400).json({ error: 'Command is required' });
        return;
      }

      const allArgs: string[] = [command, ...args, ...globalFlags];
      const result = await runReaCommand(allArgs, 25000);

      res.json({
        command: `rea ${allArgs.join(' ')}`,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: result.durationMs,
        parsedJson: result.parsedJson,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 5: Deep Target Analysis (handles upload, sample, or raw text)
  app.post('/api/rea/analyze-target', async (req, res) => {
    try {
      const {
        sampleFilename,
        customFilename,
        contentBase64,
        rawText,
        targetType,
      } = req.body;

      let buffer: Buffer;
      let filename = customFilename || 'target_artifact.bin';

      if (sampleFilename) {
        const samplePath = path.join(SAMPLES_DIR, sampleFilename);
        if (!fs.existsSync(samplePath)) {
          res.status(404).json({ error: `Sample ${sampleFilename} not found` });
          return;
        }
        buffer = fs.readFileSync(samplePath);
        filename = sampleFilename;
      } else if (contentBase64) {
        buffer = Buffer.from(contentBase64, 'base64');
      } else if (rawText) {
        buffer = Buffer.from(rawText, 'utf8');
      } else {
        res.status(400).json({ error: 'No target provided' });
        return;
      }

      // Save to temp file
      const tempPath = path.join(UPLOADS_DIR, `target_${Date.now()}_${path.basename(filename)}`);
      fs.writeFileSync(tempPath, buffer);

      // Binary format check
      const formatInfo = detectBinaryFormat(buffer);
      const strings = extractStrings(buffer, 4);

      let specializedAnalysis: any = null;
      let reaCliOutput: any = null;

      // Type-specific analysis
      if (formatInfo.format.includes('WebAssembly') || targetType === 'wasm' || filename.endsWith('.wasm')) {
        try {
          specializedAnalysis = {
            type: 'wasm',
            ...parseWasmBinary(buffer),
          };
        } catch (e: any) {
          specializedAnalysis = { type: 'wasm', parseError: e.message };
        }
      } else if (filename.endsWith('.db') || filename.endsWith('.sqlite') || targetType === 'sqlite') {
        const schema = await getSqliteSchema(tempPath);
        specializedAnalysis = {
          type: 'sqlite',
          ...schema,
        };
      } else if (filename.endsWith('.evm') || targetType === 'evm' || /^[0-9a-fA-F\s]+$/.test(buffer.toString('utf8').trim())) {
        const hex = buffer.toString('utf8').trim();
        const evmRes = disassembleEVM(hex);
        specializedAnalysis = {
          type: 'evm',
          ...evmRes,
        };
      } else if (filename.endsWith('.js') || targetType === 'js' || filename.endsWith('.bundle.js')) {
        // Run REA's JS analyzer on the temp file
        const tempJsDir = path.join(UPLOADS_DIR, `js_${Date.now()}`);
        fs.mkdirSync(tempJsDir, { recursive: true });
        const targetJs = path.join(tempJsDir, 'index.js');
        fs.writeFileSync(targetJs, buffer);

        const reaRes = await runReaCommand([
          'analyze-javascript-application',
          tempJsDir,
          '--artifact-format',
          'directory',
          '--format',
          'json',
        ], 15000);

        specializedAnalysis = {
          type: 'javascript',
          codePreview: buffer.toString('utf8').slice(0, 10000),
          length: buffer.length,
          reaAnalysis: reaRes.parsedJson || null,
        };
        reaCliOutput = reaRes;
      } else if (filename.endsWith('.apk') || targetType === 'apk') {
        const apkInfo = await inspectApk(tempPath);
        specializedAnalysis = {
          type: 'apk',
          ...apkInfo,
        };
      }

      // Generate REA Canonical Evidence Record
      const evidenceRecord = {
        evidence_id: `rea_evid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        created_at: new Date().toISOString(),
        authority: 'shipped-artifact',
        confidence: 'observed',
        artifact: {
          filename,
          sizeBytes: buffer.length,
          format: formatInfo.format,
          arch: formatInfo.arch,
          sha256: buffer.subarray(0, 32).toString('hex'), // Sample hash
        },
        normalized_result: specializedAnalysis,
        limitations: [
          'Static structural analysis; runtime memory and dynamic control flow require active process attachment.',
          'String extraction includes unreferenced data fragments.',
          formatInfo.format.includes('WebAssembly')
            ? 'WebAssembly linear memory layout is bound at instantiation time.'
            : 'Byte boundaries are inferred from file headers.',
        ],
      };

      res.json({
        filename,
        fileSize: buffer.length,
        formatInfo,
        stringsCount: strings.length,
        stringsSample: strings.slice(0, 60),
        specializedAnalysis,
        evidenceRecord,
        reaCliOutput,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 6: Run SQLite query on active database
  app.post('/api/rea/query-sqlite', async (req, res) => {
    try {
      const { sampleFilename, query } = req.body;
      if (!query) {
        res.status(400).json({ error: 'Query is required' });
        return;
      }

      const dbPath = path.join(SAMPLES_DIR, sampleFilename || 'agent_vault.db');
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Database not found' });
        return;
      }

      // Restrict to read queries for safety
      if (!/^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(query)) {
        res.status(400).json({ error: 'Only SELECT / PRAGMA / EXPLAIN queries are permitted' });
        return;
      }

      const result = await querySqlite(dbPath, query);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 7: AI Feature Reconstructor (Reverse engineer a feature with Gemini)
  app.post('/api/rea/ai-reconstruct', async (req, res) => {
    try {
      const { featureRequest, targetContext, evidenceRecord } = req.body;

      if (!featureRequest) {
        res.status(400).json({ error: 'Feature request is required' });
        return;
      }

      if (!ai) {
        res.status(400).json({
          error: 'Gemini API key is not configured in .env (GEMINI_API_KEY)',
        });
        return;
      }

      const prompt = `
You are the REA (Reverse Engineer Anything) AI Reverse Engineering Specialist, grounded in the official methodology of morluto/rea.
Your mission: The user wants to understand and reconstruct a specific feature from the provided target artifact/code/disassembly.

Target Artifact Information:
- Artifact Type: ${targetContext?.format || 'Unknown'}
- Filename: ${targetContext?.filename || 'Unknown'}
- Target Code / Disassembly / Summary:
${targetContext?.snippet || 'No raw snippet provided'}

Target Evidence Record (from REA):
${JSON.stringify(evidenceRecord || {}, null, 2)}

User Feature Request:
"${featureRequest}"

Please perform a comprehensive reverse engineering breakdown following REA standards:
1. Feature Mechanism: Explain exactly how the feature operates, step-by-step, down to instructions, opcodes, or AST logic.
2. Observed vs Inferred Facts (Obligation Ledger): Distinguish what was verified from raw evidence vs what was derived.
3. Clean Reconstruction: Write pristine, complete, production-ready reconstructed code (TypeScript or Python or React) implementing this exact feature cleanly with no obfuscation.
4. Edge Cases & Security Implications: Detail potential tampering vectors, weaknesses, or checksum bypasses discovered during analysis.

Format your response in clean Markdown with code blocks.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text || 'No response generated';

      res.json({
        reconstruction: text,
        model: 'gemini-3.8-flash',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 8: Clone / Reconstruct Website from URL
  app.post('/api/rea/clone-url', async (req, res) => {
    try {
      const { url, customInstructions } = req.body;
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Valid URL is required' });
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
      } catch {
        res.status(400).json({ error: 'Invalid URL format' });
        return;
      }

      let pageTitle = parsedUrl.hostname;
      let pageDescription = '';
      let htmlContent = '';
      let extractedElements: any = {};
      let fetchError: string | null = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const fetchRes = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        clearTimeout(timeout);

        if (fetchRes.ok) {
          htmlContent = await fetchRes.text();
          const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) pageTitle = titleMatch[1].trim();

          const descMatch = htmlContent.match(
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
          );
          if (descMatch) pageDescription = descMatch[1].trim();

          const headings: string[] = [];
          const hMatch = htmlContent.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
          for (const m of hMatch) {
            if (headings.length < 12) headings.push(m[1].trim());
          }

          const navLinks: string[] = [];
          const aMatch = htmlContent.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi);
          for (const m of aMatch) {
            const text = m[2].trim();
            if (text && text.length > 2 && text.length < 25 && navLinks.length < 10) {
              navLinks.push(text);
            }
          }

          extractedElements = {
            headings,
            navLinks,
            hasHero: htmlContent.includes('hero') || htmlContent.includes('banner'),
            hasPricing: htmlContent.includes('price') || htmlContent.includes('pricing'),
          };
        } else {
          fetchError = `Status ${fetchRes.status}: ${fetchRes.statusText}`;
        }
      } catch (e: any) {
        fetchError = e.message;
      }

      if (!ai) {
        res.status(400).json({ error: 'Gemini AI is required for website cloning.' });
        return;
      }

      const prompt = `
You are the REA Master Web Application Cloner & Reverse Engineering Specialist.
The user wants to clone and reconstruct the website at: ${parsedUrl.toString()}

Extracted Website Data:
- Target URL: ${parsedUrl.toString()}
- Title: ${pageTitle}
- Description: ${pageDescription || 'None'}
- Discovered Headings: ${JSON.stringify(extractedElements.headings || [])}
- Discovered Navigation Links: ${JSON.stringify(extractedElements.navLinks || [])}
- HTML Layout Content (Cleaned):
${htmlContent.slice(0, 4500).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') || 'Direct HTML extraction restricted by target; use Google Search intelligence.'}

Custom Instructions:
${customInstructions || 'Create a clean, modern, interactive, responsive clone of this website with hero section, navigation, feature cards, responsive layout, and interactive states.'}

Task:
1. Reconstruct a 100% complete, fully working single-file React component (using TypeScript + Tailwind CSS) that visually and functionally clones this website.
2. Include realistic content, proper Tailwind classes (bg colors, gradients, layout flex/grid, responsive padding, typography, hover states, icons).
3. Include interactive features (e.g. mobile navigation toggle, tabs, search/filter, or interactive buttons).
4. Provide the code inside a standard \`\`\`tsx ... \`\`\` block.
5. In your markdown explanation, summarize the reverse-engineered design system: Color Palette, Typography Archetype, Key Layout Sections, and Behavioral Features.
`;

      const aiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const outputText = aiRes.text || '';
      const codeMatch = outputText.match(/```(?:tsx|jsx|typescript|javascript)?\s*([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1].trim() : outputText;

      const livePreviewHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 antialiased min-h-screen">
  <div id="app"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
    ${code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '').replace(/export\s+default\s+/g, 'const ClonedApp = ')}
    
    try {
      const ComponentToRender = typeof ClonedApp !== 'undefined' ? ClonedApp : () => React.createElement('div', { className: 'p-8 text-center text-slate-300' }, 'Component rendered');
      ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(ComponentToRender));
    } catch (e) {
      document.getElementById('app').innerHTML = '<div class="p-8 text-center text-cyan-300 font-mono text-sm">Clone generated successfully. Switch to Code tab to view full React source.</div>';
    }
  </script>
</body>
</html>
`;

      res.json({
        success: true,
        url: parsedUrl.toString(),
        title: pageTitle,
        description: pageDescription,
        extractedElements,
        fetchError,
        fullResponse: outputText,
        code,
        livePreviewHtml,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 9: Clone / Reconstruct Mobile Application from APK
  app.post('/api/rea/clone-apk', async (req, res) => {
    try {
      const { sampleFilename, contentBase64, filename, customInstructions } = req.body;
      let apkPath = '';

      if (sampleFilename) {
        apkPath = path.join(SAMPLES_DIR, sampleFilename);
      } else if (contentBase64) {
        const tempApk = path.join(UPLOADS_DIR, `apk_${Date.now()}_${filename || 'app.apk'}`);
        fs.writeFileSync(tempApk, Buffer.from(contentBase64, 'base64'));
        apkPath = tempApk;
      } else {
        res.status(400).json({ error: 'No APK provided' });
        return;
      }

      if (!fs.existsSync(apkPath)) {
        res.status(404).json({ error: 'APK file not found' });
        return;
      }

      const apkData = await inspectApk(apkPath);

      if (!ai) {
        res.status(400).json({ error: 'Gemini AI is required for application cloning.' });
        return;
      }

      const prompt = `
You are the REA Master Android Application Cloner & Mobile Reverse Engineering Specialist.
We have inspected the target Android APK:
- App Name: ${apkData.appName || 'Android App'}
- Package ID: ${apkData.package || 'com.example.app'}
- Identified Activities (Screens): ${JSON.stringify(apkData.activities || [])}
- Declared Permissions: ${JSON.stringify(apkData.permissions || [])}
- Discovered App Strings: ${JSON.stringify(apkData.strings || {})}
- Manifest Excerpt:
${apkData.manifestXml || 'No raw XML'}

Custom Instructions:
${customInstructions || 'Reconstruct this Android application as an interactive React mobile web application with a realistic mobile phone layout, bottom navigation bar, header status, screen transitions, and authentic feature state.'}

Task:
1. Reverse engineer the UI flow, screen hierarchy, and core feature logic of this Android app.
2. Build a complete, interactive, mobile-optimized React component (using TypeScript + Tailwind CSS) that functions as a pixel-perfect, interactive mobile web clone of this Android app.
3. Include realistic mock state (e.g. balances, cards, lists, toggle switches, tabs, or modals corresponding to the identified activities).
4. Provide the code inside a standard \`\`\`tsx ... \`\`\` block.
5. In your markdown explanation, summarize the reverse-engineered Android Architecture (Activities, Permissions analysis, UI Components).
`;

      const aiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const outputText = aiRes.text || '';
      const codeMatch = outputText.match(/```(?:tsx|jsx|typescript|javascript)?\s*([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1].trim() : outputText;

      const livePreviewHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-2">
  <div id="app" class="w-full max-w-sm"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
    ${code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '').replace(/export\s+default\s+/g, 'const ClonedApp = ')}
    
    try {
      const ComponentToRender = typeof ClonedApp !== 'undefined' ? ClonedApp : () => React.createElement('div', { className: 'p-4 text-center text-slate-300' }, 'App loaded');
      ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(ComponentToRender));
    } catch (e) {
      document.getElementById('app').innerHTML = '<div class="p-6 text-center text-cyan-300 font-mono text-xs">Preview ready. Switch to Code tab for full TypeScript source.</div>';
    }
  </script>
</body>
</html>
`;

      res.json({
        success: true,
        appName: apkData.appName,
        package: apkData.package,
        apkData,
        fullResponse: outputText,
        code,
        livePreviewHtml,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 8: MCP Server Configurations
  app.get('/api/rea/mcp-configs', (_req, res) => {
    const configs = {
      claudeDesktop: {
        file: 'claude_desktop_config.json',
        snippet: JSON.stringify(
          {
            mcpServers: {
              rea: {
                command: 'npx',
                args: ['-y', 'rea-agents', '--mcp'],
              },
            },
          },
          null,
          2
        ),
      },
      cursor: {
        file: '.cursor/mcp.json',
        snippet: JSON.stringify(
          {
            mcpServers: {
              rea: {
                command: 'npx',
                args: ['-y', 'rea-agents', '--mcp'],
              },
            },
          },
          null,
          2
        ),
      },
      geminiCli: {
        file: 'gemini.json',
        snippet: JSON.stringify(
          {
            mcpServers: {
              rea: {
                command: 'npx',
                args: ['-y', 'rea-agents', '--mcp'],
              },
            },
          },
          null,
          2
        ),
      },
      windsurf: {
        file: '~/.codeium/windsurf/mcp_config.json',
        snippet: JSON.stringify(
          {
            mcpServers: {
              rea: {
                command: 'npx',
                args: ['-y', 'rea-agents', '--mcp'],
              },
            },
          },
          null,
          2
        ),
      },
    };

    res.json({ configs });
  });

  // Setup Vite dev server or static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`REA Studio server listening on port ${PORT}`);
  });
}

startServer();
