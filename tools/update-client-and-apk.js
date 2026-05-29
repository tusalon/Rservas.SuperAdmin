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

const superAdminRoot = path.resolve(__dirname, '..');
const newProjectRoot = path.resolve(superAdminRoot, '..', 'New project');
const updater = path.join(newProjectRoot, 'update-client-from-exotic.js');
const apkSetup = path.join(superAdminRoot, 'tools', 'setup-apk-from-exotic.js');
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

console.log(`Cliente: ${targetRoot}`);
console.log(`Modo: ${apply ? 'aplicar cambios' : 'simulacion. Agrega --apply para escribir.'}`);
console.log(`Commit: ${commitMessage}`);
console.log(`Push: ${push ? 'si' : 'no'}`);

const dryRun = !apply;

run(nodeExe, [updater, '--target', targetRoot, ...(apply ? ['--apply'] : [])], newProjectRoot, dryRun);
run(nodeExe, [apkSetup, '--target', targetRoot, ...(apply ? ['--apply'] : [])], superAdminRoot, dryRun);

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
  run('git', ['push'], targetRoot, dryRun);
}

console.log('\nListo.');
