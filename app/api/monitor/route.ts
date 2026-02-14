import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

type MonitorAction = 'start' | 'stop';

type MonitorRequestBody = {
  action?: MonitorAction;
  activity?: string;
};

type MonitorState = {
  process: ChildProcess | null;
  activity: string | null;
  startedAt: string | null;
  lastError: string | null;
  logs: string[];
};

const MAX_LOG_LINES = 40;
const DEFAULT_SCRIPT_PATH = path.join(process.cwd(), 'python-client', 'main.py');
const DEFAULT_MPL_CONFIG_DIR = path.join(process.cwd(), '.tmp', 'matplotlib');
const DEFAULT_VENV_PYTHON = path.join(process.cwd(), 'python-client', '.venv', 'bin', 'python3');

declare global {
  var __postureMonitorState: MonitorState | undefined;
}

function getState() {
  if (!globalThis.__postureMonitorState) {
    globalThis.__postureMonitorState = {
      process: null,
      activity: null,
      startedAt: null,
      lastError: null,
      logs: []
    };
  }

  return globalThis.__postureMonitorState;
}

function isRunning(state: MonitorState) {
  return Boolean(state.process && state.process.exitCode === null && !state.process.killed);
}

function pushLog(state: MonitorState, line: string) {
  if (!line) return;
  state.logs.push(`[${new Date().toISOString()}] ${line}`);
  if (state.logs.length > MAX_LOG_LINES) {
    state.logs = state.logs.slice(-MAX_LOG_LINES);
  }
}

function resolveScriptPath() {
  const configuredPath = process.env.POSTURE_SCRIPT_PATH?.trim();
  if (!configuredPath) return DEFAULT_SCRIPT_PATH;
  return path.resolve(process.cwd(), configuredPath);
}

function resolvePythonBinary() {
  const configuredPython = process.env.POSTURE_PYTHON_BIN?.trim();
  if (configuredPython) return configuredPython;
  if (fs.existsSync(DEFAULT_VENV_PYTHON)) return DEFAULT_VENV_PYTHON;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function resolveMatplotlibConfigDir() {
  const configured = process.env.MPLCONFIGDIR?.trim();
  if (configured) return configured;
  return DEFAULT_MPL_CONFIG_DIR;
}

function statusPayload(state: MonitorState) {
  return {
    isRunning: isRunning(state),
    activity: state.activity,
    startedAt: state.startedAt,
    lastError: state.lastError,
    recentLogs: state.logs
  };
}

function captureChildLogs(state: MonitorState, child: ChildProcess) {
  child.stdout?.on('data', (chunk: Buffer) => {
    const lines = chunk.toString().split('\n').map((line) => line.trim()).filter(Boolean);
    lines.forEach((line) => pushLog(state, `stdout: ${line}`));
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    const lines = chunk.toString().split('\n').map((line) => line.trim()).filter(Boolean);
    lines.forEach((line) => pushLog(state, `stderr: ${line}`));
  });

  child.on('error', (error) => {
    state.lastError = `Process error: ${error.message}`;
    pushLog(state, state.lastError);
  });

  child.on('exit', (code, signal) => {
    pushLog(state, `Process exited (code=${code ?? 'null'}, signal=${signal ?? 'none'})`);
    if (signal !== 'SIGTERM' && signal !== 'SIGKILL' && (code ?? 0) !== 0) {
      state.lastError = `Monitor stopped unexpectedly (exit code ${code ?? 'unknown'}).`;
    }
    state.process = null;
    state.startedAt = null;
  });
}

function startMonitor(state: MonitorState, activity: string | undefined) {
  if (isRunning(state)) {
    return { ok: true, alreadyRunning: true };
  }

  const scriptPath = resolveScriptPath();
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Posture script not found: ${scriptPath}`);
  }

  const pythonBin = resolvePythonBinary();
  const mplConfigDir = resolveMatplotlibConfigDir();
  fs.mkdirSync(mplConfigDir, { recursive: true });

  const env = {
    ...process.env,
    MPLCONFIGDIR: mplConfigDir,
    PYTHONUNBUFFERED: '1'
  };

  const child = spawn(pythonBin, [scriptPath], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  state.process = child;
  state.activity = activity ?? state.activity;
  state.startedAt = new Date().toISOString();
  state.lastError = null;
  pushLog(state, `Started process with ${pythonBin} ${scriptPath}`);

  captureChildLogs(state, child);

  return { ok: true, alreadyRunning: false };
}

async function stopMonitor(state: MonitorState) {
  const child = state.process;
  if (!child || child.exitCode !== null || child.killed) {
    state.process = null;
    state.startedAt = null;
    return { stopped: false, reason: 'not-running' as const };
  }

  const exited = await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => finish(false), 2500);
    child.once('exit', () => {
      clearTimeout(timer);
      finish(true);
    });

    child.kill('SIGTERM');
  });

  if (!exited && child.exitCode === null && !child.killed) {
    child.kill('SIGKILL');
    pushLog(state, 'Process force-killed with SIGKILL');
  }

  state.process = null;
  state.startedAt = null;
  pushLog(state, 'Stop requested from UI');
  return { stopped: true, reason: exited ? 'graceful' : 'forced' as const };
}

export async function GET() {
  const state = getState();
  return Response.json(statusPayload(state));
}

export async function POST(req: NextRequest) {
  const state = getState();
  const body: MonitorRequestBody = (await req.json().catch(() => ({}))) ?? {};

  if (body.action === 'start') {
    try {
      startMonitor(state, body.activity);
      return Response.json(statusPayload(state));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start monitor process.';
      state.lastError = message;
      pushLog(state, `Start failed: ${message}`);
      return Response.json({ error: message, ...statusPayload(state) }, { status: 500 });
    }
  }

  if (body.action === 'stop') {
    await stopMonitor(state);
    return Response.json(statusPayload(state));
  }

  return Response.json({ error: "Invalid action. Use 'start' or 'stop'." }, { status: 400 });
}
