import fs from 'node:fs';
import path from 'node:path';

import { Client } from '@soundworks/core/client.js';
import { Server } from '@soundworks/core/server.js';
import { assert } from 'chai';

import pluginScriptingClient from '../src/client/plugin-scripting.js';
import pluginScriptingServer from '../src/server/plugin-scripting.js';
// import Script from '../src/common/script.js';

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
  role: 'test',
};

describe(`[server] PluginScripting`, () => {
  let server = null;
  let serverPlugin = null;

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

  beforeEach(async () => {
    server = new Server(config);
    server.pluginManager.register('scripting', pluginScriptingServer);
    await server.start();
    serverPlugin = await server.pluginManager.get('scripting');
  });

  afterEach(async () => {
    await server.stop();
  });

  describe(`# [private] async plugin.start()`, () => {
    it.only(`should be ready after client.init()`, async () => {
      await serverPlugin.switch(staticScripts);

      const client = new Client(config);
      client.pluginManager.register('scripting', pluginScriptingClient);

      await client.init();

      const plugin = await client.pluginManager.get('scripting');
      // internals are up to date
      assert.isAbove(plugin._internalsState.get('nameList').length, 0);
      assert.isAbove(plugin._internalsState.get('nameIdMap').length, 0);

      // need to clean chokidat listeners
      await client.start();
      await client.stop();
    });
  });

  describe(`# plugin.createScript(name, value = '')`, () => {
    it('should throw if script name is not a string', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.createScript(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if value is not a string', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.createScript('test', null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script already exists', async () => {
      fs.writeFileSync(path.join(dynamicScripts, 'already-exists.js'), 'const a = 42;');

      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.createScript('already-exists.js', '');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should write the file with given value and update internals before fullfilling', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');
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

      await client.stop();
    });
  });

  describe('# plugin.updateScript(name, value)', () => {
    it('should throw if script name is not a string', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.updateScript(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if value is not a string', async () => {
      fs.writeFileSync(path.join(dynamicScripts, 'update-script.js'), 'const a = 42;');

      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.updateScript('update-script.js', null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script does not exists', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.updateScript('does-not-exists.js', '');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should update the file with given value and update internals before fullfilling', async () => {
      const scriptName = 'update-script.js';
      fs.writeFileSync(path.join(dynamicScripts, scriptName), 'const a = 42;');

      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');
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

      await client.stop();
    });
  });

  describe('# plugin.deleteScript(name)', () => {
    it('should throw if script name is not a string', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.deleteScript(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script does not exists', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.deleteScript('does-not-exists.js', '');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should delete the file with given value and update internals before fullfilling', async () => {
      const scriptName = 'update-script.js';
      fs.writeFileSync(path.join(dynamicScripts, scriptName), 'const a = 42;');

      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      await plugin.deleteScript(scriptName);
      // value should be up-to-date
      const exists = fs.existsSync(path.join(dynamicScripts, scriptName));
      assert.equal(exists, false);
      // internals should be up-to-date
      const names = plugin.getScriptNames();
      assert.equal(names.includes(scriptName), false);
      // script should be in the list
      assert.equal(plugin._scriptStatesByName.has(scriptName), false);

      await client.stop();
    });
  });

  describe('# plugin.attach(name) -> Script', () => {
    it('should throw if script name is not a string', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: staticScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.attach(null);
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should throw if script does not exists', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: staticScripts });

      await client.start();

      const plugin = await client.pluginManager.get('scripting');

      let errored = false;
      try {
        await plugin.attach('does-not-exists.js');
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      await client.stop();

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

    it('should return a script instance', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: staticScripts });
      await client.start();

      const plugin = await client.pluginManager.get('scripting');
      const script = await plugin.attach('export-default.js');
      const expected = fs.readFileSync(path.join(staticScripts, 'export-default.js')).toString();

      // assert.equal(script instanceof Script, true); // does not work for whatever reason
      assert.equal(script.name, 'export-default.js');
      assert.equal(script.source, expected);

      await client.stop();
    });
  });

  describe('# plugin.setScriptingContext(ctx) | globalThis.getScriptingContext()', () => {
    it(`should update global context`, async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer);
      await client.start();

      const plugin = await client.pluginManager.get('scripting');
      class Test {};
      const ctx = {
        coucou: 42,
        test: new Test(),
      };

      plugin.setGlobalScriptingContext(ctx);
      const res = getGlobalScriptingContext();

      assert.deepEqual(res, ctx);

      await client.stop();
    });
  });

  describe('# plugin.onUpdate(callbacks, executeListener = false)', () => {
    it.skip(`todo`, () => {});
  });

  describe('# sanitizeName(scriptName)', () => {
    it('should allow to work without explicit extension', async () => {
      const client = new Server(config);
      client.pluginManager.register('scripting', pluginScriptingServer, { dirname: dynamicScripts });
      await client.start();

      const plugin = await client.pluginManager.get('scripting');
      await plugin.createScript('myScript');
      await plugin.updateScript('myScript', 'const a = 42;');

      const script = await plugin.attach('myScript');
      assert.equal(script.name, 'myScript.js');

      await plugin.deleteScript('myScript');

      await client.stop();
    });
  });
});


