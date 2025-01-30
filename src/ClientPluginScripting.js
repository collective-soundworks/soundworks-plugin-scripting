import { ClientPlugin } from '@soundworks/core/client.js';
import pluginFilesystem from '@soundworks/plugin-filesystem/client.js';

import { sanitizeScriptName, kScriptStore } from './utils.js';
import SharedScript from './SharedScript.js';

if (!globalThis.getGlobalScriptingContext) {
  globalThis.getGlobalScriptingContext = function() {
    return globalThis[kScriptStore];
  };
}

/**
 * Client-side representation of the soundworks' scripting plugin.
 *
 * The constructor should never be called manually. The plugin will be
 * instantiated automatically when registered in the `pluginManager`
 *
 * @extends {ClientPlugin}
 * @example
 * client.pluginManager.register('scripting', ClientPluginScripting, { dirname });
 */
export default class ClientPluginScripting extends ClientPlugin {
  /** @private */
  #internalState = null;
  /** @private */
  #filesystem = null;

  /** @private */
  constructor(client, id, options = {}) {
    super(client, id);

    this.options = Object.assign({}, options);

    this.client.pluginManager.register(`sw:plugin:${this.id}:filesystem`, pluginFilesystem);
    this.client.pluginManager.addDependency(this.id, `sw:plugin:${this.id}:filesystem`);
  }

  /** @private */
  async start() {
    await super.start();

    this.#internalState = await this.client.stateManager.attach(`sw:plugin:${this.id}:internal`);
    this.#filesystem = await this.client.pluginManager.unsafeGet(`sw:plugin:${this.id}:filesystem`);
  }

  /** @private */
  async stop() {
    this.#internalState.detach();

    await super.stop();
  }

  /**
   * Instance of the underlying filesystem plugin
   */
  get filesystem() {
    return this.#filesystem;
  }

  /**
   * Returns the list of all available scripts.
   * @returns {Array}
   */
  getList() {
    return this.#internalState.get('nameList');
  }

  /**
   * Return the SharedStateCollection of all the scripts underlying share states.
   * Provided for build and error monitoring purposes. Can also be used to maintain
   * a list of existing script, e.g. in a drop-down menu
   *
   * If you want a full featured / executable Script instance, use the `attach` instead.
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
    globalThis[kScriptStore] = ctx;
  }

  /**
   * Attach to a script.
   * @param {string} name - Name of the script
   * @return {Promise<SharedScript>} Promise that resolves on a new Script instance.
   */
  async attach(name) {
    try {
      name = sanitizeScriptName(name);
    } catch (err) {
      throw new Error(`Cannot execute 'attach' on PluginScriptingClient: ${err.message}`);
    }

    const nameIdMap = this.#internalState.get('nameIdMap');
    const entry = nameIdMap.find(e => e.name === name);

    if (entry) {
      const state = await this.client.stateManager.attach(`sw:plugin:${this.id}:script`, entry.id);

      if (state.get('name') !== name) {
        throw new Error(`[debug] Invalid script, attached to ${name}, found ${state.get('name')}`);
      }

      const script = new SharedScript(state);

      return Promise.resolve(script);
    } else {
      throw new Error(`Cannot execute 'attach' on PluginScriptingClient: script "${name}" does not exists`);
    }
  }
}
