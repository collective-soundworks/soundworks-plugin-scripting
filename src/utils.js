import { isString } from '@ircam/sc-utils';
import normalizePath from 'normalize-path';

export function formatErrors(errors) {
  const { text, location } = errors[0];
  const lineSize = location.line.toString().length;

  // mimic error message from esbuild
  let msg = `\
[ERROR] ${text}

    ${location.file}:${location.line}:${location.column}:
      ${location.line} │ ${location.lineText}`

  if (location.length <= 1) {
    msg += `
      ${new Array(lineSize + 1).join(' ')} │ ${new Array(location.column + 1).join(' ')}^
    `;
  } else {
    msg += `
      ${new Array(lineSize + 1).join(' ')} │ ${new Array(location.column + 1).join(' ')}${new Array(location.length + 1).join('~')}
    `;
  }

  return msg;
}

export function sanitizeScriptName(name) {
  if (!isString(name)) {
    throw new Error('[soundworks:PluginScripting] Invalid script name, should be a string');
  }

  // don't go lower case as we may want to have class files, e.g. MyClass.js
  name = normalizePath(name);
  // @todo - if file extention is given, keep it untouched
  if (!name.endsWith('.js')) {
    return `${name}.js`;
  }

  return name;
}
