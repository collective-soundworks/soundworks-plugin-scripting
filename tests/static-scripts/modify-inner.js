let inner = null;

export function modifyInner() {
  const returnValue = inner;
  inner = [];
  return returnValue;
}
