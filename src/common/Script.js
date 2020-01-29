
class Script {
  constructor(scriptState) {
    this._scriptState = scriptState;
    this.name = scriptState.get('name');

    this._scriptState.subscribe(updates => {
      // console.log(updates);
      if ('args' in updates && 'body' in updates) {
        const { args, body } = this._scriptState.getValues();
        this._function = new Function(...args, body);
      }
    });

    // init function
    const { args, body } = this._scriptState.getValues();
    this._function = new Function(...args, body);
  }

  async setValue(value) {
    await this._scriptState.set({ value });
  }

  getValue() {
    return this._scriptState.get('value');
  }

  subscribe(func) {
    const unsubscribe = this._scriptState.subscribe(updates => {
      if ('args' in updates && 'body' in updates) {
        func();
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
    } catch(err) {
      console.log(err);
    }
  }
}

export default Script;
