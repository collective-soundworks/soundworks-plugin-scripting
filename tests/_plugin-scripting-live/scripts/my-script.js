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
