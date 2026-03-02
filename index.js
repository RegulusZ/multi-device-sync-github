/**
 * OpenClaw Skill Entry Point
 * Provides the API for OpenClaw to interact with this skill
 */

const SyncManager = require('./src/core/sync-manager');

let manager = null;

function getManager() {
  if (!manager) {
    manager = new SyncManager();
  }
  return manager;
}

module.exports = {
  name: 'multi-device-sync-github',
  version: '2.0.0',
  description: 'Multi-device OpenClaw data synchronization using GitHub (cross-platform)',
  
  /**
   * Setup cross-device sync
   * @param {Object} params - Setup parameters
   * @param {string} params.repoUrl - GitHub repository URL
   * @param {string} params.deviceName - Unique device name
   * @param {string[]} params.syncPaths - Paths to sync (relative to workspace)
   */
  async setup(params = {}) {
    const mgr = getManager();
    return await mgr.initialize(params);
  },
  
  /**
   * Perform immediate sync
   */
  async sync_now() {
    const mgr = getManager();
    return await mgr.syncNow();
  },
  
  /**
   * Pull changes from remote
   */
  async sync_pull() {
    const mgr = getManager();
    return await mgr.pull();
  },
  
  /**
   * Push changes to remote
   */
  async sync_push() {
    const mgr = getManager();
    return await mgr.push();
  },
  
  /**
   * Check sync status
   */
  async check_status() {
    const mgr = getManager();
    return await mgr.getStatus();
  },
  
  /**
   * Resolve conflicts interactively
   */
  async resolve_conflicts() {
    const mgr = getManager();
    return await mgr.resolveConflicts();
  },
  
  /**
   * Start background sync
   */
  async start_sync() {
    const mgr = getManager();
    mgr.startBackgroundSync();
    return { success: true, message: 'Background sync started' };
  },
  
  /**
   * Stop background sync
   */
  async stop_sync() {
    const mgr = getManager();
    mgr.stopBackgroundSync();
    return { success: true, message: 'Background sync stopped' };
  },
  
  /**
   * Configure sync settings
   */
  async configure(options) {
    const mgr = getManager();
    mgr.config.save(options);
    return { success: true };
  }
};
