import path from 'node:path';

import { Server } from '@soundworks/core/server.js';
import { assert } from 'chai';

import ServerPluginScripting from '../src/ServerPluginScripting.js';
import {
  kGetNodeBuild,
  kGetBrowserBuild,
} from '../src/SharedScript.js';

const dirname = path.join(process.cwd(), 'tests', 'static-scripts');

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
};

describe(`SharedScript`, () => {
  it('# script getters', async () => {
    const server = new Server(config);
    server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
    await server.start();

    const plugin = await server.pluginManager.get('scripting');
    const script = await plugin.attach('export-default');

    assert.equal(script.name, 'export-default.js');
    assert.equal(script.filename, path.join('tests', 'static-scripts', 'export-default.js'));
    assert.isNull(script.buildError);
    assert.isNull(script.runtimeError);
    assert.isNotNull(script[kGetNodeBuild]);
    assert.isNotNull(script[kGetBrowserBuild]);

    await server.stop();
  });

  describe('# script.import()', () => {
    it('should work with default export', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('export-default');

      const { default: add } = await script.import();
      assert.equal(add(4, 4), 8);

      await server.stop();
    });

    it('should work with named export', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('export-named');
      const { add } = await script.import();

      assert.equal(add(4, 4), 8);

      await server.stop();
    });

    it('should be able to import relative files', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('import-relative');
      const { square } = await script.import();

      assert.equal(square(5), 25);

      await server.stop();
    });

    it('should be able to import packages', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('import-package');
      const { checkString } = await script.import();

      assert.equal(checkString('ok'), true);

      await server.stop();
    });

    it('should be able to retrieve global context', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
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

  describe('# script.detach()', async () => {
    it('should not crash', async () => {
      const server = new Server(config);
      server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
      await server.start();

      const plugin = await server.pluginManager.get('scripting');
      const script = await plugin.attach('import-package');

      await script.detach();
      await server.stop();

      assert.ok(true);
    });
  });
});

