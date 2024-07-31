import { isBrowser } from '@ircam/sc-utils';

// for testing only
export const kGetNodeBuild = Symbol('soundworks:plugin-scirpting:get-node-build');
export const kGetBrowserBuild = Symbol('soundworks:plugin-scirpting:get-node-build');

/**
 * A SharedScript can be distributed amongst different clients and modified
 * at runtime. The script source is stored directly in the filestem, see
 * `dirname` option of the server-side plugin.
 * A Shared script cannot be instatiated manually, it is retrieved by calling
 * the client's or  server `PluScritping.attach` method.
 */
class SharedScript {
  #state = null;
  #browserBuildURL = null;
  #nodeBuildURL = null;

  constructor(scriptState) {
    this.#state = scriptState;

    if (isBrowser()) {
      window.addEventListener('error', function (evt) {
        console.log('CATCHED ERROR');
        console.log(evt);
        // console.log("Caught[via 'error' event]:  '" + evt.message + "' from " + evt.filename + ":" + evt.lineno);
        // console.log(evt); // has srcElement / target / etc
        evt.preventDefault();
      });

      window.addEventListener('unhandledrejection', evt => {
        const err = evt.reason;
        // console.log(evt.reason.includes(this.#browserBuildURL.toString()));
        if (err.stack.includes(this.#browserBuildURL.toString())) {
          evt.stopPropagation();
          this.reportRuntimeError(err);
        }
      });
    } else {
      const testReportError = err => {
        // if the error comes from this script, report it
        if (err.stack.includes(this.#nodeBuildURL)) {
          this.reportRuntimeError(err);
        }
      }

      process.prependListener('uncaughtException', testReportError);
      process.prependListener('unhandledRejection', testReportError);
    }
  }

  // for testing only
  get [kGetNodeBuild] () {
    return this.#state.get('nodeBuild');
  }

  get [kGetBrowserBuild] () {
    return this.#state.get('browserBuild');
  }

  /**
   * Name of the script (i.e. sanitized relative path)
   * @type {string}
   */
  get name() {
    return this.#state.get('name');
  }


  /**
   * Filename from which the script is created.
   * @type {string}
  */
  get filename() {
    return this.#state.get('filename');
  }

  /**
   * Error that may have occured during the transpilation of the script.
   * If no error occured during transpilation, the attribute is set to null.
   * @type {string}
   */
  get buildError() {
    return this.#state.get('buildError');
  }

  /**
   * Runtime error that may have occured during the execution of the script.
   * Runtime errors must be reported by the consumer code (cf. reportRuntimeError).
   * @type {string}
   */
  get runtimeError() {
    return this.#state.get('runtimeError');
  }

  /**
   * Dynamically import the transpiled module.
   * {@link https://caniuse.com/?search=import()}
   * @returns {Promise} Promise which fulfills to the JS module.
   */
  async import() {
    const filename = this.#state.get('filename');

    // ## Notes
    // - 2023/06 - We need this branch because File is still experimental and only available in node 20,
    // - 2024/07 - Still experimental in node 22.5
    // Error: Only URLs with a scheme in: file, data, and node are supported by
    // the default ESM loader. Received protocol 'blob:', cf.:
    // - <https://github.com/nodejs/node/issues/47573>
    // - <https://github.com/node-loader/node-loader-core/issues/14>
    if (isBrowser()) {
      URL.revokeObjectURL(this.#browserBuildURL);

      const browserBuild = this.#state.getUnsafe('browserBuild');
      const file = new File([browserBuild], filename, { type: 'text/javascript' });
      this.#browserBuildURL = URL.createObjectURL(file);
      // the webpack ignore comment is not a huge problem as this is hidden in the lib
      return await import(/* webpackIgnore: true */this.#browserBuildURL);
    } else {
      // ## Note - 2024/07
      // - Raw import of the js file
      // (Make sure we don't have a `package.json` file in the plugin watched dirname...)
      // ```
      // const { join } = await import(/* webpackIgnore: true */'node:path');
      // const absFilename = join(process.cwd(), filename);
      // return import(/* webpackIgnore: true */`${absFilename}?version=${Date.now()}`);
      // ```
      // This doesn't work of rour use case because the import is cached
      // - cf. <https://github.com/nodejs/help/issues/2751>
      // the "version" hack proposed will work for top level module but not
      // for it's deps, which is more a problem for us than not being able to use
      // native addons in scripts...
      // So back to first solution and wait for stable `require(esm)` in LTS
      // <https://joyeecheung.github.io/blog/2024/03/18/require-esm-in-node-js/>
      //
      // At this point, best path forward is to just remove the `isBrowser` branch, but
      // <https://github.com/nodejs/node/issues/47573> (closed for no activity...)
      // maybe propose a patch? cf. node lib/internal/modules/esm/loader.js line 341
      // cf. <https://joyeecheung.github.io/blog/2018/12/31/tips-and-tricks-node-core/>
      //
      // **Important**
      //
      // The launcher relies on `'data:text/javascript;base64,'` pattern matching
      // to not terminate the process when it finds the pattern in the error stack.
      // Any modification here should take this question into account.

      const nodeBuild = this.#state.getUnsafe('nodeBuild');
      this.#nodeBuildURL = 'data:text/javascript;base64,' + btoa(nodeBuild);
      return await import(/* webpackIgnore: true */this.#nodeBuildURL);
    }
  }

  async reportRuntimeError(err) {
    console.error('Script Runtime Error:', err.message);

    const runtimeError = {
      // cf. https://github.com/mifi/stacktracify (in server hook)
      source: isBrowser() ? 'browser' : 'node',
      stack: err.stack,
      message: err.message,
    };

    this.#state.set({ runtimeError });
  }

  /**
   * Stop listening for updates
   */
  async detach() {
    await this.#state.detach();
  }

  /**
   * Register a callback to be executed when the script is updated.
   * @param {Function} callback - Callback function
   * @param {boolean} [executeListener=false] - If true, execute the given
   *  callback immediately.
   * @return {Function} Function that unregister the callback when executed.
   */
  onUpdate(callback, executeListener = false) {
    return this.#state.onUpdate(callback, executeListener);
  }

  /**
   * Register a callback to be executed when the script is detached, i.e. when
   * `detach` as been called, or when the script has been deleted
   * @param {Function} callback - Callback function
   */
  onDetach(callback) {
    this.#state.onDetach(callback);
  }
}

export default SharedScript;
