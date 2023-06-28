import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';
import { html } from 'lit';

import pluginScripting from '../../../../../src/PluginScriptingClient.js';
import '../../../../../components/sw-plugin-scripting.js';

import createLayout from './layout.js';

// import { html } from 'lit';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = window.SOUNDWORKS_CONFIG;

async function main($container) {
  const client = new Client(config);

  client.pluginManager.register('scripting', pluginScripting);

  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: false,
  });

  await client.start();

  const scripting = await client.pluginManager.get('scripting');
  const script = await scripting.attach('my-script');

  const $layout = createLayout(client, $container);

  console.log(script);

  $layout.addComponent(html`
    <sw-plugin-scripting
      .plugin="${scripting}"
    ></sw-plugin-scripting>
  `);
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
  width: '50%',
});
