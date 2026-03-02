/**
 * Configuration Manager
 * Handles loading, saving, and validating sync configuration
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Conf = require('conf');

// Handle ES module default export
const ConfigStore = Conf.default || Conf;

const DEFAULT_CONFIG = {
  repo_url: '',
  sync_interval_minutes: 5,
  device_name: '',
  conflict_strategy: 'notify',
  auto_pull_on_start: true,
  auto_push_enabled: false,
  paths: {
    sync: [
      'USER.md',
      'MEMORY.md',
      'SOUL.md',
      'skills/',
      'memory/'
    ],
    ignore: [
      'logs/',
      'temp/',
      '*.log',
      'node_modules/',
      '.git/'
    ]
  }
};

class ConfigManager {
  constructor() {
    this.configDir = this.getConfigDir();
    this.configPath = path.join(this.configDir, 'sync-config.yaml');
    this.config = null;
    try {
      this.store = new ConfigStore({
        projectName: 'openclaw-sync',
        defaults: DEFAULT_CONFIG
      });
    } catch (err) {
      // Store is optional, we use YAML file as primary
      this.store = null;
    }
  }

  getConfigDir() {
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(process.env.APPDATA || process.env.USERPROFILE, 'openclaw');
    }
    return path.join(process.env.HOME, '.config', 'openclaw');
  }

  load() {
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf8');
        this.config = { ...DEFAULT_CONFIG, ...yaml.load(content) };
      } catch (err) {
        console.warn(`Failed to load config: ${err.message}`);
        this.config = { ...DEFAULT_CONFIG };
      }
    } else {
      this.config = { ...DEFAULT_CONFIG };
    }
    return this.config;
  }

  save(config) {
    this.config = { ...this.config, ...config };
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, yaml.dump(this.config, { indent: 2 }));
    if (this.store) {
      try {
        this.store.set(this.config);
      } catch {}
    }
  }

  get(key) {
    if (!this.config) this.load();
    return key ? this.config[key] : this.config;
  }

  set(key, value) {
    if (!this.config) this.load();
    this.config[key] = value;
    this.save(this.config);
  }

  validate() {
    const errors = [];
    if (!this.config.repo_url) {
      errors.push('repo_url is required');
    }
    if (!this.config.device_name) {
      errors.push('device_name is required');
    }
    return errors;
  }

  isConfigured() {
    return this.validate().length === 0;
  }
}

module.exports = ConfigManager;
