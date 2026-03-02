/**
 * Base Platform
 * Abstract base class for platform-specific implementations
 */

class BasePlatform {
  constructor() {
    if (this.constructor === BasePlatform) {
      throw new Error('BasePlatform is abstract and cannot be instantiated directly');
    }
  }

  get name() {
    throw new Error('Platform name must be implemented');
  }

  async setupAutoStart(options) {
    throw new Error('setupAutoStart must be implemented');
  }

  async removeAutoStart() {
    throw new Error('removeAutoStart must be implemented');
  }

  async getAutoStartStatus() {
    throw new Error('getAutoStartStatus must be implemented');
  }

  async startService() {
    throw new Error('startService must be implemented');
  }

  async stopService() {
    throw new Error('stopService must be implemented');
  }

  async getServiceStatus() {
    throw new Error('getServiceStatus must be implemented');
  }

  getDataDir() {
    throw new Error('getDataDir must be implemented');
  }

  getConfigDir() {
    throw new Error('getConfigDir must be implemented');
  }

  getLogDir() {
    throw new Error('getLogDir must be implemented');
  }
}

module.exports = BasePlatform;
