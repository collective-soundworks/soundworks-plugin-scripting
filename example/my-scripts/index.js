import { getTime } from '@ircam/sc-utils';
import SimpleSynth from './audio/SimpleSynth.js';

let synth = null;
let unsubscribe = null;
let sendId = null;
let triggerId = null;

// throw Error('test');

export function enter(audioContext, state) {
  console.log('[from script] enter');
  synth = new SimpleSynth(audioContext);
  // throw new Error('test line 14');

  unsubscribe = state.onUpdate(updates => {
    if ('triggerInScript' in updates) {
      // throw new Error('test line 18');
      // make sure package.json export maps are resolved correctly
      console.log('getTime', getTime()); 
    }
  });

  sendId = setInterval(() => {
    state.set({ triggerFromScript: getTime() });
  }, 1000);

  // triggerId = setInterval(() => {
  //   synth.trigger();
  // }, 30);

  return synth.output;
}

export function exit() {
  console.log('[from script] exit');
  clearInterval(triggerId);
  clearInterval(sendId);
  // throw new Error('test');
  unsubscribe();
  synth.output.disconnect();
}
