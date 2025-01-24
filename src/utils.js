import { isString } from '@ircam/sc-utils';
import normalizePath from 'normalize-path';

export function sanitizeScriptName(name) {
  if (!isString(name)) {
    throw new Error('Invalid script name, should be a string');
  }

  // don't go lower case as we may want to have class files, e.g. MyClass.js
  name = normalizePath(name);
  // @todo - if file extention is given, keep it untouched
  if (!name.endsWith('.js')) {
    return `${name}.js`;
  }

  return name;
}

export const kScriptStore = Symbol.for('sw:plugin:scripting');
