import Script from '../common/Script';
import fs from 'fs';
import path from 'path';
import camelCase from 'lodash.camelcase';
import slugify from 'slugify';
import mkdirp from 'mkdirp';
import chokidar from 'chokidar';

import * as babel from '@babel/core';
import babelConfig from './babelConfig.js';
import { parse } from './parse.js';
import { formatError } from '../common/parse-error.js';

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
  error: {
    type: 'any',
    default: null,
    nullable: true,
  }
};


const pluginFactory = function(AbstractPlugin) {

  return class PluginScripting extends AbstractPlugin {
    constructor(server, name, options) {
      super(server, name);

      const defaults = {
        directory: path.join(process.cwd(), '.db', 'scripts'),
        defaultScriptValue: null,
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

    observe(callback) {
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
                // parse source code using acorn, should be robust enough
                // Syntax errors seems to be properly catched too
                // @note: maybe this could be done implementing a babel plugin to
                // avoid parsing twice... but maybe we don't really care...
                const { args, body } = parse(code);
                // babel handles parsing errors
                const transformed = babel.transformSync(body, babelConfig);

                scriptState.set({
                  value: code,
                  args,
                  body: transformed.code,
                  error: null,
                });

                // write to file
                const filename = path.join(this.options.directory, `${name}.js`);
                let content = null;

                // if the script has just been created, the file does not exists yet
                if (fs.existsSync(filename)) {
                  content = fs.readFileSync(filename).toString();
                }

                // prevent write if the update has been done on the file itself
                if (content !== code) {
                  fs.writeFileSync(filename, code);
                }
              } catch(err) {
                console.log(`[${this.name}:${name}]`, `${err.name}: ${err.message}`);
                console.log(err);

                const error = Object.assign({}, err);
                error.name = err.name;
                error.message = err.message;

                if (err.loc) {
                  const { line, column } = error.loc;
                  const prettyError = formatError(code, line, column);
                  error.code = prettyError;
                  console.log(prettyError);
                }

                scriptState.set({ error });
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
        value = this.options.defaultScriptValue || `function script() {}`;
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
