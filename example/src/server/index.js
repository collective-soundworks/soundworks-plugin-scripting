import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import { loadConfig } from '@soundworks/helpers/node.js';
import pluginScripting from '@soundworks/plugin-scripting/server.js';
import pluginPlatformInit from '@soundworks/plugin-platform-init/server.js';
// import { AudioContext } from 'node-web-audio-api';

import '../utils/catch-unhandled-errors.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

const server = new Server(config);
// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

server.pluginManager.register('platform-init', pluginPlatformInit);
server.pluginManager.register('scripting', pluginScripting, {
  dirname: 'my-scripts',
  verbose: true,
});

server.stateManager.registerSchema('global', {
  triggerInScript: {
    type: 'boolean',
    event: true,
  },
  triggerFromScript: {
    type: 'float',
    default: 0,
  },
});

await server.start();

const global = await server.stateManager.create('global');

setInterval(() => {
  global.set({ triggerInScript: true });
}, 1000);


