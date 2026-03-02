/**
 * macOS Platform
 * Launchd service management for macOS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const BasePlatform = require('./base');

class MacOSPlatform extends BasePlatform {
  constructor() {
    super();
    this.serviceName = 'com.openclaw.sync';
    this.plistPath = path.join(process.env.HOME, 'Library', 'LaunchAgents', `${this.serviceName}.plist`);
  }

  get name() {
    return 'macos';
  }

  getDataDir() {
    return path.join(process.env.HOME, '.openclaw');
  }

  getPlistContent(options) {
    const { nodePath, cliPath, workdir } = options;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${this.serviceName}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${cliPath}</string>
        <string>daemon</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${workdir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${this.getLogDir()}/sync.log</string>
    <key>StandardErrorPath</key>
    <string>${this.getLogDir()}/sync-error.log</string>
</dict>
</plist>
`;
  }

  async setupAutoStart(options = {}) {
    const nodePath = process.execPath;
    const cliPath = options.cliPath || path.join(__dirname, '..', '..', 'cli.js');
    const workdir = options.workdir || process.cwd();

    const plistContent = this.getPlistContent({
      nodePath,
      cliPath,
      workdir
    });

    // Ensure LaunchAgents directory exists
    const launchAgentsDir = path.dirname(this.plistPath);
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }

    // Write plist file
    fs.writeFileSync(this.plistPath, plistContent);

    // Load the service
    try {
      execSync(`launchctl load ${this.plistPath}`);
      return { success: true, message: 'LaunchAgent installed and loaded' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async removeAutoStart() {
    try {
      // Unload if running
      execSync(`launchctl unload ${this.plistPath} 2>/dev/null`);
    } catch {
      // Ignore if not loaded
    }

    // Remove plist file
    if (fs.existsSync(this.plistPath)) {
      fs.unlinkSync(this.plistPath);
    }

    return { success: true, message: 'LaunchAgent removed' };
  }

  async getAutoStartStatus() {
    try {
      const output = execSync(`launchctl list ${this.serviceName} 2>&1`).toString();
      return { enabled: true, installed: fs.existsSync(this.plistPath) };
    } catch {
      return { enabled: false, installed: fs.existsSync(this.plistPath) };
    }
  }

  async startService() {
    try {
      execSync(`launchctl load ${this.plistPath}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async stopService() {
    try {
      execSync(`launchctl unload ${this.plistPath}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getServiceStatus() {
    try {
      const output = execSync(`launchctl list ${this.serviceName} 2>&1`).toString();
      const lines = output.split('\n');
      
      // Parse PID if running
      const pidMatch = lines.find(l => l.includes('PID'));
      const isRunning = pidMatch !== undefined;

      return {
        running: isRunning,
        status: isRunning ? 'running' : 'stopped'
      };
    } catch {
      return { running: false, status: 'stopped' };
    }
  }

  getLogDir() {
    return path.join(process.env.HOME, '.openclaw', 'logs');
  }
}

module.exports = MacOSPlatform;
