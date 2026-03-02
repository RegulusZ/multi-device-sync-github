/**
 * File Watcher
 * Cross-platform file monitoring using chokidar
 */

const chokidar = require('chokidar');
const path = require('path');
const Logger = require('../utils/logger');

const logger = new Logger('FileWatcher');

class FileWatcher {
  constructor(options = {}) {
    this.syncRepo = options.syncRepo;
    this.onChange = options.onChange || (() => {});
    this.debounceMs = options.debounceMs || 2000;
    this.ignored = options.ignored || [
      /(^|[\/\\])\..*/,
      /node_modules/,
      /\.git/,
      /\.sync-conflicts/,
      /\.sync-conflict\.log/
    ];
    
    this.watcher = null;
    this.debounceTimer = null;
    this.pendingChanges = [];
    this.isPaused = false;
  }

  start() {
    if (this.watcher) {
      logger.warn('Watcher already running');
      return;
    }

    logger.info(`Starting file watcher on: ${this.syncRepo}`);

    this.watcher = chokidar.watch(this.syncRepo, {
      ignored: this.ignored,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher.on('all', (event, filePath) => {
      if (this.isPaused) return;
      
      const relativePath = path.relative(this.syncRepo, filePath);
      logger.debug(`File ${event}: ${relativePath}`);
      
      this.queueChange(event, relativePath);
    });

    this.watcher.on('error', (err) => {
      logger.error(`Watcher error: ${err.message}`);
    });

    this.watcher.on('ready', () => {
      logger.success('File watcher ready');
    });
  }

  queueChange(event, filePath) {
    this.pendingChanges.push({ event, filePath, time: Date.now() });
    
    // Debounce: wait for more changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      if (this.pendingChanges.length > 0) {
        const changes = [...this.pendingChanges];
        this.pendingChanges = [];
        this.onChange(changes);
      }
    }, this.debounceMs);
  }

  stop() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('File watcher stopped');
    }
  }

  pause() {
    this.isPaused = true;
    logger.info('File watcher paused');
  }

  resume() {
    this.isPaused = false;
    logger.info('File watcher resumed');
  }

  isRunning() {
    return this.watcher !== null;
  }
}

module.exports = FileWatcher;
