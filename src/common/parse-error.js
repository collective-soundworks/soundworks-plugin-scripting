
function padLeft(str, length) {
  str += '';
  while (str.length < length) {
    str = ' ' + str;
  }
  return str;
}

// find location of ReferenceErrors
// this seems to work properly in Chrome, Firefox and Safari
export function locateError(code, errMsg) {
  const varname = errMsg.split(' ')[0];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const index = line.indexOf(varname);
    if (index !== -1) {
      return { line: i + 1, column: index + 1 };
    }
  }

  // didn't find anything
  return { line: 1, column: 1 };
}

export function formatError(code, lineNbr, columnNbr) {
  const lines = code.split('\n');
  lines.unshift(undefined); // add line at the beginning to match line numbers

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

