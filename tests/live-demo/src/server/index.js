import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import pluginScripting from '../../../../src/server/plugin-scripting.js'

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

/**
 * Create the soundworks server
 */
const server = new Server(config);
// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

/**
 * Register plugins and schemas
 */
server.pluginManager.register('scripting', pluginScripting, {
  dirname: 'scripts',
});
// server.stateManager.registerSchema('my-schema', definition);

/**
 * Launch application (init plugins, http server, etc.)
 */
await server.start();

const scripting = await server.pluginManager.get('scripting');

// and do your own stuff!
try {
  await scripting._filesystem.rm('test.js');
  // await new Promise(resolve => setTimeout(resolve, 1000));
} catch(err) {
  console.log(err.message);
}

// no concept of ownership for scripts
await scripting.create('test.js', `
import { mult } from './utils/math.js';

export function square(num) {
  return mult(num, num);
}
`);

console.log('> attach script');
const script = await scripting.attach('test.js');

console.log('> listen for updates');
script.onUpdate(async () => {
  console.log('> script.onUpdate')
  const { square } = await script.import();
  console.log(square(5));
}, true);

await new Promise(resolve => setTimeout(resolve, 2000));

await scripting.update('test.js', `
import { mult } from './utils/math.js';

export function square(num) {
  return mult(num, num) + 2;
}
`);

console.log(script.source);

script.onDetach(() => {
  console.log('> script detached');
});

await new Promise(resolve => setTimeout(resolve, 2000));

scripting.delete('test');

