/**
 * Windows Platform
 * Task Scheduler for Windows auto-start
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const BasePlatform = require('./base');

class WindowsPlatform extends BasePlatform {
  constructor() {
    super();
    this.taskName = 'OpenClawSync';
  }

  get name() {
    return 'windows';
  }

  getDataDir() {
    return path.join(process.env.APPDATA || process.env.USERPROFILE, 'openclaw');
  }

  getConfigDir() {
    return path.join(process.env.APPDATA || process.env.USERPROFILE, 'openclaw');
  }

  async setupAutoStart(options = {}) {
    const nodePath = process.execPath;
    const cliPath = options.cliPath || path.join(__dirname, '..', '..', 'cli.js');
    const workdir = options.workdir || process.cwd();

    // Create a batch file wrapper
    const batPath = path.join(this.getDataDir(), 'sync-daemon.bat');
    const batContent = `@echo off
cd /d "${workdir}"
"${nodePath}" "${cliPath}" daemon
`;
    
    fs.mkdirSync(path.dirname(batPath), { recursive: true });
    fs.writeFileSync(batPath, batContent);

    // Create scheduled task
    const taskCmd = `schtasks /create /tn "${this.taskName}" /tr "${batPath}" /sc onlogon /rl highest /f`;
    
    try {
      execSync(taskCmd, { encoding: 'utf8' });
      return { success: true, message: 'Task Scheduler task created' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async removeAutoStart() {
    try {
      execSync(`schtasks /delete /tn "${this.taskName}" /f`, { encoding: 'utf8' });
    } catch {
      // Task may not exist
    }

    // Remove bat file
    const batPath = path.join(this.getDataDir(), 'sync-daemon.bat');
    if (fs.existsSync(batPath)) {
      fs.unlinkSync(batPath);
    }

    return { success: true, message: 'Task removed' };
  }

  async getAutoStartStatus() {
    try {
      const output = execSync(`schtasks /query /tn "${this.taskName}" 2>&1`, { encoding: 'utf8' });
      return { enabled: true, installed: output.includes(this.taskName) };
    } catch {
      return { enabled: false, installed: false };
    }
  }

  async startService() {
    try {
      execSync(`schtasks /run /tn "${this.taskName}"`, { encoding: 'utf8' });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async stopService() {
    try {
      execSync(`schtasks /end /tn "${this.taskName}"`, { encoding: 'utf8' });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getServiceStatus() {
    try {
      const output = execSync(`schtasks /query /tn "${this.taskName}" /v /fo list`, { encoding: 'utf8' });
      const isRunning = output.includes('Running');
      
      return {
        running: isRunning,
        status: isRunning ? 'running' : 'ready'
      };
    } catch {
      return { running: false, status: 'not_installed' };
    }
  }

  getLogDir() {
    return path.join(process.env.APPDATA || process.env.USERPROFILE, 'openclaw', 'logs');
  }
}

module.exports = WindowsPlatform;
