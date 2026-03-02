/**
 * Linux Platform
 * Systemd service management for Linux
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const BasePlatform = require('./base');

class LinuxPlatform extends BasePlatform {
  constructor() {
    super();
    this.serviceName = 'openclaw-sync';
    this.servicePath = '/etc/systemd/user/openclaw-sync.service';
  }

  get name() {
    return 'linux';
  }

  getDataDir() {
    return path.join(process.env.HOME, '.openclaw');
  }

  getConfigDir() {
    return path.join(process.env.HOME, '.config', 'openclaw');
  }

  getServiceContent(options) {
    const { nodePath, cliPath, workdir } = options;
    
    return `[Unit]
Description=OpenClaw Multi-Device Sync
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${cliPath} daemon
WorkingDirectory=${workdir}
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
`;
  }

  async setupAutoStart(options = {}) {
    const nodePath = process.execPath;
    const cliPath = options.cliPath || path.join(__dirname, '..', '..', 'cli.js');
    const workdir = options.workdir || process.cwd();

    const serviceContent = this.getServiceContent({
      nodePath,
      cliPath,
      workdir
    });

    // Write service file
    const serviceDir = path.dirname(this.servicePath);
    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
    }

    fs.writeFileSync(this.servicePath, serviceContent);

    // Enable service
    try {
      execSync('systemctl --user daemon-reload');
      execSync(`systemctl --user enable ${this.serviceName}`);
      return { success: true, message: 'Service enabled' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async removeAutoStart() {
    try {
      execSync(`systemctl --user disable ${this.serviceName}`);
      fs.unlinkSync(this.servicePath);
      execSync('systemctl --user daemon-reload');
      return { success: true, message: 'Service disabled and removed' };
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('No such file')) {
        return { success: true, message: 'Service not installed' };
      }
      return { success: false, error: err.message };
    }
  }

  async getAutoStartStatus() {
    try {
      const output = execSync(`systemctl --user is-enabled ${this.serviceName} 2>&1`).toString().trim();
      return { enabled: output === 'enabled', installed: fs.existsSync(this.servicePath) };
    } catch {
      return { enabled: false, installed: fs.existsSync(this.servicePath) };
    }
  }

  async startService() {
    try {
      execSync(`systemctl --user start ${this.serviceName}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async stopService() {
    try {
      execSync(`systemctl --user stop ${this.serviceName}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getServiceStatus() {
    try {
      const output = execSync(`systemctl --user status ${this.serviceName} 2>&1`).toString();
      const isActive = output.includes('active (running)');
      const isFailed = output.includes('failed');
      
      return {
        running: isActive,
        failed: isFailed,
        status: isActive ? 'running' : (isFailed ? 'failed' : 'stopped')
      };
    } catch {
      return { running: false, failed: false, status: 'unknown' };
    }
  }

  async getLogs(lines = 50) {
    try {
      const output = execSync(`journalctl --user -u ${this.serviceName} -n ${lines} --no-pager`).toString();
      return output;
    } catch (err) {
      return `Failed to get logs: ${err.message}`;
    }
  }
}

module.exports = LinuxPlatform;
