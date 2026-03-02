#!/usr/bin/env node
/**
 * CLI Entry Point
 * Command-line interface for multi-device sync
 */

const { Command } = require('commander');
const prompts = require('prompts');
const ora = require('ora');
const path = require('path');
const fs = require('fs');

const SyncManager = require('./src/core/sync-manager');
const { getPlatform } = require('./src/platforms');

const program = new Command();

program
  .name('openclaw-sync')
  .description('Multi-device OpenClaw synchronization via GitHub')
  .version('2.0.0');

// ==================== Setup Command ====================
program
  .command('setup')
  .description('Interactive setup for multi-device sync')
  .option('-u, --repo-url <url>', 'GitHub repository URL')
  .option('-d, --device-name <name>', 'Device name')
  .option('--non-interactive', 'Skip prompts, use options')
  .action(async (options) => {
    const spinner = ora('Setting up sync...').start();
    
    try {
      const manager = new SyncManager();
      
      let config = {};
      
      if (!options.nonInteractive) {
        spinner.stop();
        
        const answers = await prompts([
          {
            type: options.repoUrl ? null : 'text',
            name: 'repoUrl',
            message: 'GitHub repository URL (SSH or HTTPS):',
            validate: v => v.startsWith('git@') || v.startsWith('https://') ? true : 'Invalid URL'
          },
          {
            type: options.deviceName ? null : 'text',
            name: 'deviceName',
            message: 'Device name (e.g., ubuntu, mac-mini):',
            initial: require('os').hostname().split('.')[0]
          },
          {
            type: 'confirm',
            name: 'autoPush',
            message: 'Enable auto-push on file changes?',
            initial: false
          },
          {
            type: 'number',
            name: 'interval',
            message: 'Pull interval (minutes):',
            initial: 5
          }
        ]);
        
        config = {
          repoUrl: options.repoUrl || answers.repoUrl,
          deviceName: options.deviceName || answers.deviceName,
          autoPush: answers.autoPush,
          interval: answers.interval
        };
        
        spinner.start();
      } else {
        config = {
          repoUrl: options.repoUrl,
          deviceName: options.deviceName
        };
      }

      await manager.initialize(config);
      
      manager.config.set('auto_push_enabled', config.autoPush || false);
      manager.config.set('sync_interval_minutes', config.interval || 5);
      
      spinner.succeed('Setup completed!');
      
      console.log('\nNext steps:');
      console.log('  1. Run `openclaw-sync start` to start background sync');
      console.log('  2. Or run `openclaw-sync sync` for manual sync\n');
      
    } catch (err) {
      spinner.fail(`Setup failed: ${err.message}`);
      process.exit(1);
    }
  });

// ==================== Sync Command ====================
program
  .command('sync')
  .description('Perform immediate sync (pull + push)')
  .action(async () => {
    const spinner = ora('Syncing...').start();
    
    try {
      const manager = new SyncManager();
      const result = await manager.syncNow();
      
      if (result.success) {
        spinner.succeed('Sync completed!');
      } else if (result.reason === 'conflicts') {
        spinner.fail('Conflicts detected!');
        console.log('\nRun `openclaw-sync resolve` to resolve conflicts.\n');
      } else {
        spinner.fail(`Sync failed: ${result.reason || result.error}`);
      }
    } catch (err) {
      spinner.fail(`Sync failed: ${err.message}`);
      process.exit(1);
    }
  });

// ==================== Status Command ====================
program
  .command('status')
  .description('Show sync status')
  .action(async () => {
    try {
      const manager = new SyncManager();
      const status = await manager.getStatus();
      
      console.log('\n=== OpenClaw Sync Status ===\n');
      console.log(`Configured: ${status.configured ? '✅' : '❌'}`);
      
      if (status.configured) {
        console.log(`Device: ${status.deviceName}`);
        console.log(`Repo: ${status.repoUrl}`);
        console.log(`Auto-push: ${status.autoPush ? '✅' : '❌'}`);
        console.log(`Pull interval: ${status.syncInterval} min`);
        
        if (status.git) {
          console.log(`\nGit status:`);
          console.log(`  Ahead: ${status.git.ahead}`);
          console.log(`  Behind: ${status.git.behind}`);
          console.log(`  Modified: ${status.git.modified}`);
        }
        
        if (status.conflicts) {
          console.log('\n⚠️  Conflicts detected! Run `resolve` command.');
        }
      }
      
      console.log('');
    } catch (err) {
      console.error(`Failed to get status: ${err.message}`);
      process.exit(1);
    }
  });

// ==================== Resolve Command ====================
program
  .command('resolve')
  .description('Resolve sync conflicts interactively')
  .action(async () => {
    try {
      const manager = new SyncManager();
      const result = await manager.resolveConflicts();
      
      if (result.resolved) {
        console.log('✅ Conflicts resolved!');
      } else if (result.aborted) {
        console.log('Resolution aborted.');
      }
    } catch (err) {
      console.error(`Failed to resolve: ${err.message}`);
      process.exit(1);
    }
  });

// ==================== Start Command ====================
program
  .command('start')
  .description('Start background sync service')
  .option('--no-auto-start', 'Do not setup auto-start on boot')
  .action(async (options) => {
    const spinner = ora('Starting sync service...').start();
    
    try {
      const manager = new SyncManager();
      manager.startBackgroundSync();
      
      if (options.autoStart) {
        const platform = getPlatform();
        await platform.setupAutoStart();
        spinner.succeed('Background sync started and auto-start enabled!');
      } else {
        spinner.succeed('Background sync started!');
      }
      
      console.log('\nPress Ctrl+C to stop.\n');
      
      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\nStopping...');
        manager.stopBackgroundSync();
        process.exit(0);
      });
      
      // Wait forever
      await new Promise(() => {});
      
    } catch (err) {
      spinner.fail(`Failed to start: ${err.message}`);
      process.exit(1);
    }
  });

// ==================== Stop Command ====================
program
  .command('stop')
  .description('Stop background sync service')
  .action(async () => {
    const spinner = ora('Stopping sync service...').start();
    
    try {
      const platform = getPlatform();
      await platform.stopService();
      spinner.succeed('Sync service stopped');
    } catch (err) {
      spinner.fail(`Failed to stop: ${err.message}`);
      process.exit(1);
    }
  });

// ==================== Daemon Command ====================
program
  .command('daemon')
  .description('Run as daemon (internal use)')
  .action(async () => {
    try {
      const manager = new SyncManager();
      manager.startBackgroundSync();
      
      // Keep alive
      process.on('SIGTERM', () => {
        manager.stopBackgroundSync();
        process.exit(0);
      });
      
      await new Promise(() => {});
    } catch (err) {
      console.error(`Daemon error: ${err.message}`);
      process.exit(1);
    }
  });

// ==================== Add Device Command ====================
program
  .command('add-device')
  .description('Add a new device to sync network')
  .action(async () => {
    const answers = await prompts([
      {
        type: 'text',
        name: 'repoUrl',
        message: 'Existing sync repository URL:',
        validate: v => v ? true : 'Required'
      },
      {
        type: 'text',
        name: 'deviceName',
        message: 'New device name:',
        initial: require('os').hostname().split('.')[0]
      }
    ]);
    
    const spinner = ora('Adding device...').start();
    
    try {
      const manager = new SyncManager();
      await manager.initialize({
        repoUrl: answers.repoUrl,
        deviceName: answers.deviceName
      });
      
      spinner.succeed('Device added successfully!');
      console.log('\nRun `openclaw-sync start` to begin syncing.\n');
    } catch (err) {
      spinner.fail(`Failed to add device: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
