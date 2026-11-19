// Copies the static game into www/ for Capacitor (no bundling; the game has no build step).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'style.css', 'manifest.webmanifest', 'js', 'assets']) {
  fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
}
console.log('www/ ready');
