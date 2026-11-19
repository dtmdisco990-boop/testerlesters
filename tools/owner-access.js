#!/usr/bin/env node
/* Choose your private Owner Access code WITHOUT putting it in the repository.
 *
 *   node tools/owner-access.js            prompts (hidden) for your code twice and prints the config block
 *   node tools/owner-access.js --write    same, and installs the block into js/data/balance.js for you
 *
 * Only a random salt and a PBKDF2-SHA256 hash are produced. The code itself is never written to disk, printed, logged or put in argv/shell
 * history (it is read from a hidden prompt, or from stdin when piped). The same derivation runs in the browser through Web Crypto. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ITER = 210000;
const BAL = path.join(__dirname, '..', 'js', 'data', 'balance.js');

function derive(code, saltB64, iterations) {
  return crypto.pbkdf2Sync(Buffer.from(String(code), 'utf8'), Buffer.from(saltB64, 'base64'), iterations, 32, 'sha256').toString('hex');
}
function makeBlock(code) {
  const salt = crypto.randomBytes(16).toString('base64');
  return { enabled: true, iterations: ITER, salt, hash: derive(code, salt, ITER) };
}
function render(b) { return "OWNER_ACCESS: { enabled: true, iterations: " + b.iterations + ", salt: '" + b.salt + "', hash: '" + b.hash + "' },"; }
function install(b, file) {
  let s = fs.readFileSync(file, 'utf8');
  const re = /(\/\/ OWNER-ACCESS-BEGIN\n)[\s\S]*?(\n\s*\/\/ OWNER-ACCESS-END)/;
  if (!re.test(s)) throw new Error('OWNER-ACCESS markers not found in ' + file);
  s = s.replace(re, (m, a, z) => a + '    ' + render(b) + z);
  fs.writeFileSync(file, s);
}

function readHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin; let buf = '';
    stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8');
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (c === '\r' || c === '\n') { stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', onData); process.stdout.write('\n'); return resolve(buf); }
        if (c === '\u007f' || c === '\b') buf = buf.slice(0, -1); else buf += c;
      }
    };
    stdin.on('data', onData);
  });
}
function readPiped() { return new Promise((resolve) => { let d = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', (c) => { d += c; }); process.stdin.on('end', () => resolve(d.replace(/\r?\n$/, ''))); }); }

async function main() {
  const write = process.argv.includes('--write');
  let code;
  if (process.stdin.isTTY) {
    code = await readHidden('Choose your owner access code (input hidden): ');
    const again = await readHidden('Repeat it: ');
    if (code !== again) { console.error('The two entries did not match. Nothing was changed.'); process.exit(1); }
  } else code = await readPiped();
  if (code.length < 10) { console.error('Use at least 10 characters (a long passphrase is best). Nothing was changed.'); process.exit(1); }
  const block = makeBlock(code);
  if (write) { install(block, BAL); console.log('Installed the new hash into js/data/balance.js. Commit that file; your code was not stored anywhere.'); }
  else { console.log('Paste this line between the OWNER-ACCESS-BEGIN / END markers in js/data/balance.js:\n\n    ' + render(block) + '\n'); }
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { derive, makeBlock, render, install, ITER };
