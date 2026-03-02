/**
 * Logger utility
 * Cross-platform logging with file and console output
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class Logger {
  constructor(name) {
    this.name = name;
    this.logDir = this.getLogDir();
    this.logFile = path.join(this.logDir, 'sync.log');
    this.ensureLogDir();
  }

  getLogDir() {
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(process.env.APPDATA || process.env.USERPROFILE, 'openclaw', 'logs');
    }
    return path.join(os.homedir(), '.openclaw', 'logs');
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.name}] ${message}`;
  }

  writeToFile(formatted) {
    fs.appendFileSync(this.logFile, formatted + '\n');
  }

  info(message) {
    const formatted = this.formatMessage('INFO', message);
    console.log('\x1b[36m%s\x1b[0m', formatted);
    this.writeToFile(formatted);
  }

  warn(message) {
    const formatted = this.formatMessage('WARN', message);
    console.log('\x1b[33m%s\x1b[0m', formatted);
    this.writeToFile(formatted);
  }

  error(message) {
    const formatted = this.formatMessage('ERROR', message);
    console.error('\x1b[31m%s\x1b[0m', formatted);
    this.writeToFile(formatted);
  }

  success(message) {
    const formatted = this.formatMessage('SUCCESS', message);
    console.log('\x1b[32m%s\x1b[0m', formatted);
    this.writeToFile(formatted);
  }

  debug(message) {
    if (process.env.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message);
      console.log('\x1b[90m%s\x1b[0m', formatted);
      this.writeToFile(formatted);
    }
  }
}

module.exports = Logger;
