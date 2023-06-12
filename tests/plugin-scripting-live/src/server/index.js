import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

// import pluginScripting from '../../../../src/server/plugin-scripting.js'
// console.log(pluginScripting);

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import dataSchema from './schemas/data.js';

import fs from 'fs';
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


try {
  fs.mkdirSync(path.join(process.cwd(), 'scripts'));
} catch(err) {
  // directory exists
}

data.onUpdate(async updates => {
  if ('script' in updates) {
    const script = updates.script;
    console.log(script);

    // esbuld needs a file to bundle with deps, transform is isolated from the
    // filesystem (cf. https://esbuild.github.io/api/#transform)
    // so let's write it in a file before, wich is what we want in any case
    const filename = path.join(process.cwd(), 'scripts', data.get('filename'));
    fs.writeFileSync(filename, script);


    // build from file
    // @todo: see https://esbuild.github.io/api/#rebuild
    console.log('>>> start build');
    const builded = await build({
      entryPoints: [filename],
      format: 'esm',
      platform: 'browser',
      bundle: true,
      write: false,
      outfile: 'ouput',
      // sourcemap: true,
    });
    console.log('>>> end build');

    console.log(builded.outputFiles[0].text);
    // console.log(builded.toString());
    const transpiled = builded.outputFiles[0].text;

    data.set({ transpiled });
  }
});

const script = `\
import { add } from './utils.js';

export const foo = 42;

export function test() {
  const result = add(foo, 3);
  console.log('test ok', result);
}
`;

data.set({ script });

// and do your own stuff!

// const scripting = await server.pluginManager.get('scripting');
// console.log(scripting);

// const source = `
// export function test() {
//   console.log('ok');
// }
// `;

// // @todo - check https://dev.to/mxfellner/dynamic-import-with-http-urls-in-node-js-7og

// function doimport (str) {
//   if (globalThis.URL.createObjectURL) {
//     const blob = new Blob([str], { type: 'text/javascript' })
//     const url = URL.createObjectURL(blob)
//     const module = import(url);
//     URL.revokeObjectURL(url) // GC objectURLs
//     return module
//   }

//   const url = "data:text/javascript;base64," + btoa(moduleData)
//   return import(url)
// }

// const mod = await doimport(source);

// console.log(mod);
