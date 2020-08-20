import Script from '../common/Script';
import fs from 'fs';
import path from 'path';
import camelCase from 'lodash.camelcase';
import slugify from 'slugify';
import mkdirp from 'mkdirp';
import chokidar from 'chokidar';

import * as babel from '@babel/core';
import babelConfig from './babelConfig.js';

const schema = {
  list: {
    type: 'any',
    default: [],
  },
}

// @note - maybe separate requested value from current value
//       - upside: more cleans
//       - downside: more network traffic (but maybe we really don't care...)
const scriptSchema = {
  name: {
    type: 'string',
    default: '',
  },
  value: {
    type: 'string',
    default: '',
  },
  requestValue: {
    type: 'string',
    default: null,
    nullable: true,
    event: true,
  },
  args: {
    type: 'any',
    default: [],
  },
  body: {
    type: 'string',
    default: '',
  },
  err: {
    type: 'any',
    default: null,
    nullable: true,
  }
};

 // cf. https://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically
const STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

function getArgs(func) {
  const fnStr = func.toString().replace(STRIP_COMMENTS, '');
  let result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

  if (result === null) {
    result = [];
  }

  return result;
}

// cf. https://github.com/nulltask/function-body-regex
function getBody(func) {
  func = func.trim();
  const regExp = /.*function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/;
  const values = regExp.exec(func);
  return values[1];
}

// we put a named function as default because anonymous functions
// seems to be forbidden in globals scope (which kind of make sens)
const defaultScriptValue = `function script() {}`;

const pluginFactory = function(AbstractPlugin) {

  return class PluginScripting extends AbstractPlugin {
    constructor(server, name, options) {
      super(server, name);

      const defaults = {
        directory: path.join(process.cwd(), '.db', 'scripts'),
      };

      this.scriptStates = new Map();

      this.options = this.configure(defaults, options);
      // create folder
      mkdirp.sync(this.options.directory);

      this.states = new Map();
      this.server.stateManager.registerSchema(`s:${this.name}`, schema);
    }

    async start() {
      this.state = await this.server.stateManager.create(`s:${this.name}`);
      // init with existing files
      // await this._loadFromDirectory();

      const watcher = chokidar.watch(this.options.directory, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
      });

      watcher.on('add', pathname => {
        const scriptName = path.basename(pathname, '.js');
        const code = fs.readFileSync(pathname).toString().trim() || null;

        this.create(scriptName, code);
      });

      watcher.on('change', pathname => {
        const scriptName = path.basename(pathname, '.js');
        const value = fs.readFileSync(pathname).toString();
        const scriptState = this.scriptStates.get(scriptName);

        if (scriptState.get('value') !== value) {
          scriptState.set({ requestValue: value });
        } else {
          // console.log('abort update');
        }
      });

      watcher.on('unlink', pathname => {
        const scriptName = path.basename(pathname, '.js');
        this.delete(scriptName);
      });

      this.started();
      this.ready();
    }

    connect(client) {
      super.connect(client);

      client.socket.addListener(`s:${this.name}:create`, async (name, value) => {
        await this.create(name, value);
        client.socket.send(`s:${this.name}:create-ack:${name}`);
      });

      client.socket.addListener(`s:${this.name}:delete`, async (name) => {
        await this.delete(name);
        client.socket.send(`s:${this.name}:delete-ack:${name}`);
      });
    }

    disconnect(client) {
      super.disconnect(client);
    }

    getList() {
      return this.state.get('list');
    }

    subscribe(callback) {
      return this.state.subscribe(callback);
    }

    // we don't need async here, just mimic StateManager API
    async attach(name) {
      if (this.scriptStates.has(name)) {
        const scriptState = this.scriptStates.get(name);
        return new Script(scriptState);
      } else {
        throw new Error(`[service-scripting] undefined script "${name}"`);
      }
    }

    async create(name, value = null) {
      if (!this.scriptStates.has(name)) {
        // register same schema with new name
        const scriptSchemaName = `s:${this.name}:script:${name}`;

        this.server.stateManager.registerSchema(scriptSchemaName, scriptSchema);
        const scriptState = await this.server.stateManager.create(scriptSchemaName, { name });

        scriptState.subscribe(updates => {
          for (let key in updates) {
            if (key === 'requestValue') {
              const code = updates.requestValue;

              try {
                const args = getArgs(code);
                const body = getBody(code);
                // babel handles parsing errors
                const transformed = babel.transformSync(body, babelConfig);

                scriptState.set({
                  value: code,
                  args,
                  body: transformed.code,
                  err: null,
                });

                // write to file
                const filename = path.join(this.options.directory, `${name}.js`);
                const content = fs.readFileSync(filename).toString();

                // prevent write if the update has been done on the file itself
                if (content !== code) {
                  fs.writeFileSync(filename, code);
                }
              } catch(err) {
                scriptState.set({ err: err });
                // console.log(err);
              }
            }
          }
        });

        this.scriptStates.set(name, scriptState);

        // update script list
        const list = Array.from(this.scriptStates.keys()).sort();
        this.state.set({ list });
      }

      const scriptState = this.scriptStates.get(name);

      if (value === null) {
        value = defaultScriptValue;
        const functionName = value.match(/function(.*?)\(/)[1].trim();
        // replace is non greedy by default
        value = value.replace(functionName, camelCase(name));
      }

      await scriptState.set({ requestValue: value });
    }

    async delete(name) {
      if (this.scriptStates.has(name)) {
        const scriptState = this.scriptStates.get(name);
        this.scriptStates.delete(name);

        // update script list
        const list = Array.from(this.scriptStates.keys()).sort();
        this.state.set({ list });

        // delete file
        const filename = path.join(this.options.directory, `${name}.js`);
        if (fs.existsSync(filename)) {
          fs.unlinkSync(filename);
        }

        // delete script (notify everyone...)
        scriptState.detach();
        this.server.stateManager.deleteSchema(`s:${this.name}:script:${name}`);
      }

      return Promise.resolve();
    }
  }
}

export default pluginFactory;
