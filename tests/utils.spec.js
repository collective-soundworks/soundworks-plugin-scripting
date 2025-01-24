import { assert } from 'chai';
import { sanitizeScriptName } from '../src/utils.js';

describe('sanitizeScriptName', () => {
  it('should throw if first argument is not a s string', () => {
    assert.throws(() => sanitizeScriptName(null));
    assert.throws(() => sanitizeScriptName({}));
    assert.throws(() => sanitizeScriptName(true));
    assert.doesNotThrow(() => sanitizeScriptName('coucou'));
  });

  it('should append .js', () => {
    assert.equal(sanitizeScriptName('test'), 'test.js');
  });

  it('should normalize given path', () => {
    assert.equal(sanitizeScriptName('test///niap'), 'test/niap.js');
    assert.equal(sanitizeScriptName('test niap\\\\MyClass'), 'test niap/MyClass.js');
  });
});
