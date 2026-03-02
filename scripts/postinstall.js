/**
 * Post-install script
 * Runs after npm install
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n📦 OpenClaw Multi-Device Sync installed!\n');

// Create necessary directories
const platform = process.platform;
let dataDir;

if (platform === 'win32') {
  dataDir = path.join(process.env.APPDATA || process.env.USERPROFILE, 'openclaw');
} else {
  dataDir = path.join(os.homedir(), '.openclaw');
}

const dirs = [
  dataDir,
  path.join(dataDir, 'logs'),
  path.join(dataDir, 'workspace'),
  path.join(dataDir, 'workspace', 'memory'),
  path.join(dataDir, 'workspace', 'skills'),
  path.dirname(dataDir) + '/config/openclaw' // config dir
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      // Ignore permission errors
    }
  }
}

console.log('Quick start:');
console.log('  npx openclaw-sync setup    # Interactive setup');
console.log('  npx openclaw-sync sync     # Manual sync');
console.log('  npx openclaw-sync status   # Check status\n');
