'use strict';

const Homey = require('homey');
const RitualsApi = require('../../lib/RitualsApi');

module.exports = class DiffuserDriver extends Homey.Driver {

  async onInit() {
    this.homey.cloud.createWebhook(Homey.env.WEBHOOK_ID, Homey.env.WEBHOOK_SECRET, {})
      .then(webhook => {
        webhook.on('message', ({ body }) => {
          this.log('onWebhook', body);

          const devices = this.getDevices();
          const device = devices.find(device => {
            const { hash } = device.getStore();
            return hash === body.hub_hash;
          });

          if (device) {
            device.onWebhook({
              enabled: body.enabled,
              fill: body.fill,
              perfume: body.perfume,
            });
          }
        });
      })
      .catch(this.error);
  }

  async onPair(session) {
    let email = '';
    let password = '';
    let api;
    let hubs = [];

    session.setHandler('login', async data => {
      email = data.username;
      password = data.password;

      api = new RitualsApi({ email, password });
      hubs = await api.getHubs({ email, password });

      return true;
    });

    session.setHandler('list_devices', async () => {
      return hubs.map(hub => {
        const { account_hash } = api;
        const {
          id,
          room,
          hash,
        } = hub;

        return {
          name: room,
          data: { id },
          settings: {
            email,
            password,
          },
          store: {
            hash,
            account_hash,
          },
        };
      });
    });
  }

  async onRepair(session, device) {
    const { id } = device.getData();

    session.setHandler('login', async ({
      password,
      username: email,
    }) => {
      const api = new RitualsApi({ email, password });
      const hub = await api.getHubById({ id });

      await device.setSettings({ email, password });
      await device.setStoreValue('account_hash', api.account_hash);
      await device.setStoreValue('hash', hub.hash);

      device.hub = hub;

      return true;
    });
  }

};
