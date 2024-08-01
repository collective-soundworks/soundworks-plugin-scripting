import fs from 'node:fs';
import path from 'node:path';

import { Server } from '@soundworks/core/server.js';
import { assert } from 'chai';
import { isFunction } from '@ircam/sc-utils';

import pluginScriptingServer from '../src/PluginScriptingServer.js';
import {
  kGetNodeBuild,
  kGetBrowserBuild,
} from '../src/SharedScript.js';

const staticScripts = path.join(process.cwd(), 'tests', 'static-scripts');

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
  describe(`# [private] plugin.contructor(server, id, options)`, async () => {
    it('should support no options', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer);

      await server.start();
      await server.stop();
    });

    it('should support options.dirname = null', async () => {
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

      await server.start();
      await server.stop();
    });


    it('should throw if options.dirname is neither a string or null', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, {
        dirname: 42
      });

      let errored = false;

      try {
        await server.start();
      } catch (err) {
        console.log(err.message);
        errored = true;
      }

      if (!errored) {
        assert.fail('should have thrown');
      }
    });

  });

  describe(`# [private] async plugin.start()`, () => {
    it(`should be ready after server.init()`, async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, {
        dirname: staticScripts
      });

      await server.init();

      const plugin = await server.pluginManager.get('scripting');
      const someScript = await plugin.attach('scripting-context'); // last in list

      assert.isNotNull(someScript[kGetBrowserBuild]);
      assert.isNotNull(someScript[kGetNodeBuild]);
      // internals are up to date
      assert.isAbove(plugin._scriptInfosByName.size, 0);
      assert.isAbove(plugin._internalState.get('nameList').length, 0);
      assert.isAbove(plugin._internalState.get('nameIdMap').length, 0);

      // need to clean chokidat listeners
      await server.start();
      await server.stop();
    });
  });

  describe('# plugin.switch(dirname)', () => {
    it(`should switch properly`, async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer);

      await server.start();

      const plugin = await server.pluginManager.get('scripting');

      assert.equal(plugin._scriptInfosByName.size, 0);
      assert.equal(plugin.getList().length, 0);

      {
        await plugin.switch(staticScripts);
        // build are done before switch is resolved
        const someScript = await plugin.attach('scripting-context'); // last in list
        assert.isNotNull(someScript[kGetBrowserBuild]);
        assert.isNotNull(someScript[kGetNodeBuild]);

        const expected = [
          'export-default.js',
          'export-named.js',
          'import-package.js',
          'import-relative.js',
          'scripting-context.js',
          'utils/math.js'
        ];

        assert.deepEqual(plugin.getList(), expected);
        assert.equal(plugin._scriptInfosByName.size, expected.length);
      }

      { // alternative API - { dirname }
        const dirname = path.join(staticScripts, 'utils');
        await plugin.switch({ dirname });

        // build are done before switch is resolved
        const someScript = await plugin.attach('math.js'); // last in list
        assert.isNotNull(someScript[kGetBrowserBuild]);
        assert.isNotNull(someScript[kGetNodeBuild]);

        const expected = [
          'math.js'
        ];

        assert.deepEqual(plugin.getList(), expected);
        assert.equal(plugin._scriptInfosByName.size, expected.length);
      }

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
      const script = await plugin.attach('export-default.js');
      const mod =  await script.import();

      assert.equal(script.name, 'export-default.js');
      assert.isTrue(isFunction(mod.default));
      assert.equal(mod.default(2, 2), 4); // default is `add` function

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

      plugin.setGlobalScriptingContext(ctx);
      const res = getGlobalScriptingContext();

      assert.deepEqual(res, ctx);

      await server.stop();
    });
  });

  // describe('# plugin.onUpdate(callbacks, executeListener = false)', () => {
  //   it.skip(`todo`, () => {});
  // });
});

