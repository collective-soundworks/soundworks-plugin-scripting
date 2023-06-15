import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

// import pluginScripting from '../../../../src/server/plugin-scripting.js'
// console.log(pluginScripting);

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import dataSchema from './schemas/data.js';

import { promises as fs } from 'fs';
import path from 'path';
import { build, transform } from 'esbuild';

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
// server.pluginManager.register('scripting', pluginScripting);
server.stateManager.registerSchema('data', dataSchema);

/**
 * Launch application (init plugins, http server, etc.)
 */
await server.start();


const data = await server.stateManager.create('data');


globalThis.getContext = () => {
  return { data };
}

try {
  fs.mkdirSync(path.join(process.cwd(), 'scripts'));
} catch(err) {
  // directory exists
}

// @todo - update hook
data.onUpdate(async updates => {
  if ('source' in updates) {
    const script = updates.source;
    console.log(script);

    // esbuld needs a file to bundle with deps, transform is isolated from the
    // filesystem (cf. https://esbuild.github.io/api/#transform)
    // so let's write it in a file before, which is what we want in any case
    const filename = path.join(process.cwd(), 'scripts', data.get('filename'));
    await fs.writeFile(filename, script);


    // build from file
    // @todo: see https://esbuild.github.io/api/#rebuild
    console.log('>>> start build');
    let buildResult;

    try {
      const buildResult = await build({
        entryPoints: [filename],
        format: 'esm',
        platform: 'browser',
        bundle: true,
        write: false,
        outfile: 'ouput',
        // sourcemap: true,
      });

      // console.log(buildResult.toString());
      const transpiled = buildResult.outputFiles[0].text;

      data.set({
        transpiled,
        error: null,
        formattedError: null,
      });
    } catch (err) {
      console.log('>>> build error');

      data.set({
        error: err.errors,
        formattedError: formatErrors(err.errors),
        transpiled: null,
      });

      return;
    }
  }

  if ('transpiled' in updates && updates['transpiled'] !== null) {
    const url = "data:text/javascript;base64," + btoa(updates['transpiled']);
    const { foo, test, logContext, launchTimer } = await import(url);

    console.log('> execute transpiled script');
    console.log(foo);
    console.log(test());
    logContext();
    // launchTimer();
  }
  if ('formattedError' in updates && updates['formattedError'] !== null) {
    console.log('> there was an error');
    console.log(updates['formattedError']);
  }
});

const source = `\
// support static dependencies
import { add } from './utils.js';
// support installed dependencies
import { getTime } from '@ircam/sc-gettime';
// support context defined at runtime through global object
const context = await getContext();

export const foo = 42;

export function test() {
  const result = add(foo, 3);
  console.log('> test called: adding 3 to foo');
  return result;
}

export function logContext() {
  const values = context.data.getValues();
  console.log(values);
}

export function launchTimer() {
  setInterval(() => console.log(getTime()), 1000);
}
`;

data.set({ source });

