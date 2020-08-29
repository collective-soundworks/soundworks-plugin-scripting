const { parse } = require('../server/parse.js');
const { formatError, locateError } = require('../common/parse-error.js');

const code = `function circles2(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  const w = _width / 100; // <- ReferenceError here
  const h = height / 100;

  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 100 j++) { // <- SyntaxError here
      if (i % 2 === 0 && j % 2 === 0) {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const a = Math.random();

        const x = i * w;
        const y = j * h;

        const radius = w / 2;

        ctx.beginPath();
        ctx.globalAlpha = a;
        ctx.arc(x, y, radius, 0, Math.PI * 2, false);
        ctx.fill();
      }
    }
  }
}
`;

try {
  parse(code);
} catch(err) {
  console.log('# pretty display SyntaxError');
  const { line, column } = err.loc;
  const prettyError = formatError(code, line, column);
  console.log(prettyError);
}

{
  console.log('# locate ReferenceError and TypeError, then pretty display ');
  const { line, column } = locateError(code, '_width is not defined');
  const prettyError = formatError(code, line, column);
  console.log(prettyError);
}





