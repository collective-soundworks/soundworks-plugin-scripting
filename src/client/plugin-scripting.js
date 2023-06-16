import { isString } from '@ircam/sc-utils';
import pluginFilesystem from '@soundworks/plugin-filesystem/client.js';

import { sanitizeScriptName } from '../common/utils.js';
import Script from '../common/Script.js';

const scriptStoreSymbol = Symbol.for('sw:plugin:scripting');

if (!globalThis.getGlobalScriptingContext) {
  globalThis.getGlobalScriptingContext = function() {
    return globalThis[scriptStoreSymbol];
  }
}

// @note - most of this code could be factorized with server-side

const pluginFactory = function(Plugin) {
  class PluginScriptingClient extends Plugin {
    constructor(client, id, options = {}) {
      super(client, id);

      this.options = Object.assign({}, options);

      this._internalState = null;
      this._filesystem = null;

      this.client.pluginManager.register(`sw:plugin:${this.id}:filesystem`, pluginFilesystem);
      this.client.pluginManager.addDependency(this.id, `sw:plugin:${this.id}:filesystem`);
    }

    /** @private */
    _resolveOnTriggerScriptName(name, resolve) {
      const unsubscribe = this._internalState.onUpdate(updates => {
        if ('triggerScriptName' in updates && updates.triggerScriptName === name) {
          unsubscribe();
          resolve();
        }
      });
    }

    /** @private */
    async start() {
      this._internalState = await this.client.stateManager.attach(`sw:plugin:${this.id}:internals`);
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
    getList() {
      return this._internalState.get('nameList');
    }

    /**
     * Convenience method that return the underlying filesystem tree. Can be
     * usefull to reuse components created for the filesystem (e.g. sc-filesystem)
     * @returns {Object}
     */
    getTree() {
      return this._filesystem.getTree();
    }

    /**
     * Create a new script. The returned promise resolves when all underlyings
     * states, files and script instances are up-to-date.
     * @param {string} name - Name of the script, will be used as the actual filename
     * @param {string} [value=''] - Initial value of the script
     * @return {Promise}
     */
    async createScript(name, value = '') {
      name = sanitizeScriptName(name);

      if (this.getList().includes(name)) {
        throw new Error(`[soundworks:PluginScripting] Cannot create script "${name}", script already exists`);
      }

      if (!isString(value)) {
        throw new Error(`[soundworks:PluginScripting] Invalid value for script "${name}", should be a string`);
      }

      return new Promise(async (resolve, reject) => {
        this._resolveOnTriggerScriptName(name, resolve);
        await this._filesystem.writeFile(name, value);
      });
    }

    /**
     * Update an existing script. The returned promise resolves when all underlyings
     * states, files and script instances are up-to-date.
     * @param {string} name - Name of the script
     * @param {string} value - New value of the script
     * @return {Promise}
     */
    async updateScript(name, value) {
      name = sanitizeScriptName(name);

      if (!this.getList().includes(name)) {
        throw new Error(`[soundworks:PluginScripting] Cannot update script "${name}", script does not exists`);
      }

      if (!isString(value)) {
        throw new Error(`[soundworks:PluginScripting] Invalid value for script "${name}", should be a string`);
      }

      return new Promise(async (resolve, reject) => {
        this._resolveOnTriggerScriptName(name, resolve);
        await this._filesystem.writeFile(name, value);
      });
    }

    /**
     * Delete a script. The returned promise resolves when all underlyings
     * states, files and script instances are up-to-date.
     * @param {string} name - Name of the script
     * @return {Promise}
     */
    async deleteScript(name) {
      name = sanitizeScriptName(name);

      if (!this.getList().includes(name)) {
        throw new Error(`[soundworks:PluginScripting] Cannot delete script "${name}", script does not exists`);
      }

      return new Promise(async (resolve, reject) => {
        this._resolveOnTriggerScriptName(name, resolve);
        await this._filesystem.rm(name);
      });
    }

    /**
     * Attach to a script.
     * @param {string} name - Name of the script
     * @return {Promise} Promise that resolves on a new Script instance.
     */
    async attach(name) {
      name = sanitizeScriptName(name);

      const nameIdMap = this._internalState.get('nameIdMap');
      const entry = nameIdMap.find(e => e.name === name);

      if (entry) {
        const state = await this.client.stateManager.attach(`sw:plugin:${this.id}:script`, entry.id);
        const script = new Script(name, state, this);

        return Promise.resolve(script);
      } else {
        throw new Error(`[soundworks:PluginScripting] Cannot attach script "${name}", script does not exists`);
      }
    }
  }

  return PluginScriptingClient;
}

export default pluginFactory;
