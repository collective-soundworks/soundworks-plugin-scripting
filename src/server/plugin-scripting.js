import { promises as fs } from 'node:fs';
import path from 'node:path';

import { isString, isPlainObject } from '@ircam/sc-utils';
import pluginFilesystem from '@soundworks/plugin-filesystem/server.js';
import { build } from 'esbuild';

import { formatErrors, sanitizeScriptName } from '../common/utils.js';
import Script from '../common/Script.js';

const scriptStoreSymbol = Symbol('sw:plugin:scripting');

globalThis.getGlobalScriptingContext = function() {
  return globalThis[scriptStoreSymbol];
}

const pluginFactory = function(Plugin) {
  /**
   * Server-side representation of the soundworks' scripting plugin.
   *
   * Available options:
   * - dirname {String} - directory in which the script files are located
   */
  class PluginScriptingServer extends Plugin {
    constructor(server, id, options) {
      super(server, id);

      this.options = Object.assign({
        dirname: null,
      }, options);

      this._scriptStatesByName = new Map();
      this._internalsState = null;
      this._filesystem = null;

      this.server.pluginManager.register(`sw:plugin:${this.id}:filesystem`, pluginFilesystem);

      // states
      const internalsSchema = {
        nameList: {
          type: 'any',
          default: [],
        },
        nameIdMap: {
          type: 'any',
          default: [],
        },
        triggerScriptName: {
          type: 'string',
          event: true,
        },
      };

      const scriptSchema = {
        filename: {
          type: 'string',
          default: null,
          nullable: true,
        },
        source: {
          type: 'string',
          default: null,
          nullable: true,
        },
        transpiled: {
          type: 'string',
          default: null,
          nullable: true,
        },
        error: {
          type: 'string',
          default: null,
          nullable: true,
        },
      };

      this.server.stateManager.registerSchema(`sw:plugin:${this.id}:internals`, internalsSchema);
      this.server.stateManager.registerSchema(`sw:plugin:${this.id}:script`, scriptSchema);
    }

    /** @private */
    async _updateInternals(triggerScriptName = null) {
      let nameList = [];
      let nameIdMap = [];

      for (let [name, state] of this._scriptStatesByName.entries()) {
        nameList.push(name);
        nameIdMap.push({ name, id: state.id });
      }

      if (triggerScriptName === null) {
        await this._internalsState.set({ nameList, nameIdMap });
      } else {
        await this._internalsState.set({ nameList, nameIdMap, triggerScriptName });
      }
    }

    /** @private */
    async _createScripts(node) {
      if (node.type === 'file') {
        const name = sanitizeScriptName(node.relPath);

        if (!this._scriptStatesByName.has(name)) {
          // create state associated to the file
          const filename = node.path;
          const source = await fs.readFile(filename);
          // filename must be set at creation so that the hook can rely on the value
          const state = await this.server.stateManager.create(`sw:plugin:${this.id}:script`, {
            filename
          });

          await this._updateState(state, source.toString());
          // store the state
          this._scriptStatesByName.set(name, state);
        }
      } else if (node.type === 'directory') {
        for (let child of node.children) {
          await this._createScripts(child);
        }
      }
    }

    /** @private */
    async _updateState(state, source) {
      try {
        const filename = state.get('filename');
        const buildResult = await build({
          entryPoints: [filename],
          format: 'esm',
          platform: 'browser',
          bundle: true,
          write: false,
          outfile: 'ouput',
          // @todo: sourcemaps need to be parsed separately
          // sourcemap: true,
        });

        await state.set({
          source: source,
          transpiled: buildResult.outputFiles[0].text,
          error: null,
        });
      } catch (err) {
        await state.set({
          source: source,
          error: formatErrors(err.errors),
          transpiled: null,
        });
      }
    }

    /** @private */
    _resolveOnTriggerScriptName(name, resolve) {
      const unsubscribe = this._internalsState.onUpdate(updates => {
        if ('triggerScriptName' in updates && updates.triggerScriptName === name) {
          unsubscribe();
          resolve();
        }
      });
    }

    /** @private */
    async start() {
      this._internalsState = await this.server.stateManager.create(`sw:plugin:${this.id}:internals`);
      // use the pirvate `unsafeGet` to bypass the server init check
      this._filesystem = await this.server.pluginManager.unsafeGet(`sw:plugin:${this.id}:filesystem`);

      // script state are always updated from filesystem updates
      this._filesystem.onUpdate(async ({ tree, events }) => {
        if (!events) {
          return;
        }

        for (let { type, node } of events) {
          const name = sanitizeScriptName(node.relPath);

          switch (type) {
            case 'create': {
              await this._createScripts(node);
              break;
            }
            case 'update': {
              if (this._scriptStatesByName.has(name)) {
                const state = this._scriptStatesByName.get(name);
                const source = await fs.readFile(node.path);
                // trigger hook from filesystem
                await this._updateState(state, source.toString());
              }
              break;
            }
            case 'delete': {
              if (this._scriptStatesByName.has(name)) {
                const state = this._scriptStatesByName.get(name);
                this._scriptStatesByName.delete(name);

                await state.delete();
              }
              break;
            }
          }

          await this._updateInternals(name);
        }
      });

      await this.switch(this.options.dirname);
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

    /**
     * Register callback to execute when a script is created or deleted. The
     * callback will receive the updated list of script names and the updated
     * file tree.
     * @param {Function} callback - Callback function to execute
     * @param {boolean} [executeListener=false] - If true, execute the given
     *  callback immediately.
     * @return {Function} Function that unregister the listener when executed.
     */
    onUpdate(callback, executeListener = false) {
      return this._internalsState.onUpdate(() => {
        callback(this.getList(), this.getTree())
      }, executeListener);
    }

    /**
     * Switch the plugin to watch and use another directory
     * @param {String|Object} dirname - Path to the new directory. As a convenience
     *  to match the plugin filesystem API, an object containing the 'dirname' key
     *  can also be passed
     */
    async switch(dirname) {
      // support switch({ dirname }) API to match filesystem API
      if (isPlainObject(dirname)) {
        if (!('dirname' in dirname)) {
          throw new Error(`[soundworks:PluginScripting] Invalid argument for method switch, argument should contain a "dirname" key`);
        }

        dirname = dirname.dirname;
      }

      if (!isString(this.options.dirname) && this.options.dirname !== null) {
        throw new Error(`[soundworks:PluginScripting] Invalid argument for method switch, "dirname" should be a string or null`);
      }

      this.options.dirname = dirname;

      for (let [name, state] of this._scriptStatesByName.entries()) {
        await state.detach();
      }

      this._scriptStatesByName.clear();

      this._internalsState.set({
        nameList: [],
        nameIdMap: [],
      });

      await this._filesystem.switch({ dirname });

      // allow plugin to be in some idel state
      if (dirname === null) {
        return Promise.resolve();
      }
      // init all states from current tree
      await this._createScripts(this._filesystem.getTree());
      await this._updateInternals();
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

      if (this._scriptStatesByName.has(name)) {
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

      if (!this._scriptStatesByName.has(name)) {
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

      if (!this._scriptStatesByName.has(name)) {
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

      const nameIdMap = this._internalsState.get('nameIdMap');
      const entry = nameIdMap.find(e => e.name === name);

      if (entry) {
        const state = await this.server.stateManager.attach(`sw:plugin:${this.id}:script`, entry.id);
        const script = new Script(name, state, this);

        return Promise.resolve(script);
      } else {
        throw new Error(`[soundworks:PluginScripting] Cannot attach script "${name}", script does not exists`);
      }
    }
  }

  return PluginScriptingServer;
}

export default pluginFactory;
