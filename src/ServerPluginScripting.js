import fs from 'node:fs';
import url from 'node:url';

import { isString, isPlainObject, counter } from '@ircam/sc-utils';
import { ServerPlugin } from '@soundworks/core/server.js';
import pluginFilesystem from '@soundworks/plugin-filesystem/server.js';
import esbuild from 'esbuild';
import stackTraceParser from 'stacktrace-parser';
import { SourceMapConsumer } from 'source-map';
import sourceMapConvert from 'convert-source-map';

import { sanitizeScriptName, kScriptStore } from './utils.js';
import SharedScript from './SharedScript.js';

if (!globalThis.getGlobalScriptingContext) {
  globalThis.getGlobalScriptingContext = function() {
    return globalThis[kScriptStore];
  };
}

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

/** @private */
export const kScriptInfosByName = Symbol('sw:plugin:scripting:script-infos-by-name');
/** @private */
export const kInternalState = Symbol('sw:plugin:scripting:internal-state');

/**
 * Server-side representation of the soundworks' scripting plugin.
 *
 * The constructor should never be called manually. The plugin will be
 * instantiated by soundworks when registered in the `pluginManager`
 *
 * Available options:
 * - `dirname` {String} - directory in which the script files are located
 *
 * If no option is given, for example before a user selects a project, the plugin
 * will stay idle until `switch` is called.
 *
 * [documentation](https://soundworks.dev/plugins/scripting.html)
 *
 * @example
 * server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
 *
 * @extends {ServerPlugin}
 *
 */
export default class ServerPluginScripting extends ServerPlugin {
  #filesystem = null;

  /** @hideconstructor */
  constructor(server, id, options) {
    super(server, id);

    /**
     * @type {object}
     * @property {string|null} [dirname=null] - Path to the directory in which the script are located
     * @property {boolean} [verbose=false]
     */
    this.options = Object.assign({
      dirname: null,
      verbose: false,
    }, options);

    // protected for testing purposes
    /** @private */
    this[kScriptInfosByName] = new Map(); // <name>, { state, esbuildCtx[] }
    /** @private */
    this[kInternalState] = null;

    this.server.pluginManager.register(`sw:plugin:${this.id}:filesystem`, pluginFilesystem);
    this.server.pluginManager.addDependency(this.id, `sw:plugin:${this.id}:filesystem`);

    this.server.stateManager.defineClass(`sw:plugin:${this.id}:internal`, internalSchema);
    this.server.stateManager.defineClass(`sw:plugin:${this.id}:script`, scriptSchema);
  }

  /** @private */
  async start() {
    this[kInternalState] = await this.server.stateManager.create(`sw:plugin:${this.id}:internal`);
    // use the private `getUnsafe` to bypass the server init check
    this.#filesystem = await this.server.pluginManager.unsafeGet(`sw:plugin:${this.id}:filesystem`);
    // script state are always updated from filesystem updates
    this.#filesystem.onUpdate(async ({ _tree, events }) => {
      if (!events) {
        return;
      }

      for (let { type, node } of events) {
        const name = sanitizeScriptName(node.relPath);

        // Note that script updates are handled by esbuild.watch
        switch (type) {
          case 'create': {
            await this.#createScript(node);
            break;
          }
          case 'delete': {
            if (this[kScriptInfosByName].has(name)) {
              await this.#deleteScript(name);
            }
            break;
          }
        }

        await this.#updateInternalState();
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

        if (location.source !== null) {
          // grab line text
          const originalSource = consumer.sourceContentFor(location.source);
          location.lineText = originalSource.split('\n')[location.line - 1];
          // can be useful too
          if (first.methodName) {
            location.methodName = first.methodName;
          }
        }
        // improve error message with found method name
        // @note 202411 - thanks for the useful comment above... is this a todo?
        // @todo - recheck this, seems not finished
        let text = message;
        // release sourcemap consumer resources
        // @note - might share / reuse this resource
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
    await this[kInternalState].delete();
  }

  /**
   * Instance of the underlying filesystem plugin.
   */
  get filesystem() {
    return this.#filesystem;
  }

  /**
   * Returns the list of all available scripts.
   * @returns {Array}
   */
  getList() {
    return this[kInternalState].get('nameList');
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
    globalThis[kScriptStore] = ctx;
  }

  /**
   * Register callback to execute when a script is created or deleted.
   * @param {Function} callback - Callback function to execute
   * @param {boolean} [executeListener=false] - If true, execute the given
   *  callback immediately.
   * @return {Function} Function that unregister the listener when executed.
   */
  onUpdate(callback, executeListener = false) {
    return this[kInternalState].onUpdate(callback, executeListener);
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
        throw new Error(`Cannot execute 'switch' on PluginScriptingServer: Invalid argument, argument should contain a "dirname" key`);
      }

      dirname = dirname.dirname;
    }

    if (!isString(dirname) && dirname !== null) {
      throw new Error(`Cannot execute 'switch' on PluginScriptingServer: "dirname" argument should be a string or null`);
    }

    this.options.dirname = dirname;

    for (let name of this[kScriptInfosByName].keys()) {
      await this.#deleteScript(name);
    }

    this[kScriptInfosByName].clear();

    this[kInternalState].set({
      nameList: [],
      nameIdMap: [],
    });

    await this.#filesystem.switch({ dirname, publicPath: `sw/plugin/${this.id}/scripting` });

    // allow plugin to be in some ideal state
    if (dirname === null) {
      return Promise.resolve();
    }
    // init all states from current tree
    await this.#createScript(this.#filesystem.getTree());
    await this.#updateInternalState();
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
      throw new Error(`Cannot execute 'attach' on PluginScriptingServer: ${err.message}`);
    }

    const nameIdMap = this[kInternalState].get('nameIdMap');
    const entry = nameIdMap.find(e => e.name === name);

    if (entry) {
      const state = await this.server.stateManager.attach(`sw:plugin:${this.id}:script`, entry.id);

      if (state.get('name') !== name) {
        throw new Error(`[debug] Inconsistent script name, attached to ${name}, found ${state.get('name')}`);
      }

      const script = new SharedScript(state);

      return Promise.resolve(script);
    } else {
      throw new Error(`Cannot execute 'attach' on PluginScriptingServer: script "${name}" does not exists`);
    }
  }


  /** @private */
  async #updateInternalState() {
    let nameList = [];
    let nameIdMap = [];

    for (let [name, infos] of this[kScriptInfosByName].entries()) {
      const { state } = infos;
      nameList.push(name);
      nameIdMap.push({ name, id: state.id });
    }

    await this[kInternalState].set({ nameList, nameIdMap });
  }

  /** @private */
  async #createScript(node) {
    if (node.type === 'file' && node.extension === '.js') {
      const name = sanitizeScriptName(node.relPath);

      if (!this[kScriptInfosByName].has(name)) {
        const filename = node.path;
        const state = await this.server.stateManager.create(`sw:plugin:${this.id}:script`, {
          name,
          filename,
        });

        const verbose = this.options.verbose;
        const buildContexts = [];

        // setup esbuild, await that first builds for both browser and node are done
        // eslint-disable-next-line no-async-promise-executor
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
                    // there can be a concurrency when a file is deleted or renamed where
                    // the watcher tries to rebuild before `esbuild.dispose()` fulfills
                    if (!/^Could not resolve/.test(result.errors[0].text)) {
                      buildResult.buildError = result.errors[0];
                    }
                  } else {
                    buildResult[`${platform}Build`] = result.outputFiles[0].text;
                  }

                  // if both build ids are the same, update state with build results
                  if (buildIds[0] === buildIds[1]) {
                    state.set({ ...buildResult });
                    // reset build results for next build
                    buildResult = {
                      buildError: null,
                      runtimeError: null,
                    };

                    resolve();
                  }
                });
              },
            };

            const plugins = [updateStatePlugin];

            // @todo - define the behavior we want on browsers
            // cf. https://github.com/evanw/esbuild/issues/1492#issuecomment-891676215
            if (platform === 'node') {
              const importMetaUrlPlugin = {
                name: 'import.meta.url',
                setup({ onLoad }) {
                  onLoad({ filter: /()/, namespace: 'file' }, args => {
                    // `args.path` is absolute and then relies on the server filesystem.
                    // We need to make it dynamic according `process.cwd()` so that
                    // clients can tap into their own filesystem.
                    const localUrl = url.pathToFileURL(args.path).href;
                    const dynamicUrl = `'${localUrl.replace(process.cwd(), '\' + process.cwd() + \'')}'`;

                    let code = fs.readFileSync(args.path, 'utf8');
                    code = code.replace(/\bimport\.meta\.url\b/g, dynamicUrl);

                    return { contents: code };
                  });
                },
              };

              plugins.push(importMetaUrlPlugin);
            }

            const ctx = await esbuild.context({
              entryPoints: [filename],
              write: false,
              bundle: true,
              format: 'esm',
              platform: platform,
              // minify: true,
              // keepNames: true, // important for instanceof checks
              sourcemap: 'inline', // not sure we can actually use that
              metafile: true,
              plugins,
            });

            await ctx.watch();

            buildContexts.push(ctx);
          }
        });

        this[kScriptInfosByName].set(name, { state, buildContexts });
      }
    } else if (node.type === 'directory') {
      for (let child of node.children) {
        await this.#createScript(child);
      }
    }
  }

  /** @private */
  async #deleteScript(name) {
    const { state, buildContexts } = this[kScriptInfosByName].get(name);
    this[kScriptInfosByName].delete(name);

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
