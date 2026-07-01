const { context } = require('esbuild');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'dist-electron';
let electronProcess = null;

function copyFiles() {
  const wasmSrc = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmDest = path.join(outDir, 'sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) fs.copyFileSync(wasmSrc, wasmDest);

  for (const file of ['notification.html', 'monitor.html']) {
    const src = path.join(__dirname, '..', 'src', 'electron', file);
    const dest = path.join(outDir, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  const pmSrc = path.join(__dirname, '..', 'tools', 'PresentMon-2.5.1-x64.exe');
  const pmDest = path.join(outDir, 'PresentMon-2.5.1-x64.exe');
  if (fs.existsSync(pmSrc)) { try { fs.copyFileSync(pmSrc, pmDest); } catch (e) {} }

  const lhmSrcDir = path.join(__dirname, '..', 'tools', 'LibreHardwareMonitor');
  const lhmDestDir = path.join(outDir, 'tools', 'LibreHardwareMonitor');
  if (fs.existsSync(lhmSrcDir)) {
    fs.mkdirSync(lhmDestDir, { recursive: true });
    const lhmFiles = fs.readdirSync(lhmSrcDir).filter(f => f.endsWith('.dll') || f.endsWith('.config'));
    for (const file of lhmFiles) {
      fs.copyFileSync(path.join(lhmSrcDir, file), path.join(lhmDestDir, file));
    }
  }

  const toolsDir = path.join(outDir, 'tools');
  if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });
  for (const file of ['read-sensors.ps1', 'sensor-service.ps1']) {
    const src = path.join(__dirname, '..', 'tools', file);
    const dest = path.join(toolsDir, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }
}

function startElectron() {
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }
  electronProcess = spawn(path.join(__dirname, '..', 'node_modules', '.bin', 'electron'), ['.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  electronProcess.on('close', () => { electronProcess = null; });
}

let restartTimeout = null;
function scheduleRestart() {
  if (restartTimeout) clearTimeout(restartTimeout);
  restartTimeout = setTimeout(() => {
    console.log('[watch] Rebuild done, restarting Electron...');
    startElectron();
  }, 200);
}

// esbuild plugin: restart Electron after each rebuild
const restartPlugin = {
  name: 'restart-electron',
  setup(build) {
    let isFirst = true;
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      if (isFirst) { isFirst = false; return; }
      scheduleRestart();
    });
  },
};

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  copyFiles();

  const ctx = await context({
    entryPoints: ['src/electron/main.ts', 'src/electron/preload.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outdir: outDir,
    external: ['electron'],
    target: 'node20',
    plugins: [restartPlugin],
  });

  await ctx.watch();
  console.log('[watch] esbuild watching main.ts + preload.ts...');

  // Watch HTML files
  for (const file of ['src/electron/monitor.html', 'src/electron/notification.html']) {
    if (fs.existsSync(file)) {
      fs.watchFile(file, { interval: 500 }, () => {
        console.log(`[watch] ${path.basename(file)} changed`);
        copyFiles();
        scheduleRestart();
      });
    }
  }

  // Initial start
  setTimeout(() => {
    console.log('[watch] Starting Electron...');
    startElectron();
  }, 1000);
}

main().catch(console.error);
