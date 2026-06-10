#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const args = process.argv.slice(2);

function getArg(name, fallback = '') {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function run(command, commandArgs, cwd, dryRun) {
  console.log(`\n[${cwd}]`);
  console.log(`> ${command} ${commandArgs.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ')}`);
  if (dryRun) return;
  cp.execFileSync(command, commandArgs, { cwd, stdio: 'inherit' });
}

function getCurrentBranch(cwd) {
  return cp.execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).trim() || 'main';
}

function hasUpstream(cwd) {
  try {
    cp.execFileSync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
      cwd,
      stdio: 'ignore'
    });
    return true;
  } catch (error) {
    return false;
  }
}

function cleanSyncBackups(targetRoot, dryRun) {
  const entries = fs.readdirSync(targetRoot, { withFileTypes: true });
  for (const entry of entries) {
    const shouldDelete = entry.name.startsWith('.backup-full-sync-') || entry.name.includes('.backup-sync-');
    if (!shouldDelete) continue;

    const fullPath = path.join(targetRoot, entry.name);
    console.log(`Limpiando backup temporal: ${fullPath}`);
    if (!dryRun) fs.rmSync(fullPath, { recursive: true, force: true });
  }

  const utilsDir = path.join(targetRoot, 'utils');
  if (!fs.existsSync(utilsDir)) return;
  for (const entry of fs.readdirSync(utilsDir, { withFileTypes: true })) {
    if (!entry.name.includes('.backup-sync-')) continue;
    const fullPath = path.join(utilsDir, entry.name);
    console.log(`Limpiando backup temporal: ${fullPath}`);
    if (!dryRun) fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

const superAdminRoot = path.resolve(__dirname, '..');
const newProjectRoot = path.resolve(superAdminRoot, '..', 'New project');
const updater = path.join(newProjectRoot, 'update-client-from-exotic.js');
const apkSetup = path.join(superAdminRoot, 'tools', 'setup-apk-from-exotic.js');
const versionMarker = path.join(superAdminRoot, 'tools', 'mark-client-version.js');
const target = getArg('target');
const commitMessage = getArg('message', 'Actualizar logica de reservas y APK');
const apply = hasFlag('apply');
const push = !hasFlag('no-push');
const nodeExe = process.execPath;

if (!target) {
  console.error('Uso: update-client-and-apk.bat --target "C:\\\\ruta\\\\cliente" --apply');
  process.exit(1);
}

const targetRoot = path.resolve(target);

if (!fs.existsSync(targetRoot)) {
  console.error(`No existe el cliente: ${targetRoot}`);
  process.exit(1);
}

if (!fs.existsSync(updater)) {
  console.error(`No existe el actualizador: ${updater}`);
  process.exit(1);
}

if (!fs.existsSync(apkSetup)) {
  console.error(`No existe el preparador APK: ${apkSetup}`);
  process.exit(1);
}

if (!fs.existsSync(versionMarker)) {
  console.error(`No existe el marcador de version: ${versionMarker}`);
  process.exit(1);
}

console.log(`Cliente: ${targetRoot}`);
console.log(`Modo: ${apply ? 'aplicar cambios' : 'simulacion. Agrega --apply para escribir.'}`);
console.log(`Commit: ${commitMessage}`);
console.log(`Push: ${push ? 'si' : 'no'}`);

const dryRun = !apply;

run(nodeExe, [updater, '--target', targetRoot, ...(apply ? ['--apply'] : [])], newProjectRoot, dryRun);
run(nodeExe, [apkSetup, '--target', targetRoot, ...(apply ? ['--apply'] : [])], superAdminRoot, dryRun);
run(nodeExe, [versionMarker, '--target', targetRoot, ...(apply ? ['--apply'] : [])], superAdminRoot, dryRun);

cleanSyncBackups(targetRoot, dryRun);

run('git', ['status', '--short'], targetRoot, dryRun);

if (apply) {
  const status = cp.execFileSync('git', ['-C', targetRoot, 'status', '--porcelain'], { encoding: 'utf8' });
  if (!status.trim()) {
    console.log('\nNo hay cambios para commitear.');
    process.exit(0);
  }
}

run('git', ['add', '.'], targetRoot, dryRun);
run('git', ['commit', '-m', commitMessage], targetRoot, dryRun);

if (push) {
  if (!dryRun && !hasUpstream(targetRoot)) {
    const branch = getCurrentBranch(targetRoot);
    run('git', ['push', '--set-upstream', 'origin', branch], targetRoot, dryRun);
  } else {
    run('git', ['push'], targetRoot, dryRun);
  }
}

console.log('\nListo.');
