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

console.log('Electron files built successfully!');
