import { isString } from '@ircam/sc-utils';
import pluginFilesystem from '@soundworks/plugin-filesystem/client.js';

import { sanitizeScriptName } from '../common/utils.js';
import Script from '../common/Script';

const scriptStoreSymbol = Symbol('sw:plugin:scripting');

globalThis.getGlobalScriptingContext = function() {
  return globalThis[scriptStoreSymbol];
}

const pluginFactory = function(Plugin) {
  class PluginScriptingClient extends Plugin {
    constructor(client, id, options) {
      super(client, id);

      const defaults = {};

      this.options = this.configure(defaults, options);

      this._internalsState = null;
      this._filesystem = null;

      this.client.pluginManager.register(`sw:plugin:${this.id}:filesystem`, pluginFilesystem);
    }

    /** @private */
    async start() {
      this._internalsState = await this.client.stateManager.attach(`sw:plugin:${this.id}:internals`);
      this._filesystem = await this.client.pluginManager.unsafeGet(`sw:plugin:${this.id}:filesystem`);
    }

    /**
     * Registers a global context object to be used in scripts. Note that the
     * context is store globally, so several scripting plugins running in parallel
     * will share the same underlying object. The global `getGlobalScriptingContext`
     * function will allow to retrieve the given object from within scripts.
     * @param {Object} ctx - Object to store in global context
     */
    setGlobalScriptingContext(ctx) {
      globalThis[scriptStoreSymbol] = ctx;
    }

    /**
     * Returns the list of all available scripts.
     * @returns {Array}
     */
    getScriptNames() {
      return this._internalsState.get('nameList');
    }

    /**
     * Convenience method that return the underlying filesystem tree. Can be
     * usefull to reuse components created for the filesystem (e.g. sc-filesystem)
     * @returns {Object}
     */
    getTree() {
      return this._filesystem.getTree();
    }

    async createScript(name, value = '') {

    }

    async updateScript(name, value) {

    }

    async deleteScript(name) {

    }

    async attach(name) {

    }
  }

  return PluginScriptingClient;
}

export default pluginFactory;
