import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';

import ClientPluginScripting from '../../../src/client.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function bootstrap() {
  const config = loadConfig(process.env.ENV, import.meta.url);
  const client = new Client(config);

  // Eventually register plugins
  client.pluginManager.register('scripting', ClientPluginScripting);

  // https://soundworks.dev/tools/helpers.html#nodelauncher
  launcher.register(client);

  await client.start();

  const scripting = await client.pluginManager.get('scripting');
  const script = await scripting.attach('test');

  script.onUpdate(async updates => {
    if ('nodeBuild' in updates) {
      console.log('# import');
      const mod = await script.import();

      if (mod) {
        console.log('# execute');
        try {
          mod.execute();
        } catch (err) {
          script.reportRuntimeError(err);
        }
      }
    }
  }, true);
}

// The launcher allows to launch multiple clients in the same terminal window
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side
launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
