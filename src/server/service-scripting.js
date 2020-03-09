import Script from '../common/Script';
import fs from 'fs';
import path from 'path';
import camelCase from 'lodash.camelcase';
import slugify from 'slugify';
import mkdirp from 'mkdirp';
// @note - TypeError: Cannot read property 'transform' of undefined
// import babel from '@babel/core';

const schema = {
  list: {
    type: 'any',
    default: [],
  },
}

const scriptSchema = {
  name: {
    type: 'string',
    default: '',
  },
  value: {
    type: 'string',
    default: '',
  },
  args: {
    type: 'any',
    default: [],
  },
  body: {
    type: 'string',
    default: '',
  },
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
  const regExp = /^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/;
  const values = regExp.exec(func);
  return values[1];
}


const serviceFactory = function(Service) {

  return class ServiceScripting extends Service {
    constructor(server, name, options) {
      super(server, name);

      const defaults = {
        directory: path.join(process.cwd(), '.db', 'scripts'),
        defaultScriptValue: `function defaultName() {}`,
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
      await this.loadFromDirectory();

      this.started();
      this.ready();
    }

    connect(client) {
      super.connect(client);

      client.socket.addListener(`s:${this.name}:create`, async (name, value) => {
        await this.create(name, value);
        client.socket.send(`s:${this.name}:create-ack-${name}`);
      });

      client.socket.addListener(`s:${this.name}:delete`, async (name) => {
        await this.delete(name);
        client.socket.send(`s:${this.name}:delete-ack-${name}`);
      });
    }

    disconnect(client) {
      super.disconnect(client);
    }

    async loadFromDirectory(dirname) {
      const directory = this.options.directory;

      fs.readdir(directory, (err, files) => {
        if (err) {
          console.error('service-scripting: loadFromDirectory() error');
          console.error(err);
          return;
        }

        files.forEach(file => {
          const scriptName = path.basename(file, '.js');
          const pathname = path.join(directory, file);
          const code = fs.readFileSync(pathname);

          this.create(scriptName, code.toString());
        });
      });
    }

    // we put a named function as default because anonymous functions
    // seems to be forbidden in globals scope (which kind of make sens)
    //
    // @todo - clean / slugify script name (problem of dispatching cleaned name)
    //
    async create(name, value = null) {
      if (!this.scriptStates.has(name)) {
        // register same schema with new name
        this.server.stateManager.registerSchema(`s:${this.name}:script:${name}`, scriptSchema);
        const scriptState = await this.server.stateManager.create(`s:${this.name}:script:${name}`, { name });

        scriptState.subscribe(updates => {
          // console.log('in service', updates);
          for (let key in updates) {
            if (key === 'value') {
              const code = updates['value'];

              // @todo - transpile code w/ babel
              // cf. https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/user-handbook.md#babel-core
              // something like:
              // console.log(babel.transform(code));

              try {
                new Function(`${code}`)();
                const args = getArgs(code);
                const body = getBody(code);
                scriptState.set({ args, body });

                // write to file
                const filename = path.join(this.options.directory, `${name}.js`);
                fs.writeFileSync(filename, code);
              } catch(err) {
                // syntax error, just ignore
                console.log(err);
              }
            }
          }
        });

        this.scriptStates.set(name, scriptState);

        // update script list
        const list = Array.from(this.scriptStates.keys());
        this.state.set({ list });
      }

      const scriptState = this.scriptStates.get(name);

      if (value === null) {
        value = this.options.defaultScriptValue;
        const functionName = value.match(/function(.*?)\(/)[1].trim();
        // replace is non greedy by default
        value = value.replace(functionName, camelCase(name));
      }

      await scriptState.set({ value });
    }

    // we don't need async here, just mimic StateManager API
    async attach(name) {
      if (this.scriptStates.has(name)) {
        // here we would like to create a new state as we want to be able to
        // attach and detach server side without deleting the script completely
        // but this is one of the (many) limitations we have with the stateManager
        // at this point...
        // doing that would imply that the transport in the stateManager would
        // be able to define which strategy to choose (socket or EventListener)
        // to maintain states consistant.

        const scriptState = this.scriptStates.get(name);
        return new Script(scriptState);
      } else {
        throw new Error(`[service-scripting] undefined script "${name}"`);
      }
    }

    async delete(name) {
      if (this.scriptStates.has(name)) {
        const scriptState = this.scriptStates.get(name);
        this.scriptStates.delete(name);

        // update script list
        const list = Array.from(this.scriptStates.keys());
        this.state.set({ list });

        // delete file
        const filename = path.join(this.options.directory, `${name}.js`);
        fs.unlinkSync(filename);

        // delete script (notify everyone...)
        scriptState.detach();
        this.server.stateManager.deleteSchema(`s:${this.name}:script:${name}`);
      }

      return Promise.resolve();
    }

  }
}

// not mandatory
serviceFactory.defaultName = 'service-name';

export default serviceFactory;
