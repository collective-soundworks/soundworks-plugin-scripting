import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import pluginScripting from '@soundworks/plugin-scripting/client.js';
import pluginPlatformInit from '@soundworks/plugin-platform-init/client.js';
import { html, render } from 'lit';

import '../components/sw-credits.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`


const audioContext = new AudioContext();

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  // const audioContext = new AudioContext();
  // console.log(audioContext);

  client.pluginManager.register('scripting', pluginScripting);
  client.pluginManager.register('platform-init', pluginPlatformInit, {
    audioContext,
  });

  launcher.register(client, { initScreensContainer: $container });
  await client.start();

  const global = await client.stateManager.attach('global');
  const scripting = await client.pluginManager.get('scripting');
  const script = await scripting.attach('index');

  let output = null;
  let mod = null;

  script.onUpdate(async updates => {
    if (updates.browserBuild) {
      if (mod) {
        try {
          // we want to manually catch error that might be thrown in `exit()`
          // because otherwise `mod`` would never be updated
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

  function renderApp() {
    render(html`
      <div class="simple-layout">
        <p>Hello ${client.config.app.name}!</p>

        <sw-credits .infos="${client.config.app}"></sw-credits>
      </div>
    `, $container);
  }

  renderApp();
}

// The launcher enables instanciation of multiple clients in the same page to
// facilitate development and testing.
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
