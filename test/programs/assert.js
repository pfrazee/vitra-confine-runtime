import ok, * as assert from 'assert'

function should (fn) {
  let did = false
  try {
    fn()
  } catch (err) {
    did = true
  }
  if (!did) {
    throw new Error('Should have failed assertion: '+fn.toString())
  }
}
function shouldnt (fn) {
  let did = false
  try {
    fn()
  } catch (err) {
    did = true
  }
  if (did) {
    throw new Error('Shouldnt have failed assertion: '+fn.toString())
  }
}

should(() => ok(0, '0 is falsy'))
shouldnt(() => ok(1, '1 is truthy'))
should(() => assert.equal(0, 1, '0 isnt 1'))
shouldnt(() => assert.equal(1, 1, '1 is 1'))
should(() => assert.notEqual(0, 0, '0 is 0'))
shouldnt(() => assert.notEqual(0, 1, '1 isnt 0'))
should(() => assert.deepEqual({foo: 1}, {foo: 2}, 'objects not equal'))
shouldnt(() => assert.deepEqual({foo: 1}, {foo: 1}, 'objects are equal'))
should(() => assert.notDeepEqual({foo: 1}, {foo: 1}, 'objects are equal'))
shouldnt(() => assert.notDeepEqual({foo: 1}, {foo: 2}, 'objects not equal'))
should(() => assert.fail('fail'))
shouldnt(() => assert.match('abc', /[abc]{3}/, 'matches'))
should(() => assert.match('abd', /[abc]{3}/, 'doesnt match'))
should(() => assert.doesNotMatch('abc', /[abc]{3}/, 'matches'))
shouldnt(() => assert.doesNotMatch('abd', /[abc]{3}/, 'doesnt match'))