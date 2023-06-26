'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const RitualsHub = require('./RitualsHub');

module.exports = class RitualsApi {

  static BASE_URL = 'https://rituals.sense-company.com';
  static USER_AGENT = `Homey com.rituals@${Homey.manifest.version}`;

  constructor({ email, password, account_hash }) {
    this.email = email || null;
    this.password = password || null;
    this.account_hash = account_hash || null;
  }

  async login() {
    const res = await fetch(`${this.constructor.BASE_URL}/ocapi/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: this.email,
        password: this.password,
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.constructor.USER_AGENT,
      },
    });

    if (res.status === 429) {
      if (res.headers.get('retry-after')) {
        throw new Error(`Too Many Requests — Retry after ${res.headers.get('retry-after')} seconds.`);
      }
      throw new Error('Too Many Requests');
    }

    const body = await res.json();
    if (body.error) throw new Error(body.error);
    if (!res.ok) throw new Error(res.statusText || 'unknown_error');

    if (body.account_hash) {
      this.account_hash = body.account_hash;
    }

    return body;
  }

  async getHubs() {
    if (!this.account_hash) {
      await this.login();
    }

    const res = await fetch(`${this.constructor.BASE_URL}/api/account/hubs/${this.account_hash}`, {
      headers: {
        'User-Agent': this.constructor.USER_AGENT,
      },
    });
    if (!res.ok) {
      throw new Error(res.statusText || 'Cannot get Hubs');
    }

    const body = await res.json();

    return Promise.all(body.map(({ hub }) => {
      const { hash } = hub;
      return this.getHubByHash({ hash });
    }));
  }

  async getHubByHash({ hash }) {
    const res = await fetch(`${this.constructor.BASE_URL}/api/account/hub/${hash}`, {
      headers: {
        'User-Agent': this.constructor.USER_AGENT,
      },
    });
    if (!res.ok) {
      throw new Error(res.statusText || 'Cannot get Hub');
    }

    const { hub } = await res.json();
    return new RitualsHub({
      hub,
      api: this,
    });
  }

  async getHubById({ id }) {
    const hubs = await this.getHubs();
    const hub = hubs.find(hub => hub.id === id);
    if (!hub) throw new Error(`Cannot Find Hub: ${id}`);
    return hub;
  }

  async setAttr({ hub, attr }) {
    const params = new URLSearchParams();
    params.append('hub', hub.hash);
    params.append('json', JSON.stringify({ attr }));

    const res = await fetch(`${this.constructor.BASE_URL}/api/hub/update/attr`, {
      method: 'POST',
      body: params,
      headers: {
        'User-Agent': this.constructor.USER_AGENT,
      },
    });
    if (!res.ok) throw new Error(res.statusText || 'unknown_error');
  }

  async setTitle({ hub, title }) {
    const params = new URLSearchParams();
    params.append('hub', hub);
    params.append('title', title);

    const res = await fetch(`${this.constructor.BASE_URL}/api/hub/update/title`, {
      method: 'POST',
      body: params,
      headers: {
        'User-Agent': this.constructor.USER_AGENT,
      },
    });
    if (!res.ok) throw new Error(res.statusText || 'unknown_error');
  }

  async registerWebhook({ hub, homeyId }) {
    const res = await fetch(`${this.constructor.BASE_URL}/api/account/hubs/${hub.hash}/homey`, {
      method: 'POST',
      body: JSON.stringify({
        homey_id: homeyId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.constructor.USER_AGENT,
      },
    });
    if (!res.ok) throw new Error(res.statusText || 'unknown_error');
  }

};
