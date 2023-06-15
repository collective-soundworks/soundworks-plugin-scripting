import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

import { isString } from '@ircam/sc-utils';
import pluginFilesystem from '@soundworks/plugin-filesystem/server.js';
import { build } from 'esbuild';
import slugify from 'slugify';

import { formatErrors } from './utils.js';
import Script from '../common/Script.js';

const scriptStoreSymbol = Symbol('sw:plugin:scripting');

globalThis.getScriptingContext = function() {
  return globalThis[scriptStoreSymbol];
}

function implement() {
  throw new Error('not implemented');
}

function sanitizeScriptName(name) {
  if (!isString(name)) {
    throw new Error('[soundworks:PluginScripting] Invalid script name, should be a string');
  }

  // don't go lower case as we may want to have class files, e.g. MyClass.js
  name = slugify(name);
  // @todo - if file extention is given, keep it untouched
  if (!name.endsWith('.js')) {
    return `${name}.js`;
  }

  return name;
}

const pluginFactory = function(Plugin) {
  /**
   * This is a description of the MyClass constructor function.

   * @classdesc This is a description of the MyClass class.
   */
  class PluginScriptingServer extends Plugin {
    /** @private */
    constructor(server, id, options) {
      super(server, id);

      const defaults = {
        dirname: null,
      };

      this.options = Object.assign({}, defaults, options);

      this._scriptStatesByName = new Map();
      this._internalsState = null;
      this._filesystem = null;
      this._emitter = new EventEmitter();

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
    async _updateInternals() {
      let nameList = [];
      let nameIdMap = [];

      for (let [name, state] of this._scriptStatesByName.entries()) {
        nameList.push(name);
        nameIdMap.push({ name, id: state.id });
      }

      await this._internalsState.set({ nameList, nameIdMap });
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

          await this._updateInternals();
          this._emitter.emit(name);
        }
      });

      // @todo move to switch
      if (this.options.dirname) {
        await this._filesystem.switch({ dirname: this.options.dirname });
        // init all states from current tree
        await this._createScripts(this._filesystem.getTree());
        await this._updateInternals();
      }
    }

    /**
     * Registers a global context object to be used in scripts. Note that the
     * context is store globally, so several scripting plugins running in parallel
     * will share the same underlying object.
     *
     * @param {Object} ctx - Object to register as global context.
     */
    setScriptingContext(ctx) {
      // @todo - review
      globalThis[scriptStoreSymbol] = ctx;
    }

    /**
     * Returns the list of all available scripts.
     * @return {Array}
     */
    getScriptNames() {
      return this._internalsState.get('nameList');
    }

    /**
     * Conveniance method that return the underlying filesystem tree. Can be
     * usefull to reuse components created for the filesystem (e.g. sc-filesystem)
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
     */
    onUpdate(callback, executeListener = false) {
      return this._internalsState.onUpdate(() => {
        callback(this.getScriptNames(), this.getTree())
      }, executeListener);
    }

    // accept both `dirname` and `{ dirname }` so it can be switched alongside
    // filesystem consistently
    async switch(dirname) {
      implement();

      // delete all script states
      // reinit internals
      // switch filesystem plugin
    }

    async createScript(name, value = '') {
      name = sanitizeScriptName(name);

      if (this._scriptStatesByName.has(name)) {
        throw new Error(`[soundworks:PluginScripting] Cannot create script "${name}", script already exists`);
      }

      if (!isString(value)) {
        throw new Error(`[soundworks:PluginScripting] Invalid value for script "${name}", should be a string`);
      }

      return new Promise(async (resolve, reject) => {
        this._emitter.once(name, resolve);
        await this._filesystem.writeFile(name, value);
      });
    }

    /**
     * Resolve when eveything is updated, i.e. script state, nameLists, etc.
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
        this._emitter.once(name, resolve);
        await this._filesystem.writeFile(name, value);
      });
    }

    /**
     * Resolve when eveything is updated, i.e. script state, nameLists, etc.
     */
    async deleteScript(name) {
      name = sanitizeScriptName(name);

      if (!this._scriptStatesByName.has(name)) {
        throw new Error(`[soundworks:PluginScripting] Cannot delete script "${name}", script does not exists`);
      }

      return new Promise(async (resolve, reject) => {
        this._emitter.once(name, resolve);
        await this._filesystem.rm(name);
      });
    }

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
