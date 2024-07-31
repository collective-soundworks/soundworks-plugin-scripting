import { isString, isPlainObject, counter } from '@ircam/sc-utils';
import pluginFilesystem from '@soundworks/plugin-filesystem/server.js';
import esbuild from 'esbuild';
import stackTraceParser from 'stacktrace-parser';
import { SourceMapConsumer } from 'source-map';
import sourceMapConvert from 'convert-source-map';

import { sanitizeScriptName } from './utils.js';
import SharedScript from './SharedScript.js';

const scriptStoreSymbol = Symbol.for('sw:plugin:scripting');

if (!globalThis.getGlobalScriptingContext) {
  globalThis.getGlobalScriptingContext = function() {
    return globalThis[scriptStoreSymbol];
  }
}

// states
const internalSchema = {
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
  name: {
    type: 'string',
    default: null,
    nullable: true,
  },
  filename: {
    type: 'string',
    default: null,
    nullable: true,
  },
  browserBuild: {
    type: 'string',
    default: null,
    nullable: true,
  },
  nodeBuild: {
    type: 'string',
    default: null,
    nullable: true,
  },
  buildError: {
    type: 'any',
    default: null,
    nullable: true,
  },
  runtimeError: {
    type: 'any',
    default: null,
    nullable: true,
  },
};

export default function(Plugin) {
  /**
   * Server-side representation of the soundworks' scripting plugin.
   */
  class PluginScriptingServer extends Plugin {
    /**
     * The constructor should never be called manually. The plugin will be
     * instantiated by soundworks when registered in the `pluginManager`
     *
     * Available options:
     * - `dirname` {String} - directory in which the script files are located
     *
     * If no option is given, for example before a user selects a project, the plugin
     * will stay idle until `switch` is called.
     *
     * @example
     * server.pluginManager.register('scripting', scriptingPlugin, { dirname })
     */
    constructor(server, id, options) {
      super(server, id);

      this.options = Object.assign({
        dirname: null,
        verbose: false,
      }, options);

      this._scriptInfosByName = new Map(); // <name>, { state, esbuildCtx[] }
      this._internalState = null;
      this._filesystem = null;

      this.server.pluginManager.register(`sw:plugin:${this.id}:filesystem`, pluginFilesystem);
      this.server.pluginManager.addDependency(this.id, `sw:plugin:${this.id}:filesystem`);

      this.server.stateManager.registerSchema(`sw:plugin:${this.id}:internal`, internalSchema);
      this.server.stateManager.registerSchema(`sw:plugin:${this.id}:script`, scriptSchema);
    }

    /** @private */
    async start() {
      this._internalState = await this.server.stateManager.create(`sw:plugin:${this.id}:internal`);
      // use the private `getUnsafe` to bypass the server init check
      this._filesystem = await this.server.pluginManager.unsafeGet(`sw:plugin:${this.id}:filesystem`);
      // script state are always updated from filesystem updates
      this._filesystem.onUpdate(async ({ _tree, events }) => {
        if (!events) {
          return;
        }

        for (let { type, node } of events) {
          const name = sanitizeScriptName(node.relPath);

          // Note that script updates are handled by esbuild.watch
          switch (type) {
            case 'create': {
              await this._createScript(node);
              break;
            }
            case 'delete': {
              if (this._scriptInfosByName.has(name)) {
                await this._deleteScript(name);
              }
              break;
            }
          }

          await this._updateInternalState();
        }
      });

      // Parse source maps to retrieve readable infos from runtime error reporting
      this.server.stateManager.registerUpdateHook(`sw:plugin:${this.id}:script`, async (updates, values) => {
        if (updates.runtimeError) {
          const { source, stack, message } = updates.runtimeError;

          const code = source === 'node' ?  values.nodeBuild : values.browserBuild;
          const sourceMap = code.split('//#')[1];
          const sourceMapJson = sourceMapConvert.fromComment(`//#${sourceMap}`).toJSON();
          // ok, async constructor... so weird...
          const consumer = await new SourceMapConsumer(sourceMapJson);
          // Array of { file: '', methodName: 'Module.enter', arguments: [], lineNumber: 193, column: 9 }
          const parsedStack = stackTraceParser.parse(stack);
          const first = parsedStack[0];
          const location = consumer.originalPositionFor({
            line: first.lineNumber,
            column: first.column,
          });
          // format err message on the model of esbuild, so front end can parse them in unified way
          location.file = location.source;
          // grab line text
          const originalSource = consumer.sourceContentFor(location.source);
          location.lineText = originalSource.split('\n')[location.line - 1];
          // can be usefull too
          if (first.methodName) {
            location.methodName = first.methodName;
          }
          // improve error message with found method name
          let text = message;

          // release sourcemap consumer resources
          // @todo - might share / resuse this resource
          consumer.destroy();

          return {
            ...updates,
            runtimeError: { source, message, text, location },
          };
        }
      });

      await this.switch(this.options.dirname);
    }

    /** @private */
    async stop() {
      await this.switch(null);
      await this._internalState.delete();
    }

    /**
     * Instance of the underlying filesystem plugin.
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
      return this.server.stateManager.getCollection(`sw:plugin:${this.id}:script`);
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
     * Register callback to execute when a script is created or deleted.
     * @param {Function} callback - Callback function to execute
     * @param {boolean} [executeListener=false] - If true, execute the given
     *  callback immediately.
     * @return {Function} Function that unregister the listener when executed.
     */
    onUpdate(callback, executeListener = false) {
      return this._internalState.onUpdate(callback, executeListener);
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

      if (!isString(dirname) && dirname !== null) {
        throw new Error(`[soundworks:PluginScripting] Invalid argument for method switch, "dirname" should be a string or null`);
      }

      this.options.dirname = dirname;

      for (let name of this._scriptInfosByName.keys()) {
        await this._deleteScript(name);
      }

      this._scriptInfosByName.clear();

      this._internalState.set({
        nameList: [],
        nameIdMap: [],
      });

      await this._filesystem.switch({ dirname, publicPath: `sw/plugin/${this.id}/scripting` });

      // allow plugin to be in some idel state
      if (dirname === null) {
        return Promise.resolve();
      }
      // init all states from current tree
      await this._createScript(this._filesystem.getTree());
      await this._updateInternalState();
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
        const state = await this.server.stateManager.attach(`sw:plugin:${this.id}:script`, entry.id);

        if (state.get('name') !== name) {
          throw new Error(`[debug] Inconcistent script name, attached to ${name}, found ${state.get('name')}`)
        }

        const script = new SharedScript(state);

        return Promise.resolve(script);
      } else {
        throw new Error(`[soundworks:PluginScripting] Cannot attach script "${name}", script does not exists`);
      }
    }


    /** @private */
    async _updateInternalState() {
      let nameList = [];
      let nameIdMap = [];

      for (let [name, infos] of this._scriptInfosByName.entries()) {
        const { state } = infos;
        nameList.push(name);
        nameIdMap.push({ name, id: state.id });
      }

      await this._internalState.set({ nameList, nameIdMap });
    }

    /** @private */
    async _createScript(node) {
      if (node.type === 'file' && node.extension === '.js') {
        const name = sanitizeScriptName(node.relPath);

        if (!this._scriptInfosByName.has(name)) {
          const filename = node.path;
          const state = await this.server.stateManager.create(`sw:plugin:${this.id}:script`, {
            name,
            filename,
          });

          const verbose = this.options.verbose;
          const buildContexts = [];

          // setup esbuild, await that first builds for both browser and node are done
          await new Promise(async (resolve) => {
            if (verbose) {
              console.log('> create script:', name, filename);
            }

            const platforms = ['browser', 'node'];
            const buildIds = [null, null];
            let buildResult = {
              buildError: null,
              runtimeError: null,
            };

            for (let index = 0; index < platforms.length; index++) {
              // one counter for each platform, on build end, if both build ids are
              // matching, update the state with build results
              const platform = platforms[index];
              const buildCounter = counter();

              const updateStatePlugin = {
                name: `${platform}-state`,
                setup(build) {
                  build.onEnd(result => {
                    const filename = build.initialOptions.entryPoints[0];

                    if (verbose) {
                      console.log(`> update script (${platform}):`, filename);
                    }

                    const buildId = buildCounter();
                    buildIds[index] = buildId;
                    // populate build results
                    if (result.errors.length > 0) {
                      buildResult.buildError = result.errors[0];
                    } else {
                      buildResult[`${platform}Build`] = result.outputFiles[0].text;
                    }

                    // if both build ids are the same, update state with build results
                    if (buildIds[0] === buildIds[1]) {
                      state.set({ ...buildResult });
                      // resset build results for next build
                      buildResult = {
                        buildError: null,
                        runtimeError: null,
                      };

                      resolve();
                    }
                  });
                }
              }

              const ctx = await esbuild.context({
                entryPoints: [filename],
                write: false,
                bundle: true,
                format: 'esm',
                platform: platform,
                // minify: true,
                // keepNames: true, // important for instanceof checks
                sourcemap: 'inline', // not sure we can actaully use that
                metafile: true,
                plugins: [updateStatePlugin],
              });

              await ctx.watch();

              buildContexts.push(ctx);
            }
          });

          this._scriptInfosByName.set(name, { state, buildContexts });
        }
      } else if (node.type === 'directory') {
        for (let child of node.children) {
          await this._createScript(child);
        }
      }
    }

    /** @private */
    async _deleteScript(name) {
      const { state, buildContexts } = this._scriptInfosByName.get(name);
      this._scriptInfosByName.delete(name);

      // Let's do this first:
      // > When you are done with a context object, you can call dispose() on the
      // > context to wait for existing builds to finish, stop watch and/or serve mode,
      // > and free up resources.
      // So if are in the middle of a build, the onEnd plugin will not crash
      for (let ctx of buildContexts) {
        await ctx.dispose();
      }

      await state.delete();
    }
  }

  return PluginScriptingServer;
}
