
function padLeft(str, length) {
  str += '';
  while (str.length < length) {
    str = ' ' + str;
  }
  return str;
}

export function formatError(code, lineNbr, columnNbr) {
  const lines = code.split('\n');
  lines.unshift(''); // add line at the beginning to simplify access

  let stack = [];

  // two line before
  if (lines[lineNbr - 2] !== undefined) {
    stack.push({ lineNbr: lineNbr - 2, code: lines[lineNbr - 2] });
  }

  // one line before
  if (lines[lineNbr - 1] !== undefined) {
    stack.push({ lineNbr: lineNbr - 1, code: lines[lineNbr - 1] });
  }

  // the line
  stack.push({ lineNbr: lineNbr, code: lines[lineNbr] });
  // add line to show columnNbr
  let columnLine = '';
  for (let i = 0; i < columnNbr - 1; i++) {
    columnLine += ' ';
  }
  columnLine += '^';
  stack.push({ code: columnLine });

  // 1 line after
  if (lines[lineNbr + 1] !== undefined) {
    stack.push({ lineNbr: lineNbr + 1, code: lines[lineNbr + 1] });
  }

  // 1 line after
  if (lines[lineNbr + 2] !== undefined) {
    stack.push({ lineNbr: lineNbr + 2, code: lines[lineNbr + 2] });
  }

  const lineNbrs = stack.map(e => e.lineNbr).filter(n => n !== undefined);
  const maxLineNbr = Math.max.apply(null, lineNbrs);
  const padding = (maxLineNbr + '').length;

  // compute prefix (line number and >)
  stack.forEach(entry => {
    let prefix = '';
    if (entry.lineNbr) {
      if (entry.lineNbr === lineNbr) {
        entry.prefix = `> ${padLeft(entry.lineNbr, padding)} |`;
      } else {
        entry.prefix = `  ${padLeft(entry.lineNbr, padding)} |`;
      }
    } else {
      entry.prefix = `  ${padLeft('', padding)} |`;
    }
  });

  const prettyError = stack
    .map(entry => `${entry.prefix} ${entry.code}`)
    .join('\n');

  return prettyError;
}
