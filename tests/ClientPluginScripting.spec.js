import path from 'node:path';

import { Client } from '@soundworks/core/client.js';
import { Server } from '@soundworks/core/server.js';
import { assert } from 'chai';

import ClientPluginScripting from '../src/ClientPluginScripting.js';
import ServerPluginScripting from '../src/ServerPluginScripting.js';
import {
  kGetNodeBuild,
  kGetBrowserBuild,
} from '../src/SharedScript.js';

const staticScripts = path.join(process.cwd(), 'tests', 'static-scripts');

const config = {
  app: {
    name: 'test-plugin-scripting',
    clients: {
      test: { runtime: 'node' },
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

describe(`ClientPluginScripting`, () => {
  let server = null;
  let serverPlugin = null;

  beforeEach(async () => {
    server = new Server(config);
    server.pluginManager.register('scripting', ServerPluginScripting);
    await server.start();
    serverPlugin = await server.pluginManager.get('scripting');
  });

  afterEach(async () => {
    await server.stop();
  });

  describe(`# [private] async plugin.start()`, () => {
    it(`should be ready after client.init()`, async () => {
      await serverPlugin.switch(staticScripts);

      const client = new Client(config);
      client.pluginManager.register('scripting', ClientPluginScripting);

      await client.init();

      const plugin = await client.pluginManager.get('scripting');
      // internals are up to date
      assert.isAbove(plugin.getList().length, 0);

      // need to clean chokidat listeners
      await client.start();
      await client.stop();
    });
  });

  describe('# plugin.attach(name) -> Script', () => {
    it('should throw if script name is not a string', async () => {
      await serverPlugin.switch({ dirname: staticScripts });

      const client = new Client(config);
      client.pluginManager.register('scripting', ClientPluginScripting);

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
      await serverPlugin.switch({ dirname: staticScripts });

      const client = new Client(config);
      client.pluginManager.register('scripting', ClientPluginScripting);

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
      await serverPlugin.switch({ dirname: staticScripts });

      const client = new Client(config);
      client.pluginManager.register('scripting', ClientPluginScripting);
      await client.start();

      const plugin = await client.pluginManager.get('scripting');
      const script = await plugin.attach('export-default.js');
      // console.log(script);
      // assert.equal(script instanceof Script, true); // does not work for whatever reason
      assert.equal(script.name, 'export-default.js');
      assert.isNotNull(script[kGetBrowserBuild]);
      assert.isNotNull(script[kGetNodeBuild]);

      await client.stop();
    });
  });

  describe('# plugin.setScriptingContext(ctx) | globalThis.getScriptingContext()', () => {
    it(`should update global context`, async () => {
      const client = new Client(config);
      client.pluginManager.register('scripting', ClientPluginScripting);
      await client.start();

      const plugin = await client.pluginManager.get('scripting');
      class Test {};
      const ctx = {
        coucou: 42,
        test: new Test(),
      };

      plugin.setGlobalScriptingContext(ctx);
      const res = globalThis.getGlobalScriptingContext();

      assert.deepEqual(res, ctx);

      await client.stop();
    });
  });
});


