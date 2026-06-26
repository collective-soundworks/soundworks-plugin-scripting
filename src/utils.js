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

export function formatErrorStack(err, location) {
  const stackLines = err.stack.split('\n').map((line, index) => {
    // line 0 is error message, we don't want to cut it
    if (index !== 0 && line.length > 160) {
      return line.slice(0, 160) + '...';
    }

    return line;
  });
  // rewrite first line to insert actual source position
  stackLines[1] = `    at ${location.methodName} (${location.source}:${location.line}:${location.column})`;
  stackLines.splice(2, 0, `    | ${location.lineText}`);
  stackLines.length = 5; // no need for huge stack traces
  err.stack = stackLines.join('\n');

  return err;
}

export const kScriptStore = Symbol.for('sw:plugin:scripting');
