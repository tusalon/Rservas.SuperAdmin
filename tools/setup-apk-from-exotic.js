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

const superAdminRoot = path.resolve(__dirname, '..');
const defaultSource = path.resolve(superAdminRoot, '..', 'ClientesRservas', 'exoticnailsbyyuli');
const target = getArg('target');
const source = path.resolve(getArg('source', defaultSource));
const apply = hasFlag('apply');

if (!target) {
  console.error('Uso: node tools/setup-apk-from-exotic.js --target "C:\\\\ruta\\\\cliente" --apply');
  process.exit(1);
}

const targetRoot = path.resolve(target);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function removePath(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyPath(from, to) {
  removePath(to);
  fs.cpSync(from, to, { recursive: true });
}

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^app$/, 'cliente') || 'cliente';
}

function kebabSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cliente';
}

function getRepoUrl(repoRoot) {
  try {
    return cp.execFileSync('git', ['-C', repoRoot, 'config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim();
  } catch (_) {
    return '';
  }
}

function run(command, commandArgs, cwd) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  console.log(`> ${command} ${commandArgs.join(' ')}`);
  if (!apply) return;
  if (process.platform === 'win32' && command === 'npm') {
    const quotedArgs = commandArgs.map(arg => `"${String(arg).replace(/"/g, '\\"')}"`).join(' ');
    cp.execSync(`${executable} ${quotedArgs}`, { cwd, stdio: 'inherit', shell: true });
    return;
  }
  cp.execFileSync(executable, commandArgs, { cwd, stdio: 'inherit' });
}

function replaceInFile(file, replacements) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(file, content, 'utf8');
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

if (!fs.existsSync(source)) {
  console.error(`No existe el molde: ${source}`);
  process.exit(1);
}

if (!fs.existsSync(targetRoot)) {
  console.error(`No existe el cliente: ${targetRoot}`);
  process.exit(1);
}

const manifestPath = path.join(targetRoot, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
const folderSlug = path.basename(targetRoot);
const appName = getArg('name', manifest.name || manifest.short_name || folderSlug);
const slug = kebabSlug(getArg('slug', folderSlug));
const packageSlug = normalizeSlug(slug);
const appId = getArg('appId', `com.tusalon.${packageSlug}`);
const artifact = getArg('artifact', `${slug}-debug-apk`);
const apkFileName = getArg('apk', `${slug}-debug.apk`);
const npmName = normalizeSlug(slug);
const javaPackagePath = appId.split('.').join(path.sep);
const sourcePackagePath = path.join(source, 'android', 'app', 'src', 'main', 'java', 'com', 'tusalon', 'exoticnailsbyyuli');
const targetPackageRoot = path.join(targetRoot, 'android', 'app', 'src', 'main', 'java');
const targetPackagePath = path.join(targetPackageRoot, javaPackagePath);
const sourceRepo = 'https://github.com/tusalon/exoticnailsbyyuly';
const repoUrl = getRepoUrl(targetRoot);
const normalizedRepoUrl = repoUrl
  .replace(/^git@github\.com:/, 'https://github.com/')
  .replace(/\.git$/, '');

console.log(`Cliente: ${targetRoot}`);
console.log(`Molde: ${source}`);
console.log(`Nombre: ${appName}`);
console.log(`Slug: ${slug}`);
console.log(`App ID: ${appId}`);
console.log(`Artifact: ${artifact}`);
console.log(`APK: ${apkFileName}`);
console.log(apply ? 'Modo: aplicar cambios' : 'Modo: simulacion. Agrega --apply para escribir.');

if (!apply) process.exit(0);

copyPath(path.join(source, 'android'), path.join(targetRoot, 'android'));
copyPath(path.join(source, 'scripts'), path.join(targetRoot, 'scripts'));
copyPath(path.join(source, '.github'), path.join(targetRoot, '.github'));
fs.copyFileSync(path.join(source, 'capacitor.config.json'), path.join(targetRoot, 'capacitor.config.json'));

const gitignoreSource = path.join(source, '.gitignore');
if (fs.existsSync(gitignoreSource)) {
  fs.copyFileSync(gitignoreSource, path.join(targetRoot, '.gitignore'));
}

removePath(targetPackagePath);
ensureDir(path.dirname(targetPackagePath));
copyPath(sourcePackagePath, targetPackagePath);
removePath(path.join(targetPackageRoot, 'com', 'tusalon', 'exoticnailsbyyuli'));

for (const file of listFiles(path.join(targetRoot, 'android'))) {
  if (!/\.(java|kt|xml|gradle|properties|json)$/.test(file)) continue;
  replaceInFile(file, [
    ['com.tusalon.exoticnailsbyyuli', appId],
    ['Exotic Nails by Yuly', appName]
  ]);
}

const capacitorConfig = readJson(path.join(targetRoot, 'capacitor.config.json'));
capacitorConfig.appId = appId;
capacitorConfig.appName = appName;
capacitorConfig.webDir = 'www';
writeJson(path.join(targetRoot, 'capacitor.config.json'), capacitorConfig);

const packagePath = path.join(targetRoot, 'package.json');
const targetPackage = fs.existsSync(packagePath) ? readJson(packagePath) : {};
targetPackage.name = npmName;
targetPackage.version = targetPackage.version || '1.0.0';
if (!targetPackage.description || targetPackage.description.includes('Exotic Nails by Yuly')) {
  targetPackage.description = `APK Android para ${appName}`;
}
targetPackage.main = targetPackage.main || 'admin-app.js';
targetPackage.scripts = {
  ...(targetPackage.scripts || {}),
  'cap:prepare': 'powershell -ExecutionPolicy Bypass -File scripts/prepare-capacitor.ps1',
  'android:add': 'npm run cap:prepare && npx cap add android',
  'android:sync': 'npm run cap:prepare && npx cap sync android && npm run android:icons',
  'android:open': 'npm run android:sync && npx cap open android',
  'apk:debug': 'npm run android:sync && powershell -ExecutionPolicy Bypass -File scripts/build-apk-debug.ps1',
  'android:icons': 'powershell -ExecutionPolicy Bypass -File scripts/apply-android-icons.ps1'
};
targetPackage.repository = targetPackage.repository || { type: 'git', url: repoUrl || '' };
if (repoUrl) {
  targetPackage.repository.url = repoUrl;
  targetPackage.bugs = { url: `${normalizedRepoUrl}/issues` };
  targetPackage.homepage = `${normalizedRepoUrl}#readme`;
}
targetPackage.license = targetPackage.license || 'ISC';
targetPackage.type = targetPackage.type || 'commonjs';
targetPackage.devDependencies = {
  ...(targetPackage.devDependencies || {}),
  '@capacitor/android': '^8.3.4',
  '@capacitor/cli': '^8.3.4',
  '@capacitor/core': '^8.3.4'
};
writeJson(packagePath, targetPackage);

replaceInFile(path.join(targetRoot, '.github', 'workflows', 'build-android-apk.yml'), [
  ['exotic-nails-debug-apk', artifact],
  ['exoticnailsbyyuli-debug-apk', artifact],
  ['exoticnailsbyyuli-debug.apk', apkFileName]
]);

run('npm', ['install', '--package-lock-only'], targetRoot);
run('npm', ['install'], targetRoot);
run('npm', ['run', 'android:sync'], targetRoot);

console.log('Listo. Revisa git status en el cliente, haz commit y push.');
