import pluginFilesystem from '@soundworks/plugin-filesystem/client.js';

import { sanitizeScriptName } from './utils.js';
import SharedScript from './SharedScript.js';

const scriptStoreSymbol = Symbol.for('sw:plugin:scripting');

if (!globalThis.getGlobalScriptingContext) {
  globalThis.getGlobalScriptingContext = function() {
    return globalThis[scriptStoreSymbol];
  }
}

// @note - most of this code could be factorized with server-side

export default function(Plugin) {
  /**
   * Client-side representation of the soundworks' scripting plugin.
   */
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
      await super.start();

      this._internalState = await this.client.stateManager.attach(`sw:plugin:${this.id}:internal`);
      this._filesystem = await this.client.pluginManager.unsafeGet(`sw:plugin:${this.id}:filesystem`);
    }

    /** @private */
    async stop() {
      this._internalState.detach();

      await super.stop();
    }

    /**
     * Instance of the underlying filesystem plugin
     */
    get filesystem() {
      return this._filesystem;
    }

    /**
     * Returns the list of all available scripts.
     * @returns {Array}
     */
    getList() {
      return this._internalState.get('nameList');
    }

    /**
     * Return the SharedStateCollection of all the scripts underlying share states.
     * Provided for build and error monitoring purposes.
     * If you want a full featured Script instance, see `attach` instead.
     * @return {Promise<SharedStateCollection>}
     */
    getCollection() {
      return this.client.stateManager.getCollection(`sw:plugin:${this.id}:script`);
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

        if (state.get('name') !== name) {
          throw new Error(`[debug] Inconcistent script name, attached to ${name}, found ${state.get('name')}`)
        }

        const script = new SharedScript(state);

        return Promise.resolve(script);
      } else {
        throw new Error(`[soundworks:PluginScripting] Cannot attach script "${name}", script does not exists`);
      }
    }
  }

  return PluginScriptingClient;
}
