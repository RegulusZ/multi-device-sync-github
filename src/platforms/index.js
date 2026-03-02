/**
 * Platform Factory
 * Returns the appropriate platform implementation
 */

const LinuxPlatform = require('./linux');
const MacOSPlatform = require('./macos');
const WindowsPlatform = require('./windows');

function getPlatform() {
  const platform = process.platform;
  
  switch (platform) {
    case 'linux':
      return new LinuxPlatform();
    case 'darwin':
      return new MacOSPlatform();
    case 'win32':
      return new WindowsPlatform();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

module.exports = { getPlatform, LinuxPlatform, MacOSPlatform, WindowsPlatform };
