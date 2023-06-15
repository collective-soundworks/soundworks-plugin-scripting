import { isBrowser } from '@ircam/sc-utils';

/**
 * @note: error handling is still a beat weak, this should be improved
 */
class Script {
  constructor(name, scriptState, plugin) {
    this.name = name;

    this._state = scriptState;
    this._plugin = plugin;
    this._url = null;
  }

  get source() {
    return this._state.get('source');
  }

  get error() {
    return this._state.get('error');
  }

  // could be usefull for debugging
  get transpiled() {
    return this._state.get('transpiled');
  }

  async update(value) {
    await this._plugin.update(this.name, value);
  }

  async delete() {
    await this._plugin.delete(this.name);
  }

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

  async detach() {
    await this._state.detach();
  }

  onUpdate(callback, executeListener = false) {
    return this._state.onUpdate(callback, executeListener);
  }

  onDetach(callback) {
    this._state.onDetach(callback);
  }
}

export default Script;
