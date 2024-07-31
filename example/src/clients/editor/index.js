import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

import pluginScripting from '@soundworks/plugin-scripting/client.js';
import '@soundworks/plugin-scripting/components/sw-plugin-scripting.js';

import '@ircam/sc-components/sc-tab.js';
import '../components/sw-audit.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  /**
   * Load configuration from config files and create the soundworks client
   */
  const config = loadConfig();
  const client = new Client(config);

  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: false,
  });

  client.pluginManager.register('scripting', pluginScripting);

  await client.start();

  const scripting = await client.pluginManager.get('scripting');
  // grab scripting underlying filesystem plugin

  function renderApp() {
    render(html`
      <div class="controller-layout">
        <header>
          <h1>${client.config.app.name} | ${client.role}</h1>
          <div>
            <sc-tab .options=${['coucou', 'niap']}></sc-tab>
            <sw-audit .client="${client}"></sw-audit>
          </div>
        </header>
        <section>
          <sw-plugin-scripting
            .plugin=${scripting}
          ></sw-plugin-scripting>
        </section>
      </div>
    `, $container);
  }

  renderApp();
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
  width: '50%',
});
