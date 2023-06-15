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

  globalThis.getContext = () => {
    return { data };
  };

  const $layout = createLayout(client, $container);
  const { width, height } = $container.getBoundingClientRect();

  $layout.addComponent(html`
    <sc-editor
      width="${width}"
      height="${height}"
      @change="${e => data.set({ source: e.detail.value })}"
    ></sc-editor>
  `);


  data.onUpdate(async updates => {
    if ('transpiled' in updates && updates['transpiled'] !== null) {
      let transpiled = updates.transpiled;
      console.log(transpiled);

      // @todo - revoke old url

      const file = new File([transpiled], data.get('filename'), { type: 'text/javascript' });
      const url = URL.createObjectURL(file);
      // transpiled = `data:text/javascript;name=my-script.js;base64,${transpiled}`;
      // not a huge problem as this is hidden in the lib
      const module = await import(/* webpackIgnore: true */url);

      console.log('foo:', module.foo);
      const result = module.test();
      console.log(result);
      module.logContext();
      // module.launchTimer();
    }

    if ('formattedError' in updates && updates['formattedError'] !== null) {
      console.log('> build error');
      console.error(updates['formattedError']);
    }

    if ('source' in updates) {
      requestAnimationFrame(() => {
        $layout.shadowRoot.querySelector('sc-editor').value = updates.source;
      });
    }
  }, true);
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
  width: '50%',
});
