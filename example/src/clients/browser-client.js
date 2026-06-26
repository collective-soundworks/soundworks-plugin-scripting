import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

import ClientPluginScripting from '../../../src/client.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: false,
  });

  client.pluginManager.register('scripting', ClientPluginScripting);

  await client.start();

  const scripting = await client.pluginManager.get('scripting');
  const script = await scripting.attach('test');

  script.onUpdate(async updates => {
    if ('browserBuild' in updates) {
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

  render(html`
    <div class="controller-layout">
      <header>
        <h1>${client.config.app.name} | ${client.role}</h1>
        <sw-audit .client="${client}"></sw-audit>
      </header>
      <section>
        <p>Open the console</p>
      </section>
    </div>
  `, $container);
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
  width: '50%',
});
