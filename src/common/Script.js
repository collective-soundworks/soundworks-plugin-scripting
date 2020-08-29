import { formatError, locateError } from './parse-error.js';

/**
 * @note: error handling is still a beat weak, this should be improved
 */
class Script {
  constructor(scriptState) {
    this._scriptState = scriptState;
    this.name = scriptState.get('name');

    this._scriptState.subscribe(updates => {
      if ('args' in updates || 'body' in updates) {
        const { args, body } = this._scriptState.getValues();
        this._function = new Function(...args, body);
      }
    });

    // store subscription to propagate runtime errors locally
    // cf. @todo in `execute`
    this._subscriptions = new Set();

    // init function
    const { args, body } = this._scriptState.getValues();
    this._function = new Function(...args, body);
  }

  async setValue(value) {
    await this._scriptState.set({ requestValue: value });
  }

  getValue() {
    return this._scriptState.get('value');
  }

  subscribe(func) {
    this._subscriptions.add(func);

    const unsubscribe = this._scriptState.subscribe(updates => {
      // value is set with arg and body
      if (('value' in updates) || ('error' in updates)) {
        if (updates.error) {
          this._logError(updates.error);
        }

        func(updates);
      }
    });

    return () => {
      this._subscriptions.delete(func);
      unsubscribe();
    };
  }

  async detach() {
    if (this._scriptState._client.id === this._scriptState._owner) {
      // we are server side, so, do nothing for now as we would really delete
      // the state, which is something we don't want because it would delete
      // the script for every clients.
      //
      // so, let's pretend it does what we think it should do for now
      if (this._onDetachFunction) {
        this._onDetachFunction();
      }
    } else {
      return this._scriptState.detach();
    }
  }

  onDetach(func) {
    this._onDetachFunction = func;
    this._scriptState.onDetach(func);
  }

  execute(...args) {
    try {
      return this._function(...args);
    } catch(err) {
      // @todo - we would like to propagate runtime errors on the network
      // to facilitate remote debugging, but we don't want to bloat the
      // network. Implementing that would imply a far more robust Object handling
      // on the StateManager side (which should be done at some point).
      // for now just propagate the runtime error locally
      const error = {
        name: err.name,
        message: err.message,
        code: '',
      }

      if (
        err.name === 'ReferenceError' ||
        err.name === 'TypeError'
      ) {
        const code = this._scriptState.get('value');
        const { line, column } = locateError(code, err.message);
        const prettyError = formatError(code, line, column);
        error.code = prettyError;
      }

      this._logError(error);
      this._subscriptions.forEach(callback => callback({ error }));
    }
  }

  _logError(error) {
    console.error(`[script:${this.name}] ${error.name}: ${error.message}\n\n${error.code}`);
  }
}

export default Script;
