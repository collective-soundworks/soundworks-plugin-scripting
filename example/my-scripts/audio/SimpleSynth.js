import { counter } from '@ircam/sc-utils';

class SimpleSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.output = audioContext.createGain();
    this.counter = counter(1, 24);
    // this.offset = Math.floor(Math.random() * 12);
    // throw new Error('test line 9');
  }

  trigger() {
    const now = this.audioContext.currentTime;
    // const now = currentTime + Math.random() * 5 * 1e-3;
    const env = this.audioContext.createGain();
    env.connect(this.output);
    env.gain.value = 0;
    env.gain
      .setValueAtTime(0, now)
      .linearRampToValueAtTime(0.01, now + 0.01)
      .exponentialRampToValueAtTime(0.001, now + 1);

    const sine = this.audioContext.createOscillator();
    sine.type = 'square';
    sine.connect(env);
    sine.frequency.value = this.counter() * 50;
    sine.start(now);
    sine.stop(now + 1);
  }
}

export default SimpleSynth;
