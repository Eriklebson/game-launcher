const { buildSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const outDir = 'dist-electron';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

buildSync({
  entryPoints: ['src/electron/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(outDir, 'main.js'),
  external: ['electron'],
  target: 'node20',
});

buildSync({
  entryPoints: ['src/electron/preload.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(outDir, 'preload.js'),
  external: ['electron'],
  target: 'node20',
});

// Copy sql-wasm.wasm for sql.js
const wasmSrc = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const wasmDest = path.join(outDir, 'sql-wasm.wasm');
if (fs.existsSync(wasmSrc)) {
  fs.copyFileSync(wasmSrc, wasmDest);
  console.log('Copied sql-wasm.wasm');
}

// Copy notification.html for achievement notifications
const notifSrc = path.join(__dirname, '..', 'src', 'electron', 'notification.html');
const notifDest = path.join(outDir, 'notification.html');
if (fs.existsSync(notifSrc)) {
  fs.copyFileSync(notifSrc, notifDest);
  console.log('Copied notification.html');
}

// Copy monitor.html for hardware monitoring
const monitorSrc = path.join(__dirname, '..', 'src', 'electron', 'monitor.html');
const monitorDest = path.join(outDir, 'monitor.html');
if (fs.existsSync(monitorSrc)) {
  fs.copyFileSync(monitorSrc, monitorDest);
  console.log('Copied monitor.html');
}

// Copy PresentMon for FPS monitoring
const pmSrc = path.join(__dirname, '..', 'tools', 'PresentMon-2.5.1-x64.exe');
const pmDest = path.join(outDir, 'PresentMon-2.5.1-x64.exe');
if (fs.existsSync(pmSrc)) {
  try {
    fs.copyFileSync(pmSrc, pmDest);
    console.log('Copied PresentMon');
  } catch (e) {
    if (e.code === 'EBUSY') {
      console.log('PresentMon locked, skipping copy (already exists)');
    } else {
      throw e;
    }
  }
} else {
  console.warn('PresentMon not found at', pmSrc, '- FPS monitoring will be unavailable');
}

console.log('Electron files built successfully!');
