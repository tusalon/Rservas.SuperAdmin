// Comprueba que el hash que genera "Cambiar contrasena" es el mismo formato que
// admin-login.html sabe verificar. Ejecutar: node tools/test-cambiar-password.js
//
// Lo que se protege aqui: si SuperAdmin generara el hash con otra libreria u
// otro coste, se guardaria sin error y el salon quedaria fuera de su propio
// panel sin que nada avisara.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bcrypt = require(path.join(__dirname, '..', 'vendor', 'bcrypt.min.js'));

// El coste tiene que coincidir con el que usa super-admin.js.
const source = fs.readFileSync(path.join(__dirname, '..', 'super-admin.js'), 'utf8');
const costoDeclarado = /const BCRYPT_COSTO = (\d+);/.exec(source);
assert.ok(costoDeclarado, 'No se encontro BCRYPT_COSTO en super-admin.js');
const COSTO = parseInt(costoDeclarado[1], 10);
assert.equal(COSTO, 12, 'Los hashes que ya existen en la base son $2a$12$: bajar el coste debilita la contrasena');

const clave = 'clave-de-prueba-123';
const hash = bcrypt.hashSync(clave, COSTO);

assert.match(hash, /^\$2[aby]\$12\$/, `El hash generado no tiene el formato esperado: ${hash.slice(0, 7)}`);

// Esta es la llamada exacta que hace admin-login.html para dejar entrar.
assert.equal(bcrypt.compareSync(clave, hash), true, 'El login no podria verificar la contrasena recien puesta');
assert.equal(bcrypt.compareSync('otra-clave', hash), false, 'Una contrasena distinta no debe dar acceso');

// Dos cambios seguidos a la misma clave deben dar hashes distintos (sal aleatoria)
// pero ambos validos.
const hash2 = bcrypt.hashSync(clave, COSTO);
assert.notEqual(hash, hash2, 'Cada hash debe llevar su propia sal');
assert.equal(bcrypt.compareSync(clave, hash2), true, 'El segundo hash tambien debe verificar');

console.log(`OK: hash ${hash.slice(0, 7)}... generado y verificado con la misma libreria del login`);
