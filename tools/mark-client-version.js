#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const superAdminRoot = path.resolve(__dirname, '..');
const versionConfigPath = path.join(__dirname, 'base-version.json');

function getArg(name, fallback = '') {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function match(text, regex, fallback = '') {
  const found = text.match(regex);
  return found ? found[1].trim() : fallback;
}

function getClientInfo(targetRoot) {
  const manifestPath = path.join(targetRoot, 'manifest.json');
  const configPath = path.join(targetRoot, 'utils', 'config-negocio.js');
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
  const config = readText(configPath);

  return {
    negocio_id: match(config, /NEGOCIO_ID_POR_DEFECTO\s*=\s*['"]([^'"]+)['"]/, ''),
    slug: path.basename(targetRoot),
    name: manifest.name || manifest.short_name || path.basename(targetRoot)
  };
}

const target = getArg('target');
const apply = hasFlag('apply');

if (!target) {
  console.error('Uso: node tools/mark-client-version.js --target "C:\\\\ruta\\\\cliente" --apply');
  process.exit(1);
}

if (!fs.existsSync(versionConfigPath)) {
  console.error(`No existe configuracion de version: ${versionConfigPath}`);
  process.exit(1);
}

const targetRoot = path.resolve(target);
if (!fs.existsSync(targetRoot)) {
  console.error(`No existe el cliente: ${targetRoot}`);
  process.exit(1);
}

const baseVersion = readJson(versionConfigPath);
const clientInfo = getClientInfo(targetRoot);
const payload = {
  app: 'RservasRoma',
  version: baseVersion.version,
  label: baseVersion.label,
  source: baseVersion.source,
  released_at: baseVersion.released_at,
  updated_at: new Date().toISOString(),
  updated_by: 'Rservas.SuperAdmin',
  negocio_id: clientInfo.negocio_id,
  slug: clientInfo.slug,
  name: clientInfo.name
};

const outputPath = path.join(targetRoot, 'rservas-version.json');
console.log(`Version base: ${baseVersion.version}`);
console.log(`Cliente: ${targetRoot}`);
console.log(`Archivo: ${outputPath}`);

if (!apply) {
  console.log('Simulacion. Agrega --apply para escribir la marca de version.');
  process.exit(0);
}

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log('Marca de version escrita.');
