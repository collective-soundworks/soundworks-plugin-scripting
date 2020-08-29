const { parse } = require('../server/parse.js');

{
  console.log('> parse a simple function');

  let code = `
  function circles(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
  }
  `;

  const { args, body } = parse(code);
  console.log('args', args);
  console.log('body', body);
}

{
  console.log('> function w/ no arguments');

  let code = `
  function circles() {
    return 42;
  }
  `;

  const { args, body } = parse(code);
  console.log('args', args);
  console.log('body', body);
}

{
  console.log('> parse only first declared function, allow comments and ignore whatever declared before / after');

  let code = `
  const a = 'a';
  // short comment before -> function (will break without strip comment)
  /**
   * long comment
   */
  function circles(ctx, width, height) {
    // short comment inside function
    /**
     * long comment inside function
     */
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < 5000; i++) {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = 200; // Math.floor(Math.random() * 256);
    }
  }
  // short comment after function
  /**
   * long comment after function
   */
  function test() {
    return 'shoudl not appear'
  }
  `;

  const { args, body } = parse(code);
  console.log('args', args);
  console.log('body', body);
}

{
  console.log('> allow $ and _ in arguments names');

  let code = `
  function circles($ctx, _width, height) {
    $ctx.clearRect(0, 0, _width, height);
  }
  `;

  const { args, body } = parse(code);
  console.log('args', args);
  console.log('body', body);
}



