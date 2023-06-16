import fs from 'node:fs';
import path from 'node:path';

import { Server } from '@soundworks/core/server.js';
import { assert } from 'chai';

import pluginScriptingServer from '../src/PluginScriptingServer.js';

const dirname = path.join(process.cwd(), 'tests', 'static-scripts');

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

describe(`[common] Script`, () => {
  it('# script getters', async () => {
    const server = new Server(config);
    server.pluginManager.register('scripting', pluginScriptingServer, { dirname });
    await server.start();

    const plugin = await server.pluginManager.get('scripting');
    const script = await plugin.attach('export-default');

    assert.equal(script.name, 'export-default.js');
    assert.equal(script.source, fs.readFileSync(path.join(dirname, 'export-default.js')));
    assert.notEqual(script.transpiled, null);
    assert.equal(script.error, null);

    await server.stop();
  });

  describe('# script.import()', () => {
    it.skip('should work with default export - is this possible?', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('export-default');

      const add = await script.import();
      assert.equal(add(4, 4), 8);

      await server.stop();
    });

    it('should work with named export', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('export-named');
      const { add } = await script.import();

      assert.equal(add(4, 4), 8);

      await server.stop();
    });

    it('should be able to import relative files', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('import-relative');
      const { square } = await script.import();

      assert.equal(square(5), 25);

      await server.stop();
    });

    it('should be able to import relative files', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('import-package');
      const { checkString } = await script.import();

      assert.equal(checkString('ok'), true);

      await server.stop();
    });

    it('should be able to retrieve global context', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', pluginScriptingServer, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const ctx = { coucou: 42 };
      plugin.setGlobalScriptingContext(ctx);

      const script = await plugin.attach('scripting-context');
      const { forwardContext } = await script.import();

      await server.stop();

      assert.deepEqual(forwardContext(), ctx);
    });
  });
});

