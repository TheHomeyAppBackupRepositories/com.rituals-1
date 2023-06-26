'use strict';

class RitualsHub {

  constructor({ hub, api }) {
    this._hub = hub;
    this._api = api;
  }

  get api() {
    return this._api;
  }

  get id() {
    return this._hub.hublot;
  }

  get hash() {
    return this._hub.hash;
  }

  get name() {
    return this._hub.title;
  }

  get wifiSignal() {
    return this._hub.sensors.wific.title;
  }

  get battery() {
    return this._hub.sensors.battc.title;
  }

  get fill() {
    return this._hub.sensors.fillc.title;
  }

  get perfume() {
    return this._hub.sensors.rfidc.title;
  }

  get enabled() {
    return this._hub.attributes.fanc === '1';
  }

  get room() {
    return this._hub.attributes.roomnamec;
  }

  async setAttr(attr) {
    return this._api.setAttr({
      attr,
      hub: this,
    });
  }

  async setEnabled({ enabled }) {
    return this.setAttr({
      fanc: enabled ? '1' : '0',
    });
  }

  async registerWebhook({ homeyId }) {
    return this._api.registerWebhook({
      homeyId,
      hub: this,
    });
  }

}

module.exports = RitualsHub;
