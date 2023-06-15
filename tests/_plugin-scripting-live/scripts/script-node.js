
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
