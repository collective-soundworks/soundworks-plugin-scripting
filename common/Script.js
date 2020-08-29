"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class Script {
  constructor(scriptState) {
    this._scriptState = scriptState;
    this.name = scriptState.get('name');

    this._scriptState.subscribe(updates => {
      if ('args' in updates && 'body' in updates) {
        const {
          args,
          body
        } = this._scriptState.getValues();

        this._function = new Function(...args, body);
      }
    }); // init function


    const {
      args,
      body
    } = this._scriptState.getValues();

    this._function = new Function(...args, body);
  }

  async setValue(value) {
    await this._scriptState.set({
      requestValue: value
    });
  }

  getValue() {
    return this._scriptState.get('value');
  }

  getError() {
    return this._scriptState.get('err');
  }

  subscribe(func) {
    const unsubscribe = this._scriptState.subscribe(updates => {
      // value is set with arg and body
      if ('value' in updates || 'error' in updates) {
        func(updates);
      }
    });

    return unsubscribe;
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
    } catch (err) {
      console.log(err);
    }
  }

}

var _default = Script;
exports.default = _default;