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

