import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

import { isString } from '@ircam/sc-utils';
import pluginFilesystem from '@soundworks/plugin-filesystem/server.js';
import { build } from 'esbuild';
import slugify from 'slugify';

import { formatErrors } from './utils.js';
import Script from '../common/Script.js';

function implement() {
  throw new Error('not implemented');
}

function sanitizeScriptName(name) {
  if (!isString(name)) {
    throw new Error('[soundworks:PluginScripting] Invalid script name, should be string');
  }

  name = slugify(name, { lower: true });

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
    constructor(server, id, options) {
      super(server, id);

      const defaults = {
        dirname: path.join(process.cwd(), '.db', 'scripts'),
        // @todo - allow several script templates
        defaultScriptSource: null,
      };

      this.options = Object.assign({}, defaults, options);

      // use filesystem plugin to watch dirname
      this.server.pluginManager.register(`sw:plugin:${this.id}:filesystem`, pluginFilesystem, {
        dirname: this.options.dirname,
      });

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

      // private
      this._scriptStatesByName = new Map();
      this._internalsState = null;
      this._filesystem = null;
      this._emitter = new EventEmitter();
    }

    async _updateInternals() {
      let nameList = [];
      let nameIdMap = [];

      for (let [name, state] of this._scriptStatesByName.entries()) {
        nameList.push(name);
        nameIdMap.push({ name, id: state.id });
      }

      await this._internalsState.set({ nameList, nameIdMap });
    }

    async _createScripts(node) {
      if (node.type === 'file') {
        const name = sanitizeScriptName(node.relPath);

        if (!this._scriptStatesByName.has(name)) {
          // create state associated to the file
          const filename = node.path;
          const source = await fs.readFile(filename);
          // filename must be set here so that the hook can rely on the value
          const state = await this.server.stateManager.create(`sw:plugin:${this.id}:script`, {
            filename
          });
          // we use set here trigger hook from filesystem
          await state.set({ source: source.toString() }, { fs: true });

          // store infos
          this._scriptStatesByName.set(name, state);
        }
      } else if (node.type === 'directory') {
        for (let child of node.children) {
          await this._createScripts(child);
        }
      }
    }

    /** @private */
    async start() {
      this._internalsState = await this.server.stateManager.create(`sw:plugin:${this.id}:internals`);

      this.server.stateManager.registerUpdateHook(`sw:plugin:${this.id}:script`, async (updates, currentValues, context) => {
        if (context.fs && 'source' in updates) {
          // transpile source
          try {
            const buildResult = await build({
              entryPoints: [currentValues.filename],
              format: 'esm',
              platform: 'browser',
              bundle: true,
              write: false,
              outfile: 'ouput',
              // sourcemap: true, // sourcemaps need to be parsed separately
            });

            return {
              transpiled: buildResult.outputFiles[0].text,
              error: null,
              ...updates,
            };
          } catch (err) {
            return {
              error: formatErrors(err.errors),
              transpiled: null,
              ...updates,
            };
          }
        } else {
          throw new Error(`[soundworks:PluginScripting] updates should always go through filesystem`);
        }
      });

      // use the pirvate `unsafeGet` to bypass the server init check
      this._filesystem = await this.server.pluginManager.unsafeGet(`sw:plugin:${this.id}:filesystem`);

      this._filesystem.onUpdate(async ({ tree, events }) => {
        for (let { type, node } of events) {
          const name = sanitizeScriptName(node.relPath);

          switch (type) {
            case 'create': {
              await this._createScripts(node);
              await this._updateInternals(name);
              this._emitter.emit(name);
              break;
            }
            case 'update': {
              if (this._scriptStatesByName.has(name)) {
                const state = this._scriptStatesByName.get(name);
                const source = await fs.readFile(node.path);
                // trigger hook from filesystem
                await state.set({ source: source.toString() }, { fs: true });
                await this._updateInternals(name);
                this._emitter.emit(name);
              }
              break;
            }
            case 'delete': {
              if (this._scriptStatesByName.has(name)) {
                const state = this._scriptStatesByName.get(name);
                this._scriptStatesByName.delete(name);

                await state.delete();
                await this._updateInternals(name);
                this._emitter.emit(name);
              }
              break;
            }
          }
        }
      });

      // init with current tree
      await this._createScripts(this._filesystem.getTree());
      await this._updateInternals();
    }

    /**
     * Registers a global context object to be used in scripts.
     * @param {Object} ctx - Object to register as global context.
     */
    setContext(ctx) {
      globalsThis.getContext = function() {
        return ctx;
      }
    }

    /**
     * Returns the list of all available scripts.
     * @return {Array}
     */
    getList() {
      return this._internalsState.get('nameList');
    }

    /**
     *
     *
     */
    onUpdate(callback, executeListener = false) {
      return this._internalsState.onUpdate(callback, executeListener);
    }

    async switch() {
      implement();

      // delete all script states
      // reinit internals
      // switch filesystem plugin
    }

    async create(name, value = null) {
      name = sanitizeScriptName(name);

      if (value === null) {
        if (this.options.defaultScriptSource !== null) {
          value = this.options.defaultScriptSource;
        } else {
          value = '';
        }
      }

      return new Promise(async (resolve, reject) => {
        this._emitter.once(name, resolve);
        await this._filesystem.writeFile(name, value);
      });
    }

    /**
     * Resolve when eveything is updated, i.e. script state, nameLists, etc.
     */
    async update(name, value) {
      name = sanitizeScriptName(name);

      if (!this._scriptStatesByName.has(name)) {
        throw new Error(`[soundworks:PluginScripting] Cannot update script "${name}", script does not exists`);
      }

      return new Promise(async (resolve, reject) => {
        this._emitter.once(name, resolve);
        await this._filesystem.writeFile(name, value);
      });
    }

    /**
     * Resolve when eveything is updated, i.e. script state, nameLists, etc.
     */
    async delete(name) {
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
        const script = new Script(name, state);

        return Promise.resolve(script);
      } else {
        throw new Error(`[soundworks:PluginScripting] Cannot attach script "${name}", script does not exists`);
      }
    }
  }

  return PluginScriptingServer;
}

export default pluginFactory;
