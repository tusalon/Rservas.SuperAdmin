const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_BASE = 'C:/Users/RODO/Documents/ClientesRservas/exoticnailsbyyuli';
const HARD_CODED_FILES = new Set([
  'admin.html',
  'index.html',
  'manifest.json',
  'sw.js',
  path.join('utils', 'config-negocio.js'),
]);

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  'icons',
  'images',
  'node_modules',
  'trickle',
]);

function normalizeRel(file) {
  return file.split(path.sep).join('/');
}

function shouldSkip(rel) {
  const normalized = normalizeRel(rel);
  const baseName = path.basename(rel);
  if (HARD_CODED_FILES.has(rel) || HARD_CODED_FILES.has(normalized)) return true;
  if (baseName.includes('.backup') || normalized.includes('.backup-') || normalized.includes('.backup-sync-')) return true;
  return normalized.split('/').some(part => SKIP_DIRS.has(part));
}

function walk(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (shouldSkip(rel)) continue;
    if (entry.isDirectory()) {
      files.push(...walk(full, base));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files;
}

function sameFile(a, b) {
  if (!fs.existsSync(b)) return false;
  const left = fs.readFileSync(a);
  const right = fs.readFileSync(b);
  return left.length === right.length && left.equals(right);
}

function copyFileWithBackup(src, dest, rel, backupRoot, apply) {
  const changed = !sameFile(src, dest);
  if (!changed) return { status: 'OK', backup: null };

  if (apply) {
    if (fs.existsSync(dest)) {
      const backupFile = path.join(backupRoot, rel);
      fs.mkdirSync(path.dirname(backupFile), { recursive: true });
      fs.copyFileSync(dest, backupFile);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  return { status: 'CAMBIA', backup: apply && fs.existsSync(dest) ? backupRoot : null };
}

function getArg(args, name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function main() {
  const args = process.argv.slice(2);
  const targetDir = getArg(args, '--target');
  const baseDir = getArg(args, '--base', DEFAULT_BASE);
  const apply = args.includes('--apply');

  if (!targetDir) {
    console.error('Uso: node update-client-from-exotic.js --target "C:/ruta/cliente" [--apply]');
    process.exit(1);
  }

  if (!fs.existsSync(baseDir)) {
    console.error(`No existe la carpeta base: ${baseDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`No existe la carpeta destino: ${targetDir}`);
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backupRoot = path.join(targetDir, `.backup-full-sync-${stamp}`);
  const syncScript = path.join(__dirname, 'sync-hardcoded-client-files.js');
  const preflight = spawnSync(process.execPath, [syncScript, '--base', baseDir, '--target', targetDir], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (preflight.status !== 0) {
    console.error('No se pudo validar el cliente antes de copiar archivos.');
    if (preflight.stdout) console.error(preflight.stdout);
    if (preflight.stderr) console.error(preflight.stderr);
    process.exit(preflight.status || 1);
  }

  const files = walk(baseDir);
  let changedCount = 0;

  console.log(`Base: ${baseDir}`);
  console.log(`Destino: ${targetDir}`);
  console.log(apply ? 'Modo: APLICAR cambios' : 'Modo: VISTA PREVIA');
  console.log('');
  console.log('Copiando archivos genericos desde Exotic...');

  for (const rel of files) {
    const src = path.join(baseDir, rel);
    const dest = path.join(targetDir, rel);
    const result = copyFileWithBackup(src, dest, rel, backupRoot, apply);
    if (result.status === 'CAMBIA') changedCount++;
    console.log(`${result.status.padEnd(6)} ${rel}`);
  }

  console.log('');
  console.log('Regenerando archivos propios del cliente...');
  const syncArgs = [syncScript, '--base', baseDir, '--target', targetDir];
  if (apply) syncArgs.push('--apply');

  const result = spawnSync(process.execPath, syncArgs, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);

  console.log('');
  console.log(apply
    ? `Listo. Archivos genericos cambiados: ${changedCount}. Backup general: ${backupRoot}`
    : `Vista previa lista. Archivos genericos que cambiarian: ${changedCount}. Agrega --apply para escribir.`);
}

main();
