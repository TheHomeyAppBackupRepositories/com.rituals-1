'use strict';

const Homey = require('homey');
const RitualsApi = require('../../lib/RitualsApi');

module.exports = class DiffuserDevice extends Homey.Device {

  static SYNC_INTERVAL = 1000 * 60 * 15; // 15 min

  async onInit() {
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

    this.sync();
    this.syncInterval = setInterval(() => this.sync(), this.constructor.SYNC_INTERVAL);

    this.registerWebhook();
  }

  async onDeleted() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  async onCapabilityOnoff(enabled) {
    const hub = await this.getHub();
    return hub.setEnabled({ enabled });
  }

  registerWebhook() {
    Promise.resolve().then(async () => {
      const homeyId = await this.homey.cloud.getHomeyId();
      const hub = await this.getHub();
      await hub.registerWebhook({ homeyId });
    }).catch(this.error);
  }

  sync() {
    Promise.resolve().then(async () => {
      const {
        fill,
        perfume,
        enabled,
      } = await this.getHub({ cache: false });

      await Promise.all([
        this.setCapabilityValue('onoff', enabled),
        this.setCapabilityValue('rituals_perfume', perfume),
        this.setCapabilityValue('rituals_fill', fill),
        this.setAvailable(),
      ]);
    }).catch(err => {
      this.error('Sync error:', err.message);
      this.setUnavailable(err.message || 'The data for this device could not be synchronized.').catch(this.error);
    });
  }

  async getHub({ cache = true } = {}) {
    if (!this.hub || cache === false) {
      const { id } = this.getData();
      const { email, password } = this.getSettings();
      const { account_hash, hash } = this.getStore();

      const api = new RitualsApi({ email, password, account_hash });

      if (hash) {
        this.hub = await api.getHubByHash({ hash });
      } else {
        this.log('Hash not found, getting hash...');
        this.hub = await api.getHubById({ id });
        await this.setStoreValue('hash', this.hub.hash);
      }
    }

    return this.hub;
  }

  onWebhook({ enabled, perfume, fill }) {
    if (typeof enabled === 'number') {
      this.setCapabilityValue('onoff', enabled === 1).catch(this.error);
    }

    if (typeof enabled === 'boolean') {
      this.setCapabilityValue('onoff', enabled).catch(this.error);
    }

    if (typeof perfume === 'string') {
      this.setCapabilityValue('rituals_perfume', perfume).catch(this.error);
    }

    if (typeof fill === 'string') {
      this.setCapabilityValue('rituals_fill', fill).catch(this.error);
    }
  }

};
