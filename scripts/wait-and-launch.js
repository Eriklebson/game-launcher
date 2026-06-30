const { exec } = require('child_process');
const http = require('http');
const { buildSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const PORT = 5173;

// Rebuild electron files before launching
function buildElectron() {
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

  const wasmSrc = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmDest = path.join(outDir, 'sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, wasmDest);
  }

  console.log('Electron files built.');
}

function checkServer() {
  return new Promise((resolve) => {
    http.get(`http://localhost:${PORT}`, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function waitAndLaunch() {
  buildElectron();
  console.log('Waiting for Vite server...');

  let ready = false;
  while (!ready) {
    ready = await checkServer();
    if (!ready) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('Vite ready! Starting Electron...');

  const electron = exec('npx electron .', { cwd: process.cwd() });
  electron.stdout?.pipe(process.stdout);
  electron.stderr?.pipe(process.stderr);

  electron.on('close', () => {
    process.exit(0);
  });
}

waitAndLaunch();
