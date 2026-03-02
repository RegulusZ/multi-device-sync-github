/**
 * Conflict Resolver
 * Handles merge conflicts with interactive resolution
 */

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const Logger = require('../utils/logger');

const logger = new Logger('ConflictResolver');

class ConflictResolver {
  constructor(options = {}) {
    this.syncRepo = options.syncRepo;
    this.conflictFile = path.join(this.syncRepo, '.sync-conflicts');
  }

  async detect() {
    // Check for conflict marker file
    if (fs.existsSync(this.conflictFile)) {
      return this.loadConflicts();
    }
    return [];
  }

  async detectFromGit(gitOps) {
    const conflicted = await gitOps.getConflictedFiles();
    return conflicted;
  }

  hasConflicts() {
    return fs.existsSync(this.conflictFile);
  }

  saveConflicts(conflicts) {
    const data = {
      timestamp: new Date().toISOString(),
      conflicts: conflicts
    };
    fs.writeFileSync(this.conflictFile, JSON.stringify(data, null, 2));
    logger.info(`Saved ${conflicts.length} conflicts`);
  }

  loadConflicts() {
    if (!fs.existsSync(this.conflictFile)) {
      return [];
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.conflictFile, 'utf8'));
      return data.conflicts || [];
    } catch {
      return [];
    }
  }

  clearConflicts() {
    if (fs.existsSync(this.conflictFile)) {
      fs.unlinkSync(this.conflictFile);
      logger.info('Cleared conflict state');
    }
  }

  async resolveInteractive(conflicts, gitOps) {
    if (conflicts.length === 0) {
      logger.info('No conflicts to resolve');
      return { resolved: true };
    }

    logger.warn(`Found ${conflicts.length} conflicted file(s)`);

    for (const file of conflicts) {
      const choice = await this.resolveFile(file);
      
      switch (choice) {
        case 'local':
          await this.keepLocal(gitOps, file);
          break;
        case 'remote':
          await this.keepRemote(gitOps, file);
          break;
        case 'manual':
          await this.openEditor(file);
          break;
        case 'abort':
          return { resolved: false, aborted: true };
      }
    }

    this.clearConflicts();
    return { resolved: true };
  }

  async resolveFile(file) {
    const response = await prompts({
      type: 'select',
      name: 'choice',
      message: `Conflict in ${file}. How to resolve?`,
      choices: [
        { title: 'Keep local (ours)', value: 'local' },
        { title: 'Keep remote (theirs)', value: 'remote' },
        { title: 'Open in editor (manual)', value: 'manual' },
        { title: 'Abort sync', value: 'abort' }
      ]
    });

    return response.choice;
  }

  async keepLocal(gitOps, file) {
    logger.info(`Keeping local version: ${file}`);
    await gitOps.git.raw(['checkout', '--ours', file]);
    await gitOps.git.add(file);
  }

  async keepRemote(gitOps, file) {
    logger.info(`Keeping remote version: ${file}`);
    await gitOps.git.raw(['checkout', '--theirs', file]);
    await gitOps.git.add(file);
  }

  async openEditor(file) {
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
    const { execSync } = require('child_process');
    const fullPath = path.join(this.syncRepo, file);
    
    try {
      execSync(`${editor} "${fullPath}"`, { stdio: 'inherit' });
      logger.info(`Edited: ${file}`);
    } catch (err) {
      logger.error(`Failed to open editor: ${err.message}`);
    }
  }

  async autoResolve(gitOps, strategy = 'local') {
    const conflicts = await this.detectFromGit(gitOps);
    
    for (const file of conflicts) {
      if (strategy === 'local') {
        await this.keepLocal(gitOps, file);
      } else {
        await this.keepRemote(gitOps, file);
      }
    }

    this.clearConflicts();
    logger.success(`Auto-resolved ${conflicts.length} conflict(s) using ${strategy} strategy`);
    return conflicts.length;
  }
}

module.exports = ConflictResolver;
