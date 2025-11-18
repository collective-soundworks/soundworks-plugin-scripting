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

export function formatErrorStack(err, parsedInfos) {
  const stackLines = err.stack.split('\n');
  // rewrite first line to insert actual source position
  stackLines[1] = `    at ${parsedInfos.location.methodName} (${parsedInfos.location.source}:${parsedInfos.location.line}:${parsedInfos.location.column})`;
  stackLines.splice(2, 0, `    | ${parsedInfos.location.lineText}`);
  stackLines.length = 6; // no need for huge stack traces
  err.stack = stackLines.join('\n');

  return err;
}

export const kScriptStore = Symbol.for('sw:plugin:scripting');
