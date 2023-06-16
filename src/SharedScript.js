import { isBrowser } from '@ircam/sc-utils';

/**
 * A SharedScript can be distributed amongst different clients and modified
 * at runtime. The script source is stored directly in the filestem, see
 * `dirname` option of the server-side plugin.
 * A Shared script cannot be instatiated manually, it is retrieved by calling
 * the client's or  server `PluScritping.attach` method.
 */
class SharedScript {
  constructor(name, scriptState, plugin) {
    this.name = name;

    this._state = scriptState;
    this._plugin = plugin;
    this._url = null;
  }

  /**
   * @type {string}
   * @readonly
   * The actual source of the script, mirrors the content of the script file.
   */
  get source() {
    return this._state.get('source');
  }

  /**
   * @type {string}
   * @readonly
   * Formatted error that may have occured during the transpilation of the script.
   * If no error occured during transpilation, the attribute is set to null.
   */
  get error() {
    return this._state.get('error');
  }

  /**
   * @type {string}
   * @readonly
   * Transpiled source code of the script, i.e. the actual code that is be imported.
   * If an error occured during transpilation, the attribute is set to null.
   */
  get transpiled() {
    return this._state.get('transpiled');
  }

  /**
   * Dynamically import the transpiled module.
   * {@link https://caniuse.com/?search=import()}
   * @returns {Promise} Promise which fulfills to an object containing all exports
   *  the script.
   */
  async import() {
    const transpiled = this._state.getUnsafe('transpiled');
    const filename = this._state.get('filename');

    // @note 2023-06-15 - we need this branch because File is still experimental
    // and only available in node 20, when node 20 will be LTS or so we will
    // be able to remove this branching
    if (isBrowser()) {
      URL.revokeObjectURL(this._url);

      const file = new File([transpiled], filename, { type: 'text/javascript' });
      this._url = URL.createObjectURL(file);
      // the webpack ignore comment is not a huge problem as this is hidden in the lib
      return await import(/* webpackIgnore: true */url);
    } else {
      const url = "data:text/javascript;base64," + btoa(transpiled);
      return await import(url);
    }
  }

  /**
   * Stop listening for updates
   */
  async detach() {
    await this._state.detach();
  }

  /**
   * Register a callback to be executed when the script is updated.
   * @param {Function} callback - Callback function
   * @param {boolean} [executeListener=false] - If true, execute the given
   *  callback immediately.
   * @return {Function} Function that unregister the callback when executed.
   */
  onUpdate(callback, executeListener = false) {
    return this._state.onUpdate(callback, executeListener);
  }

  /**
   * Register a callback to be executed when the script is detached, i.e. when
   * `detach` as been called, or when the script has been deleted
   * @param {Function} callback - Callback function
   */
  onDetach(callback) {
    this._state.onDetach(callback);
  }

  // convenience methods

  /**
   * Alias for `plugin.updateScript(name, value)`, calling this method will update
   * the source of the script. The update will be propagated to all attached scripts
   * @param {string} value - New source code for the script.
   */
  async update(value) {
    await this._plugin.update(this.name, value);
  }

  /**
   * Alias for `plugin.deleteScript(name)`, calling this method will entirely delete
   * the script: the file and all associated scripts. If you just want to stop
   * using the current script without deleting it, call detach instead
   */
  async delete() {
    await this._plugin.delete(this.name);
  }
}

export default SharedScript;
