import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';
import pluginScripting from '@soundworks/plugin-scripting/client.js';
import { AudioContext } from 'node-web-audio-api';


// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function bootstrap() {
  const config = loadConfig(process.env.ENV, import.meta.url);
  const client = new Client(config);

  client.pluginManager.register('scripting', pluginScripting);

  launcher.register(client);
  await client.start();

  const audioContext = new AudioContext();
  const global = await client.stateManager.attach('global');
  const scripting = await client.pluginManager.get('scripting');
  const script = await scripting.attach('index');

  let output = null;
  let mod = null;

  script.onUpdate(async updates => {
    if (updates.nodeBuild) {
      if (mod) {
        try {
          // we want to manually catch error that might be thrown in `exit()`
          // bacause the `mod`` might never be updated in such case
          output.disconnect();
          mod.exit();
        } catch (err) {
          script.reportRuntimeError(err);
        }
      }

      mod = await script.import();
      output = mod.enter(audioContext, global);
      output.connect(audioContext.destination);
    }
  }, true);
}

// The launcher allows to fork multiple clients in the same terminal window
// by defining the `EMULATE` env process variable
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side
launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
