import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';

import createLayout from './views/layout.js';
import { html } from 'lit';

import '@ircam/simple-components/sc-editor.js';
// import '@ircam/simple-components/sc-button.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = window.SOUNDWORKS_CONFIG;

async function main($container) {
  const client = new Client(config);

  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: false,
  });

  await client.start();

  const data = await client.stateManager.attach('data');

  const $layout = createLayout(client, $container);
  const { width, height } = $container.getBoundingClientRect();

  $layout.addComponent(html`
    <sc-editor
      width="${width}"
      height="${height}"
      @change="${e => data.set({ script: e.detail.value })}"
    ></sc-editor>
  `);


  data.onUpdate(async updates => {
    if ('transpiled' in updates) {
      let transpiled = updates.transpiled;
      console.log(transpiled);

      const file = new File([transpiled], data.get('filename'), { type: 'text/javascript' });
      const url = URL.createObjectURL(file);
      // transpiled = `data:text/javascript;name=my-script.js;base64,${transpiled}`;

      const module = await import(/* webpackIgnore: true */url);

      console.log(module.foo);
      module.test();
    }

    if ('script' in updates) {
      $layout.shadowRoot.querySelector('sc-editor').value = updates.script;
    }
  }, true);
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
  width: '50%',
});
