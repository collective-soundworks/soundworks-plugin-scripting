import { importFromString } from 'module-from-string';
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { formatError } from '../../src/common/parse-error.js';

const script = `
import fs from 'node:fs';
import path from 'node:path';
import { Server } from '@soundworks/core/server.js';
import { add } from './utils.js';

const server = new Server({
  env: {
    type: 'development',
    port: 8000,
    useHttps: false,
    serverAddress: '127.0.0.1',
  },
  app: {
    clients: {
      dummy: {
        target: 'node',
      },
    },
  },
});

await server.start();

console.log(process.cwd());

export const test = () => {
  console.log(add(40, 2));
  // console.log(process.cwd(), __dirname, __filename);
  // const text = fs.readFileSync(path.join(__dirname, 'test.js')).toString();
  // console.log(text);
}

export default {
  niap: 42,
};
`;

try {
  const ast = acorn.parse(script, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
} catch(err) {
  const { line, column } = err.loc;
  const prettyError = formatError(script, line, column);
  console.error(err.name, err.message);
  console.error(prettyError);
  process.exit(0);
}

const filename = path.join(process.cwd(), 'scripts', 'script-node.js');
fs.writeFileSync(filename, script);

// node --check

const module = await import(filename);

// const module = await importFromString(code, {
//   useCurrentGlobal: true,
// });

console.log(module.test);
console.log(module.default);
module.test();
