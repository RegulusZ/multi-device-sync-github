/**
 * Git Operations
 * Wrapper around simple-git for sync operations
 */

const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

const logger = new Logger('GitOps');

class GitOperations {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async init() {
    if (!fs.existsSync(this.repoPath)) {
      fs.mkdirSync(this.repoPath, { recursive: true });
    }
    
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      await this.git.init();
      logger.info('Initialized new git repository');
    }
  }

  async clone(repoUrl, localPath) {
    logger.info(`Cloning ${repoUrl} to ${localPath}`);
    await simpleGit().clone(repoUrl, localPath);
    this.git = simpleGit(localPath);
    logger.success('Clone completed');
  }

  async status() {
    return await this.git.status();
  }

  async hasChanges() {
    const status = await this.status();
    return !status.isClean();
  }

  async pull(remote = 'origin', branch = 'main') {
    try {
      logger.info(`Pulling from ${remote}/${branch}`);
      const result = await this.git.pull(remote, branch, { '--rebase': 'false' });
      logger.success('Pull completed');
      return { success: true, result };
    } catch (err) {
      if (err.message.includes('CONFLICT')) {
        logger.warn('Merge conflict detected');
        return { success: false, conflict: true, error: err.message };
      }
      logger.error(`Pull failed: ${err.message}`);
      return { success: false, conflict: false, error: err.message };
    }
  }

  async push(remote = 'origin', branch = 'main') {
    try {
      logger.info(`Pushing to ${remote}/${branch}`);
      await this.git.push(remote, branch);
      logger.success('Push completed');
      return { success: true };
    } catch (err) {
      logger.error(`Push failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async addAll() {
    await this.git.add('.');
  }

  async commit(message) {
    const status = await this.status();
    if (status.isClean()) {
      logger.info('No changes to commit');
      return { committed: false };
    }
    
    await this.git.commit(message);
    logger.success(`Committed: ${message}`);
    return { committed: true };
  }

  async getRemoteUrl() {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      return origin ? origin.refs.fetch : null;
    } catch {
      return null;
    }
  }

  async addRemote(name, url) {
    try {
      await this.git.addRemote(name, url);
      logger.info(`Added remote: ${name} -> ${url}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        await this.git.removeRemote(name);
        await this.git.addRemote(name, url);
        logger.info(`Updated remote: ${name} -> ${url}`);
      }
    }
  }

  async getConflictedFiles() {
    const status = await this.status();
    return status.conflicted || [];
  }

  async getLocalChanges() {
    const status = await this.status();
    return {
      staged: status.staged,
      modified: status.modified,
      created: status.created,
      deleted: status.deleted
    };
  }

  async getConfig(key) {
    try {
      return await this.git.raw(['config', '--get', key]);
    } catch {
      return null;
    }
  }

  async setConfig(key, value) {
    await this.git.addConfig(key, value);
  }
}

module.exports = GitOperations;
