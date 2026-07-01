import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface FpsStats {
  current: number;
  min: number;
  max: number;
  avg: number;
  source: string;
}

class FpsMonitor {
  private fpsHistory: number[] = [];
  private presentMonPath: string;
  private lastStats: FpsStats = { current: 0, min: 0, max: 0, avg: 0, source: 'Off' };
  private isMonitoring = false;
  private logFile: string;
  private targetProcess = '';
  private cycleTimer: NodeJS.Timeout | null = null;
  private currentProcess: any = null;
  private cycleDuration = 2000;
  private static readonly SESSION_NAME = 'GameLauncherFPS';

  constructor() {
    this.presentMonPath = this.findPresentMon();
    this.logFile = path.join(os.tmpdir(), 'game-launcher-fps-debug.log');
    try { fs.writeFileSync(this.logFile, ''); } catch {}
    this.log('FpsMonitor constructed, PM: ' + this.presentMonPath);
    this.cleanupStaleSessions();
  }

  private log(msg: string): void {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try { fs.appendFileSync(this.logFile, line); } catch {}
    console.log(`[FPS] ${msg}`);
  }

  private findPresentMon(): string {
    const candidates = [
      path.join(__dirname, 'PresentMon-2.5.1-x64.exe'),
      path.join(process.resourcesPath || '', 'PresentMon-2.5.1-x64.exe'),
      path.join(__dirname, '..', '..', 'tools', 'PresentMon-2.5.1-x64.exe'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return candidates[0];
  }

  isAvailable(): boolean {
    return fs.existsSync(this.presentMonPath);
  }

  getCsvPath(): string {
    return path.join(os.tmpdir(), 'game-launcher-fps.csv');
  }

  startMonitoring(processName: string): void {
    if (this.isMonitoring) return;
    this.stopMonitoring(false);
    this.isMonitoring = true;
    this.fpsHistory = [];
    this.targetProcess = processName;
    this.lastStats = { current: 0, min: 0, max: 0, avg: 0, source: 'Starting...' };

    if (!this.isAvailable()) {
      this.log('PM not found: ' + this.presentMonPath);
      this.lastStats = { current: 0, min: 0, max: 0, avg: 0, source: 'PM não encontrado' };
      this.isMonitoring = false;
      return;
    }

    this.killExistingPM();
    this.log('Starting capture loop: process=' + processName);
    this.runCycle();
  }

  private killExistingPM(): void {
    try { execSync('taskkill /F /IM PresentMon-2.5.1-x64.exe 2>nul', { windowsHide: true }); } catch {}
  }

  private cleanupStaleSessions(): void {
    try {
      const output = execSync('logman query -ets 2>nul', { windowsHide: true, encoding: 'utf8' });
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*(fps_\d+|GameLauncherFPS)\s+/);
        if (match) {
          const name = match[1];
          try { execSync(`logman stop "${name}" -ets 2>nul`, { windowsHide: true }); } catch {}
          try { execSync(`logman delete "${name}" -ets 2>nul`, { windowsHide: true }); } catch {}
        }
      }
    } catch {}
  }

  private killPMAndCleanSession(): void {
    this.killExistingPM();
    this.cleanupStaleSessions();
  }

  private runCycle(): void {
    if (!this.isMonitoring) return;

    const csvPath = this.getCsvPath();
    try { fs.unlinkSync(csvPath); } catch {}

    // Kill PM and clean ETW session before starting new one
    this.killPMAndCleanSession();

    const sessionName = FpsMonitor.SESSION_NAME;
    const args = [
      '--output_file', csvPath,
      '--no_console_stats',
      '--session_name', sessionName,
      '--stop_existing_session',
    ];

    // Wait for ETW session to fully release before spawning new PM
    this.cycleTimer = setTimeout(() => {
      if (!this.isMonitoring) return;

      const pmProc = spawn(this.presentMonPath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.currentProcess = pmProc;

      pmProc.on('error', (err) => {
        this.log('PM error: ' + err.message);
        if (this.isMonitoring) {
          this.cycleTimer = setTimeout(() => this.runCycle(), 3000);
        }
      });

      pmProc.on('close', (code) => {
        this.currentProcess = null;
      });

      pmProc.unref();

      this.cycleTimer = setTimeout(() => {
        this.killPMAndCleanSession();
        setTimeout(() => {
          this.readCsvAndRestart();
        }, 500);
      }, this.cycleDuration);
    }, 500);
  }

  private readCsvAndRestart(): void {
    if (!this.isMonitoring) return;

    const csvPath = this.getCsvPath();
    try {
      if (!fs.existsSync(csvPath)) {
        this.log('CSV not found after cycle');
        this.scheduleNext();
        return;
      }

      const content = fs.readFileSync(csvPath, 'utf8');
      this.parseCsvData(content);
    } catch (err: any) {
      this.log('CSV read error: ' + (err?.code || err?.message));
    }

    this.scheduleNext();
  }

  private scheduleNext(): void {
    if (!this.isMonitoring) return;
    this.cycleTimer = setTimeout(() => this.runCycle(), 200);
  }

  private parseCsvData(content: string): void {
    if (!content) return;

    const lines = content.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim());
    const msIdx = headers.indexOf('MsBetweenPresents');
    const appIdx = headers.indexOf('Application');
    if (msIdx === -1) return;

    const targetLower = this.targetProcess.toLowerCase().replace(/\.exe$/i, '');
    const newFps: number[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const fields = line.split(',');
      if (fields.length <= msIdx) continue;

      if (appIdx >= 0 && fields.length > appIdx) {
        const appName = fields[appIdx].trim().toLowerCase().replace(/\.exe$/i, '');
        if (appName !== targetLower) continue;
      }

      const ft = parseFloat(fields[msIdx]);
      if (isNaN(ft) || ft <= 0 || ft >= 5000) continue;

      const fps = Math.round(1000.0 / ft);
      if (fps > 0 && fps < 1000) newFps.push(fps);
    }

    if (newFps.length === 0) return;

    for (const fps of newFps) this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 120) this.fpsHistory = this.fpsHistory.slice(-120);

    const latest = newFps[newFps.length - 1];
    let min = Infinity, max = 0, total = 0;
    for (const f of this.fpsHistory) {
      if (f < min) min = f;
      if (f > max) max = f;
      total += f;
    }

    this.lastStats = {
      current: latest,
      min: min === Infinity ? 0 : min,
      max,
      avg: Math.round(total / this.fpsHistory.length),
      source: 'PresentMon'
    };
  }

  getStats(): FpsStats {
    return this.lastStats;
  }

  stopMonitoring(resetStats = true): void {
    this.log('stopMonitoring');

    if (this.cycleTimer) { clearTimeout(this.cycleTimer); this.cycleTimer = null; }

    if (this.currentProcess) {
      try { this.currentProcess.kill(); } catch {}
      this.currentProcess = null;
    }

    this.killPMAndCleanSession();

    const csvPath = this.getCsvPath();
    try { fs.unlinkSync(csvPath); } catch {}
    try { fs.unlinkSync(csvPath + '.read'); } catch {}

    this.isMonitoring = false;
    this.fpsHistory = [];
    this.targetProcess = '';
    if (resetStats) this.lastStats = { current: 0, min: 0, max: 0, avg: 0, source: 'Off' };
  }
}

export const fpsMonitor = new FpsMonitor();
