import { add } from './utils.js';

export const foo = 42;

export function test() {
  const result = add(foo, 3);
  console.log('test coucou', result);
}
