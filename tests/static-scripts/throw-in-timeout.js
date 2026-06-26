
export function throwInTimeout() {
  setTimeout(() => {
    throw new Error('throw in timeout');
  }, 1);
}
