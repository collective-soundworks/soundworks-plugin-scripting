import fs from 'node:fs';
import path from 'node:path';

import { assert } from 'chai';

import { Server } from '@soundworks/core/server.js';
import pluginScriptingServer from '../src/server/plugin-scripting.js';
import Script from '../src/common/script.js';

const staticScripts = path.join(process.cwd(), 'tests', 'static-scripts');
const dynamicScripts = path.join(process.cwd(), 'tests', 'dynamic-scripts');

const config = {
  app: {
    name: 'test-plugin-scripting',
    clients: {
      test: { target: 'node' },
    },
  },
  env: {
    port: 8080,
    serverAddress: '127.0.0.1',
    useHttps: false,
    verbose: false,
  },
};

describe(`[server] PluginScripting`, () => {
  // keep repo clean
  before(async () => {
    if (fs.existsSync(dynamicScripts)) {
      fs.rmSync(dynamicScripts, { recursive: true });
    }

    fs.mkdirSync(dynamicScripts);
  });

  // keep repo clean
  after(() => {
    if (fs.existsSync(dynamicScripts)) {
      fs.rmSync(dynamicScripts, { recursive: true });
    }
  });

  describe(`# [private] plugin.contructor(server, id, options)`, async () => {
    it('should support no options', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer);

      await server.start();
      await server.stop();
    });

    it.skip('should support options.dirname = null', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, {
        dirname: null
      });

      await server.start();
      await server.stop();
    });

    it('should support options.dirname = string', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, {
        dirname: staticScripts
      });

      await server.init();

      const plugin = await server.pluginManager.get('scripting');
      // internals are up to date
      assert.isAbove(plugin._scriptStatesByName.size, 0);
      assert.isAbove(plugin._internalsState.get('nameList').length, 0);
      assert.isAbove(plugin._internalsState.get('nameIdMap').length, 0);

      // need to clean chokidat listeners
      await server.start();
      await server.stop();
    });
  });

  describe(`# [private] async plugin.start()`, () => {
    it(`should be ready after server.init()`, () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, {

      });
    });
  });

  describe('# plugin.switch(dirname)', () => {
    it.skip(`todo`, () => {});
  });

  describe(`# plugin.createScript(name, value = '')`, () => {
    it('should throw if script name is not a string', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.createScript(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if value is not a string', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.createScript('test', null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script already exists', async () => {
      fs.writeFileSync(path.join(dynamicScripts, 'already-exists.js'), 'const a = 42;');

      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.createScript('already-exists.js', '');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should write the file with given value and update internals before fullfilling', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const scriptName = 'create-script.js';
      const content = `const a = 42;`;
      await plugin.createScript(scriptName, content);

      // file content should be up-to-date
      const value = fs.readFileSync(path.join(dynamicScripts, scriptName)).toString();
      assert.equal(value, content);
      // internals should be up-to-date
      const names = plugin.getScriptNames();
      assert.equal(names.includes(scriptName), true);
      // script should be in the list
      assert.equal(plugin._scriptStatesByName.has(scriptName), true);

      await server.stop();
    });
  });

  describe('# plugin.updateScript(name, value)', () => {
    it('should throw if script name is not a string', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.updateScript(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if value is not a string', async () => {
      fs.writeFileSync(path.join(dynamicScripts, 'update-script.js'), 'const a = 42;');

      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.updateScript('update-script.js', null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script does not exists', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.updateScript('does-not-exists.js', '');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should update the file with given value and update internals before fullfilling', async () => {
      const scriptName = 'update-script.js';
      fs.writeFileSync(path.join(dynamicScripts, scriptName), 'const a = 42;');

      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const content = `const b = true;`;

      await plugin.updateScript(scriptName, content);
      // value should be up-to-date
      const value = fs.readFileSync(path.join(dynamicScripts, scriptName)).toString();
      assert.equal(value, content);
      // internals should be up-to-date
      const names = plugin.getScriptNames();
      assert.equal(names.includes(scriptName), true);
      // script should be in the list
      assert.equal(plugin._scriptStatesByName.has(scriptName), true);

      await server.stop();
    });
  });

  describe('# plugin.deleteScript(name)', () => {
    it('should throw if script name is not a string', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.deleteScript(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script does not exists', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.deleteScript('does-not-exists.js', '');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should delete the file with given value and update internals before fullfilling', async () => {
      const scriptName = 'update-script.js';
      fs.writeFileSync(path.join(dynamicScripts, scriptName), 'const a = 42;');

      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      await plugin.deleteScript(scriptName);
      // value should be up-to-date
      const exists = fs.existsSync(path.join(dynamicScripts, scriptName));
      assert.equal(exists, false);
      // internals should be up-to-date
      const names = plugin.getScriptNames();
      assert.equal(names.includes(scriptName), false);
      // script should be in the list
      assert.equal(plugin._scriptStatesByName.has(scriptName), false);

      await server.stop();
    });
  });

  describe('# plugin.attach(name) -> Script', () => {
    it('should throw if script name is not a string', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: staticScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.attach(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script does not exists', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: staticScripts });

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.attach('does-not-exists.js');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await server.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should return a script instance', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: staticScripts });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('simple-default.js');
      const expected = fs.readFileSync(path.join(staticScripts, 'simple-default.js')).toString();

      // assert.equal(script instanceof Script, true); // does not work for whatever reason
      assert.equal(script.name, 'simple-default.js');
      assert.equal(script.source, expected);

      await server.stop();
    });
  });

  describe('# plugin.setScriptingContext(ctx) | globalThis.getScriptingContext()', () => {
    it(`should update global context`, async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer);
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      class Test {};
      const ctx = {
        coucou: 42,
        test: new Test(),
      };

      plugin.setScriptingContext(ctx);
      const res = globalThis.getScriptingContext();

      assert.deepEqual(res, ctx);

      await server.stop();
    });
  });

  describe('# plugin.onUpdate(callbacks, executeListener = false)', () => {
    it.skip(`todo`, () => {});
  });

  describe('# sanitizeName(scriptName)', () => {
    it('should allow to work without explicit extension', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      await plugin.createScript('myScript');
      await plugin.updateScript('myScript', 'const a = 42;');

      const script = await plugin.attach('myScript');
      assert.equal(script.name, 'myScript.js');

      await plugin.deleteScript('myScript');

      await server.stop();
    });
  });
});

