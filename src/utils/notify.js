/**
 * Notification utility
 * Cross-platform desktop notifications
 */

const notifier = require('node-notifier');
const path = require('path');

class Notifier {
  constructor() {
    this.enabled = true;
  }

  notify({ title, message, sound = false }) {
    if (!this.enabled) return;

    notifier.notify({
      title: title || 'OpenClaw Sync',
      message: message,
      sound: sound,
      icon: this.getIcon(),
      wait: false
    });
  }

  getIcon() {
    // Return path to icon if available
    return undefined;
  }

  success(message) {
    this.notify({ title: '✅ Sync Success', message });
  }

  error(message) {
    this.notify({ title: '❌ Sync Error', message, sound: true });
  }

  conflict(message) {
    this.notify({ title: '⚠️ Sync Conflict', message, sound: true });
  }

  info(message) {
    this.notify({ title: 'ℹ️ Sync Info', message });
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}

module.exports = Notifier;
