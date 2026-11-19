// helper: resolve playwright from the global install, launch system chrome
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
exports.launch = (extra) => pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'].concat(extra || []) });
