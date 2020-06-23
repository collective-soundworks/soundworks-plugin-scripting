import '@babel/polyfill';
import '@wessberg/pointer-events';
import { Client } from '@soundworks/core/client';
import ScriptEditorExperience from './ScriptEditorExperience';
import initQoS from '../utils/qos';

import serviceScriptingFactory from '@soundworks/service-scripting/client';

const config = window.soundworksConfig;

async function init($container, index) {
  try {
    const client = new Client();

    // -------------------------------------------------------------------
    // register services
    // -------------------------------------------------------------------

    client.registerService('scripting', serviceScriptingFactory);

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------

    await client.init(config);
    initQoS(client);

    const $container = document.querySelector('#container');
    const experience = new ScriptEditorExperience(client, config, $container);

    document.body.classList.remove('loading');

    await client.start();
    experience.start();

  } catch(err) {
    console.error(err);
  }
}

window.addEventListener('load', init);
