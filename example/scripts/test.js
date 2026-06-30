
// 1. Top level crash
// console.log(doesNotExist);

// 2. module imported but client waits for an "execute" method
// export function wrongAPI() {}

// 3. execute throws an error
// export function execute() {
//   throw new Error('sync error');
// }

// 4. execute throws an error in timeout
// export function execute() {
//   setTimeout(() => {
//     throw new Error('error in timeout');
//   }, 1);
// }

// // 5. async execute throw an error
// export async function execute() {
//   await new Promise(resolve => setTimeout(resolve, 1));
//   throw new Error('async error');
// }


// 6. doesNotExists in async
export async function execute() {
  await new Promise(resolve => setTimeout(resolve, 1));
  console.log(doesNotExists);
}
