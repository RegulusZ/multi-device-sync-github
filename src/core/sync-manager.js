/**
 * Sync Manager
 * Core synchronization logic for multi-device sync
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const Logger = require('../utils/logger');
const ConfigManager = require('../utils/config');
const GitOperations = require('./git-ops');
const FileWatcher = require('./file-watcher');
const ConflictResolver = require('./conflict-resolver');
const Notifier = require('../utils/notify');

const logger = new Logger('SyncManager');

class SyncManager {
  constructor() {
    this.config = new ConfigManager();
    this.git = null;
    this.watcher = null;
    this.resolver = null;
    this.notifier = new Notifier();
    this.pullTimer = null;
    
    // Paths
    this.workspacePath = this.getWorkspacePath();
    this.syncRepoPath = this.getSyncRepoPath();
  }

  getWorkspacePath() {
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(process.env.USERPROFILE, '.openclaw', 'workspace');
    }
    return path.join(os.homedir(), '.openclaw', 'workspace');
  }

  getSyncRepoPath() {
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(process.env.USERPROFILE, 'openclaw-sync');
    }
    return path.join(os.homedir(), 'openclaw-sync');
  }

  // ==================== Setup & Initialization ====================

  async initialize(options = {}) {
    const { repoUrl, deviceName, syncPaths, interactive = true } = options;

    logger.info('Initializing sync manager...');

    // Load existing config or create new
    this.config.load();
    
    if (repoUrl) {
      this.config.set('repo_url', repoUrl);
    }
    if (deviceName) {
      this.config.set('device_name', deviceName);
    }
    if (syncPaths) {
      this.config.set('paths', { ...this.config.get('paths'), sync: syncPaths });
    }

    // Initialize sync repo
    await this.initSyncRepo();

    // Setup symlinks
    await this.setupSymlinks();

    logger.success('Sync manager initialized');
    return { success: true };
  }

  async initSyncRepo() {
    const repoUrl = this.config.get('repo_url');
    
    if (!repoUrl) {
      throw new Error('repo_url is required. Run setup first.');
    }

    // Clone or open existing repo
    if (fs.existsSync(this.syncRepoPath)) {
      logger.info('Opening existing sync repo');
      this.git = new GitOperations(this.syncRepoPath);
    } else {
      logger.info('Cloning sync repo...');
      await GitOperations.prototype.clone(repoUrl, this.syncRepoPath);
      this.git = new GitOperations(this.syncRepoPath);
    }

    // Configure git user if not set
    await this.ensureGitConfig();
  }

  async ensureGitConfig() {
    const deviceName = this.config.get('device_name') || os.hostname();
    let userName = await this.git.getConfig('user.name');
    let userEmail = await this.git.getConfig('user.email');
    
    if (!userName) {
      await this.git.setConfig('user.name', `OpenClaw Sync (${deviceName})`);
    }
    if (!userEmail) {
      await this.git.setConfig('user.email', `sync@${deviceName}.openclaw.local`);
    }
  }

  async setupSymlinks() {
    const syncPaths = this.config.get('paths').sync;
    const created = [];
    const skipped = [];

    for (const relPath of syncPaths) {
      const sourcePath = path.join(this.syncRepoPath, relPath);
      const targetPath = path.join(this.workspacePath, relPath);

      // Check if target already exists
      if (fs.existsSync(targetPath) || fs.lstatSync(targetPath).isSymbolicLink?.()) {
        // If it's already a symlink to our repo, skip
        try {
          const realPath = fs.readlinkSync(targetPath);
          if (realPath === sourcePath) {
            skipped.push({ path: relPath, reason: 'already linked' });
            continue;
          }
        } catch {
          // Not a symlink, backup and replace
          const backupPath = `${targetPath}.backup.${Date.now()}`;
          fs.renameSync(targetPath, backupPath);
          logger.info(`Backed up: ${relPath} -> ${path.basename(backupPath)}`);
        }
      }

      // Ensure source exists
      if (!fs.existsSync(sourcePath)) {
        if (relPath.endsWith('/')) {
          fs.mkdirSync(sourcePath, { recursive: true });
        } else {
          // Copy from workspace if exists, or create empty
          if (fs.existsSync(targetPath)) {
            fs.copyFileSync(targetPath, sourcePath);
          } else {
            fs.writeFileSync(sourcePath, '');
          }
        }
      }

      // Create symlink
      this.createSymlink(sourcePath, targetPath);
      created.push(relPath);
    }

    logger.success(`Symlinks: ${created.length} created, ${skipped.length} skipped`);
    return { created, skipped };
  }

  createSymlink(source, target) {
    // Ensure parent directory exists
    const parentDir = path.dirname(target);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Platform-specific symlink
    const platform = process.platform;
    if (platform === 'win32') {
      // Windows: use junction for directories, file symlink for files
      const isDir = fs.statSync(source).isDirectory();
      if (isDir) {
        fs.symlinkSync(source, target, 'junction');
      } else {
        fs.symlinkSync(source, target, 'file');
      }
    } else {
      // Unix: standard symlink
      fs.symlinkSync(source, target);
    }
  }

  // ==================== Sync Operations ====================

  async syncNow() {
    if (!this.git) {
      this.git = new GitOperations(this.syncRepoPath);
    }

    logger.info('Starting sync...');

    // Check for conflicts first
    if (this.resolver?.hasConflicts()) {
      logger.warn('Conflicts detected, sync paused');
      this.notifier.conflict('Please resolve conflicts before syncing');
      return { success: false, reason: 'conflicts' };
    }

    // Pull first
    const pullResult = await this.pull();
    
    if (pullResult.conflict) {
      return { success: false, reason: 'conflict', files: pullResult.conflictedFiles };
    }

    // Then push
    const pushResult = await this.push();

    return { success: true, pulled: pullResult.changes, pushed: pushResult.committed };
  }

  async pull() {
    logger.info('Pulling from remote...');
    
    const result = await this.git.pull();
    
    if (result.success) {
      const status = await this.git.status();
      logger.success(`Pull completed, ${status.ahead} ahead, ${status.behind} behind`);
      return { success: true, changes: result.result };
    }
    
    if (result.conflict) {
      logger.error('Merge conflict during pull');
      this.resolver = new ConflictResolver({ syncRepo: this.syncRepoPath });
      const conflicts = await this.resolver.detectFromGit(this.git);
      this.resolver.saveConflicts(conflicts);
      this.notifier.conflict(`Found ${conflicts.length} conflict(s)`);
      return { success: false, conflict: true, conflictedFiles: conflicts };
    }

    return { success: false, error: result.error };
  }

  async push() {
    logger.info('Pushing to remote...');
    
    // Add all changes
    await this.git.addAll();
    
    // Commit
    const deviceName = this.config.get('device_name') || os.hostname();
    const commitResult = await this.git.commit(`Sync from ${deviceName} at ${new Date().toISOString()}`);
    
    if (!commitResult.committed) {
      logger.info('No changes to push');
      return { success: true, committed: false };
    }

    // Push
    const pushResult = await this.git.push();
    
    if (pushResult.success) {
      this.notifier.success('Changes synced to remote');
    }
    
    return pushResult;
  }

  // ==================== Background Sync ====================

  startBackgroundSync() {
    const interval = this.config.get('sync_interval_minutes') || 5;
    
    // Start pull timer
    this.pullTimer = setInterval(async () => {
      if (this.resolver?.hasConflicts()) {
        logger.debug('Skipping pull due to conflicts');
        return;
      }
      await this.pull();
    }, interval * 60 * 1000);

    // Start file watcher for auto-push
    if (this.config.get('auto_push_enabled')) {
      this.startWatcher();
    }

    logger.success(`Background sync started (pull: every ${interval}min, auto-push: ${this.config.get('auto_push_enabled')})`);
  }

  stopBackgroundSync() {
    if (this.pullTimer) {
      clearInterval(this.pullTimer);
      this.pullTimer = null;
    }
    
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }

    logger.info('Background sync stopped');
  }

  startWatcher() {
    if (this.watcher?.isRunning()) {
      logger.warn('Watcher already running');
      return;
    }

    this.watcher = new FileWatcher({
      syncRepo: this.syncRepoPath,
      debounceMs: 2000,
      onChange: async (changes) => {
        logger.debug(`Changes detected: ${changes.length} files`);
        
        if (this.resolver?.hasConflicts()) {
          logger.debug('Skipping push due to conflicts');
          return;
        }

        await this.push();
      }
    });

    this.watcher.start();
  }

  // ==================== Status & Info ====================

  async getStatus() {
    const config = this.config.load();
    const isConfigured = this.config.isConfigured();
    
    let gitStatus = null;
    let hasConflicts = false;

    if (isConfigured && fs.existsSync(this.syncRepoPath)) {
      this.git = this.git || new GitOperations(this.syncRepoPath);
      gitStatus = await this.git.status();
      
      this.resolver = this.resolver || new ConflictResolver({ syncRepo: this.syncRepoPath });
      hasConflicts = this.resolver.hasConflicts();
    }

    return {
      configured: isConfigured,
      deviceName: config.device_name,
      repoUrl: config.repo_url ? this.maskUrl(config.repo_url) : null,
      syncInterval: config.sync_interval_minutes,
      autoPush: config.auto_push_enabled,
      syncRepoPath: this.syncRepoPath,
      workspacePath: this.workspacePath,
      git: gitStatus ? {
        ahead: gitStatus.ahead,
        behind: gitStatus.behind,
        modified: gitStatus.modified.length,
        staged: gitStatus.staged.length
      } : null,
      conflicts: hasConflicts,
      watcherRunning: this.watcher?.isRunning() || false,
      pullTimerRunning: this.pullTimer !== null
    };
  }

  maskUrl(url) {
    // Hide sensitive parts of URL
    return url.replace(/(https?:\/\/[^:]+:)[^@]+@/, '$1***@');
  }

  // ==================== Conflict Resolution ====================

  async resolveConflicts() {
    if (!this.resolver) {
      this.resolver = new ConflictResolver({ syncRepo: this.syncRepoPath });
    }

    const conflicts = await this.resolver.detectFromGit(this.git);
    
    if (conflicts.length === 0) {
      this.resolver.clearConflicts();
      return { resolved: true, message: 'No conflicts found' };
    }

    const result = await this.resolver.resolveInteractive(conflicts, this.git);
    
    if (result.resolved) {
      // Commit the resolution
      await this.git.commit('Resolved sync conflicts');
      this.notifier.success('Conflicts resolved');
    }

    return result;
  }
}

module.exports = SyncManager;
