import * as acorn from 'acorn';

export function parse(code) {
  const ast = acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  // find first function in code
  const firstFunc = ast.body.find(n => n.type === 'FunctionDeclaration');
  // extract args and body
  const args = firstFunc.params.map(p => p.name);
  const body = code.substring(firstFunc.body.start + 1, firstFunc.body.end - 1);
  return { args, body };
}
